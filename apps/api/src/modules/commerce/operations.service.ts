import {
  managementWhere,
  managementPage,
  managementDirection,
  type ManagementFilters,
} from './management-filters';
import { assertSchedulingAdmin } from './scheduling-authority';
import { retireReservationReminders } from './scheduled-notifications';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { CommerceService, rows } from './commerce.service';
import { CommunityService } from './community.service';
import { type ServiceInput, type ServicePolicy } from './commerce.contracts';
import { type Principal } from '../auth/auth.service';
import { AdminService } from '../admin/admin.service';
import { lockWritableAccount } from '../auth/account-lock';

@Injectable()
export class SportsOperationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
    private readonly community: CommunityService,
    private readonly admin: AdminService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async serviceAccess(
    userId: string,
    id: string,
    roles = ['owner', 'manager'],
  ) {
    const [service] = await rows<{
      id: string;
      organization_id: string;
      branch_id: string;
      kind: string;
    }>(this.db, sql`SELECT * FROM sport_services WHERE id=${id}`);
    if (!service) throw new NotFoundException();
    await this.commerce.staff(
      this.db,
      userId,
      service.organization_id,
      service.branch_id,
      roles,
    );
    return service;
  }
  async updateService(
    userId: string,
    id: string,
    revision: number,
    input: ServiceInput,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const assigned = await rows<{ coach_id: string }>(
        tx,
        sql`SELECT coach_id FROM coaching_services WHERE service_id=${id}`,
      );
      if (assigned[0] && assigned[0].coach_id !== input.coachUserId)
        throw new ConflictException('Practice.conflict');
      const [current] = await rows<{
        organization_id: string;
        branch_id: string;
        kind: string;
        revision: number;
      }>(tx, sql`SELECT * FROM sport_services WHERE id=${id} FOR UPDATE`);
      if (
        !current ||
        current.revision !== revision ||
        current.organization_id !== input.organizationId ||
        current.branch_id !== input.branchId ||
        current.kind !== input.kind
      )
        throw new ConflictException('Service changed');
      await this.commerce.staff(
        tx,
        userId,
        current.organization_id,
        current.branch_id,
      );
      for (const resource of input.resourceIds) {
        const valid = await rows(
          tx,
          sql`SELECT id FROM sport_resources WHERE id=${resource} AND organization_id=${current.organization_id} AND branch_id=${current.branch_id}`,
        );
        if (!valid.length) throw new NotFoundException();
      }
      if (input.coachUserId) {
        const coaches = await rows(
          tx,
          sql`SELECT coach_id FROM branch_coaches WHERE branch_id=${current.branch_id} AND coach_id=${input.coachUserId} AND status='active'`,
        );
        if (!coaches.length) throw new NotFoundException('Coach unavailable');
      }
      const scheduledVersions = await rows<{
        resource_ids: string[];
        coach_user_id: string | null;
      }>(
        tx,
        sql`SELECT DISTINCT v.resource_ids,v.coach_user_id FROM sport_occurrences o JOIN sport_service_versions v ON v.id=o.version_id WHERE o.service_id=${id} AND o.status='scheduled' AND o.end_at>now()`,
      );
      const sameResources = (left: string[], right: string[]) =>
        JSON.stringify([...new Set(left)].sort()) ===
        JSON.stringify([...new Set(right)].sort());
      if (
        scheduledVersions.some(
          (version) =>
            !sameResources(version.resource_ids, input.resourceIds) ||
            version.coach_user_id !== input.coachUserId,
        )
      )
        throw new ConflictException(
          'Future sessions still use the current resources or coach',
        );
      const [version] = await rows<{
        version: number;
        cover_image_id: string | null;
      }>(
        tx,
        sql`SELECT version+1 version,cover_image_id FROM sport_service_versions WHERE service_id=${id} ORDER BY version DESC LIMIT 1`,
      );
      await rows(
        tx,
        sql`INSERT INTO sport_service_versions(service_id,version,title,amount_minor,description,policy,eligibility,requirements,resource_ids,duration_days,session_count,level,coach_name,coach_user_id,visibility,approval_required,show_participants,cover_image_id) VALUES(${id},${version.version},${input.title},${input.amountMinor},${input.description},${JSON.stringify(input.policy)}::jsonb,${JSON.stringify(input.eligibility)}::jsonb,${JSON.stringify(input.requirements)}::jsonb,${`{${input.resourceIds.join(',')}}`}::uuid[],${input.durationDays},${input.sessionCount},${input.level},${input.coachName},${input.coachUserId},${input.visibility},${input.approvalRequired},${input.showParticipants},${version.cover_image_id})`,
      );
      const [service] = await rows(
        tx,
        sql`UPDATE sport_services SET revision=revision+1 WHERE id=${id} RETURNING *`,
      );
      await this.audit(
        tx,
        userId,
        current.organization_id,
        'sports.service.versioned',
        id,
        'New version',
      );
      return service;
    });
  }
  private async audit(
    tx:
      | DatabaseService['db']
      | Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0],
    actor: string,
    org: string,
    action: string,
    id: string,
    reason: string,
  ) {
    await rows(
      tx,
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${org},${action},${id},${JSON.stringify({ reason })}::jsonb)`,
    );
  }
  async occurrences(userId: string, serviceId: string) {
    await this.serviceAccess(userId, serviceId, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT * FROM sport_occurrences WHERE service_id=${serviceId} ORDER BY start_at DESC LIMIT 100`,
    );
  }
  async approve(
    userId: string,
    id: string,
    revision: number,
    approve: boolean,
    reason: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [r] = await rows<{
        order_id: string;
        occurrence_id: string;
        status: string;
        revision: number;
        user_id: string;
      }>(tx, sql`SELECT * FROM sport_reservations WHERE id=${id}`);
      if (!r) throw new NotFoundException();
      const [service] = await rows<{
        id: string;
        organization_id: string;
        branch_id: string;
      }>(
        tx,
        sql`SELECT s.* FROM sport_services s JOIN sport_occurrences o ON o.service_id=s.id WHERE o.id=${r.occurrence_id}`,
      );
      await this.commerce.serviceActor(tx, userId, service.id);
      const current = await rows(
        tx,
        sql`SELECT id FROM sport_orders WHERE id=${r.order_id} FOR UPDATE`,
      );
      if (!current.length) throw new NotFoundException();
      const [locked] = await rows<{ status: string; revision: number }>(
        tx,
        sql`SELECT status,revision FROM sport_reservations WHERE id=${id} FOR UPDATE`,
      );
      if (locked.status === 'cancelled' && !approve) return { ok: true };
      if (locked.status !== 'pending_approval' || locked.revision !== revision)
        throw new ConflictException('Reservation changed');
      if (approve) await this.commerce.approveHostedOrder(tx, r.order_id);
      else await this.commerce.cancelHostedOrder(tx, r.order_id, reason);
      await this.audit(
        tx,
        userId,
        service.organization_id,
        approve ? 'sports.reservation.approved' : 'sports.reservation.rejected',
        id,
        reason,
      );
      return { ok: true };
    });
  }
  async cancelOccurrence(
    userId: string,
    id: string,
    revision: number,
    reason: string,
    administrator?: Principal,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const [o] = await rows<{
        service_id: string;
        revision: number;
        status: string;
      }>(tx, sql`SELECT * FROM sport_occurrences WHERE id=${id} FOR UPDATE`);
      if (!o) throw new NotFoundException();
      const [service] = await rows<{
        organization_id: string;
        branch_id: string;
      }>(tx, sql`SELECT * FROM sport_services WHERE id=${o.service_id}`);
      if (administrator) await assertSchedulingAdmin(tx, administrator, userId);
      else await this.commerce.serviceActor(tx, userId, o.service_id);
      if (o.status === 'cancelled') return { ok: true };
      if (o.revision !== revision)
        throw new ConflictException('Occurrence changed');
      await rows(
        tx,
        sql`UPDATE sport_occurrences SET status='cancelled',revision=revision+1 WHERE id=${id}`,
      );
      await rows(
        tx,
        sql`UPDATE sport_occupancies SET active=false WHERE occurrence_id=${id}`,
      );
      await rows(
        tx,
        sql`UPDATE sport_coach_claims SET active=false WHERE occurrence_id=${id}`,
      );
      const orders = await rows<{ order_id: string }>(
        tx,
        sql`SELECT DISTINCT order_id FROM sport_reservations WHERE occurrence_id=${id} AND status IN ('held','confirmed','pending_approval') ORDER BY order_id`,
      );
      for (const order of orders)
        await this.commerce.cancelHostedOrder(tx, order.order_id, reason);
      await this.audit(
        tx,
        userId,
        service.organization_id,
        'sports.occurrence.cancelled',
        id,
        reason,
      );
      return { ok: true };
    });
  }
  async documents(userId: string) {
    return rows(
      this.db,
      sql`SELECT id,name,service_id,status,expires_at,reason FROM sport_documents WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 100`,
    );
  }
  async documentQueue(userId: string, serviceId: string) {
    await this.serviceAccess(userId, serviceId, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT d.id,d.name,d.status,d.revision,d.expires_at,d.reviewed_at,u.display_name FROM sport_documents d JOIN users u ON u.id=d.user_id WHERE d.service_id=${serviceId} ORDER BY d.created_at LIMIT 100`,
    );
  }
  async reviewDocument(
    userId: string,
    id: string,
    revision: number,
    approve: boolean,
    reason: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [document] = await rows<{
        organization_id: string;
        branch_id: string;
        revision: number;
        status: string;
        expires_at: Date | null;
      }>(
        tx,
        sql`SELECT d.*,s.organization_id,s.branch_id FROM sport_documents d JOIN sport_services s ON s.id=d.service_id WHERE d.id=${id} FOR UPDATE OF d`,
      );
      if (!document) throw new NotFoundException();
      await this.commerce.staff(
        tx,
        userId,
        document.organization_id,
        document.branch_id,
      );
      if (document.revision !== revision || document.status !== 'pending')
        throw new ConflictException('Document changed');
      if (approve && document.expires_at && document.expires_at <= new Date())
        throw new ConflictException('Document expired');
      await rows(
        tx,
        sql`UPDATE sport_documents SET status=${approve ? 'approved' : 'rejected'},reviewed_by=${userId},reviewed_at=now(),reason=${reason},revision=revision+1 WHERE id=${id}`,
      );
      await this.audit(
        tx,
        userId,
        document.organization_id,
        'sports.document.reviewed',
        id,
        reason,
      );
      return { ok: true };
    });
  }
  async members(
    userId: string,
    org: string,
    branch: string,
    filters?: ManagementFilters,
  ) {
    await this.commerce.staff(this.db, userId, org, branch, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT m.id,m.user_id,m.status,m.granted,m.consumed,m.ends_at,u.display_name,u.phone,v.title FROM sport_memberships m JOIN users u ON u.id=m.user_id JOIN sport_service_versions v ON v.id=m.version_id WHERE m.organization_id=${org} AND m.branch_id=${branch} AND ${managementWhere(filters, sql`m.created_at`, sql`m.status`, [sql`u.display_name`, sql`u.phone`, sql`v.title`])} ORDER BY m.created_at ${managementDirection(filters)},m.id ${managementPage(filters)}`,
    );
  }
  async orders(
    userId: string,
    org: string,
    branch: string,
    filters?: ManagementFilters,
  ) {
    await this.commerce.staff(this.db, userId, org, branch, [
      'owner',
      'manager',
      'accountant',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT id,user_id,status,amount_minor::text,refunded_minor::text,created_at,snapshot FROM sport_orders WHERE organization_id=${org} AND snapshot->>'branchId'=${branch} AND ${managementWhere(filters, sql`created_at`, sql`status`, [sql`id::text`, sql`snapshot->>'title'`])} ORDER BY created_at ${managementDirection(filters)},id ${managementPage(filters)}`,
    );
  }
  async cash(userId: string, orderId: string, reason: string) {
    return this.commerce.captureCash(userId, orderId, reason);
  }
  async manualAttendance(
    userId: string,
    id: string,
    present: boolean,
    reason: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [r] = await rows<{
        occurrence_id: string;
        membership_id: string | null;
        consumed: boolean;
        status: string;
        revision: number;
      }>(tx, sql`SELECT * FROM sport_reservations WHERE id=${id} FOR UPDATE`);
      if (!r) throw new NotFoundException();
      const [service] = await rows<{
        id: string;
        organization_id: string;
        branch_id: string;
      }>(
        tx,
        sql`SELECT s.* FROM sport_services s JOIN sport_occurrences o ON o.service_id=s.id WHERE o.id=${r.occurrence_id}`,
      );
      await this.commerce.serviceActor(tx, userId, service.id, [
        'owner',
        'manager',
        'receptionist',
      ]);
      if (!['confirmed', 'completed', 'no_show'].includes(r.status))
        throw new ConflictException('Reservation unavailable');
      const [v] = await rows<{ policy: ServicePolicy }>(
        tx,
        sql`SELECT ord.snapshot->'policy' policy FROM sport_orders ord JOIN sport_reservations r ON r.order_id=ord.id WHERE r.id=${id}`,
      );
      const [order] = await rows<{ status: string }>(
        tx,
        sql`SELECT ord.status FROM sport_orders ord JOIN sport_reservations r ON r.order_id=ord.id WHERE r.id=${id}`,
      );
      if (order.status !== 'paid')
        throw new ConflictException(
          'Pay outstanding balance before attendance',
        );
      if (r.status === (present ? 'completed' : 'no_show')) return { ok: true };
      const consume = present || v.policy.noShowConsumesSession;
      if (r.membership_id && consume && !r.consumed) {
        await rows(
          tx,
          sql`UPDATE sport_memberships SET consumed=consumed+1,revision=revision+1 WHERE id=${r.membership_id}`,
        );
        await rows(
          tx,
          sql`UPDATE sport_reservations SET consumed=true WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key,actor_id) VALUES(${r.membership_id},${id},'consume',1,${`attendance:${id}:${r.revision}`},${userId}) ON CONFLICT DO NOTHING`,
        );
      }
      if (r.membership_id && !consume && r.consumed) {
        await rows(
          tx,
          sql`UPDATE sport_memberships SET consumed=consumed-1,revision=revision+1 WHERE id=${r.membership_id} AND consumed>0`,
        );
        await rows(
          tx,
          sql`UPDATE sport_reservations SET consumed=false WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key,actor_id) VALUES(${r.membership_id},${id},'restore',1,${`attendance:${id}:${r.revision}`},${userId}) ON CONFLICT DO NOTHING`,
        );
      }
      await rows(
        tx,
        sql`INSERT INTO sport_attendance(reservation_id,actor_id,status,reason) VALUES(${id},${userId},${present ? 'present' : 'absent'},${reason}) ON CONFLICT(reservation_id) DO UPDATE SET status=EXCLUDED.status,reason=EXCLUDED.reason,actor_id=EXCLUDED.actor_id,revision=sport_attendance.revision+1`,
      );
      await rows(
        tx,
        sql`UPDATE sport_reservations SET status=${present ? 'completed' : 'no_show'},revision=revision+1 WHERE id=${id}`,
      );
      await retireReservationReminders(tx, id);
      await this.audit(
        tx,
        userId,
        service.organization_id,
        'sports.attendance.recorded',
        id,
        reason,
      );
      return { ok: true };
    });
  }
  async adminSchedule(principal: Principal, filters?: ManagementFilters) {
    await this.admin.requireAdmin(principal);
    return rows(
      this.db,
      sql`SELECT s.id,s.title,s.organization_id,s.branch_id,s.revision,s.kind,s.status,b.name branch_name,g.name organization_name FROM sport_services s JOIN branches b ON b.id=s.branch_id JOIN organizations g ON g.id=s.organization_id WHERE s.kind<>'membership' AND ${managementWhere(filters, sql`s.created_at`, sql`s.status`, [sql`s.title`, sql`b.name`, sql`g.name`], sql`s.kind`)} ORDER BY s.created_at ${managementDirection(filters)},s.id ${managementPage(filters)}`,
    );
  }
  async adminOccurrences(principal: Principal, serviceId: string) {
    await this.admin.requireAdmin(principal);
    return rows(
      this.db,
      sql`SELECT o.*,(SELECT count(*)::int FROM sport_reservations r WHERE r.occurrence_id=o.id AND (r.status IN ('confirmed','pending_approval') OR r.status='held' AND r.expires_at>now())) reserved FROM sport_occurrences o WHERE o.service_id=${serviceId} ORDER BY start_at DESC,o.id LIMIT 100`,
    );
  }
  async adminOverview(principal: Principal, filters?: ManagementFilters) {
    await this.admin.requireAdmin(principal);
    const [orders, payments, refunds, jobs, tickets, reports] =
      await Promise.all([
        rows(
          this.db,
          sql`SELECT id,status,amount_minor::text,created_at FROM sport_orders WHERE status='review' AND ${managementWhere(filters, sql`created_at`, sql`status`, [sql`id::text`, sql`snapshot->>'title'`])} ORDER BY created_at ${managementDirection(filters)},id ${managementPage(filters)}`,
        ),
        rows(
          this.db,
          sql`SELECT id,order_id,provider,state,amount_minor::text FROM sport_payments WHERE state='unknown' AND ${managementWhere(filters, sql`created_at`, sql`state`, [sql`order_id::text`, sql`reference`])} ORDER BY created_at ${managementDirection(filters)},id ${managementPage(filters)}`,
        ),
        rows(
          this.db,
          sql`SELECT id,order_id,state,amount_minor::text,reason FROM sport_refunds WHERE state NOT IN ('succeeded','failed') AND ${managementWhere(filters, sql`created_at`, sql`state`, [sql`order_id::text`, sql`reason`])} ORDER BY created_at ${managementDirection(filters)},id ${managementPage(filters)}`,
        ),
        rows(
          this.db,
          sql`SELECT id,kind,aggregate_id,attempts,last_error,due_at FROM sport_outbox WHERE processed_at IS NULL AND ${managementWhere(filters, sql`due_at`, sql`kind`, [sql`kind`, sql`aggregate_id::text`])} ORDER BY due_at ${managementDirection(filters)},id ${managementPage(filters)}`,
        ),
        rows(
          this.db,
          sql`SELECT id,title,status,created_at FROM sport_tickets WHERE status<>'resolved' AND ${managementWhere(filters, sql`created_at`, sql`status`, [sql`title`, sql`id::text`])} ORDER BY created_at ${managementDirection(filters)},id ${managementPage(filters)}`,
        ),
        rows(
          this.db,
          sql`SELECT r.id,r.message_id,r.reason,r.status,r.revision,left(m.body,500) body,m.sender_id,m.conversation_id FROM sport_message_reports r JOIN sport_messages m ON m.id=r.message_id WHERE r.status='open' AND ${managementWhere(filters, sql`r.created_at`, sql`r.status`, [sql`r.reason`, sql`r.id::text`])} ORDER BY r.created_at ${managementDirection(filters)},r.id ${managementPage(filters)}`,
        ),
      ]);
    return { orders, payments, refunds, jobs, tickets, reports };
  }
  async decideMessageReport(
    principal: Principal,
    id: string,
    revision: number,
    remove: boolean,
    reason: string,
  ) {
    await this.admin.requireAdmin(principal);
    return this.db.transaction(async (tx) => {
      const [report] = await rows<{
        message_id: string;
        status: string;
        revision: number;
        organization_id: string;
      }>(
        tx,
        sql`SELECT r.*,s.organization_id FROM sport_message_reports r JOIN sport_messages m ON m.id=r.message_id JOIN sport_conversations c ON c.id=m.conversation_id JOIN sport_occurrences o ON o.id=c.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE r.id=${id} FOR UPDATE OF r`,
      );
      if (!report) throw new NotFoundException();
      if (report.status !== 'open' || report.revision !== revision)
        throw new ConflictException('Report changed');
      if (remove)
        await rows(
          tx,
          sql`UPDATE sport_messages SET deleted_at=coalesce(deleted_at,now()) WHERE id=${report.message_id}`,
        );
      await rows(
        tx,
        sql`UPDATE sport_message_reports SET status=${remove ? 'removed' : 'dismissed'},reviewed_by=${principal.user.id},reviewed_at=now(),decision_reason=${reason},revision=revision+1 WHERE ${remove ? sql`message_id=${report.message_id}` : sql`id=${id}`} AND status='open'`,
      );
      await this.audit(
        tx,
        principal.user.id,
        report.organization_id,
        remove ? 'sports.message.removed' : 'sports.message.report.dismissed',
        report.message_id,
        reason,
      );
      return { ok: true };
    });
  }
  async adminReply(
    principal: Principal,
    id: string,
    body: string,
    resolve: boolean,
  ) {
    await this.admin.requireAdmin(principal);
    return this.db.transaction(async (tx) => {
      const [ticket] = await rows(
        tx,
        sql`SELECT * FROM sport_tickets WHERE id=${id} FOR UPDATE`,
      );
      if (!ticket) throw new NotFoundException();
      await rows(
        tx,
        sql`INSERT INTO sport_ticket_messages(ticket_id,sender_id,body) VALUES(${id},${principal.user.id},${body})`,
      );
      await rows(
        tx,
        sql`UPDATE sport_tickets SET status=${resolve ? 'resolved' : 'assigned'},assigned_to=${principal.user.id} WHERE id=${id}`,
      );
      return { ok: true };
    });
  }
  async retryJob(principal: Principal, id: string) {
    await this.admin.requireAdmin(principal);
    await rows(
      this.db,
      sql`UPDATE sport_outbox SET attempts=0,due_at=now(),lease_until=null WHERE id=${id} AND processed_at IS NULL`,
    );
    return { ok: true };
  }
  async reconcile(principal: Principal, orderId: string) {
    await this.admin.requireAdmin(principal);
    const [order] = await rows<{ user_id: string }>(
      this.db,
      sql`SELECT user_id FROM sport_orders WHERE id=${orderId}`,
    );
    if (!order) throw new NotFoundException();
    return this.commerce.verifyPayment(order.user_id, orderId, true);
  }
  async adminTicket(principal: Principal, id: string) {
    await this.admin.requireAdmin(principal);
    const [ticket] = await rows<{ user_id: string }>(
      this.db,
      sql`SELECT * FROM sport_tickets WHERE id=${id}`,
    );
    if (!ticket) throw new NotFoundException();
    return this.community.ticket(ticket.user_id, id);
  }
  async previewImport(userId: string, serviceId: string, csv: string) {
    const service = await this.serviceAccess(userId, serviceId, [
      'owner',
      'manager',
      'receptionist',
    ]);
    if (service.kind !== 'membership')
      throw new ConflictException('Choose a membership service');
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length > 501)
      throw new ConflictException('Import limit is 500 rows');
    const result = lines.slice(1).map((line, index) => {
      const [phone, name, remaining, expiresAt] = line
        .split(',')
        .map((v) => v.trim());
      const errors: string[] = [];
      if (!/^\+989\d{9}$/.test(phone)) errors.push('Invalid phone');
      if (!name || name.length > 120) errors.push('Invalid name');
      if (
        !/^\d+$/.test(remaining) ||
        Number(remaining) < 1 ||
        Number(remaining) > 10000
      )
        errors.push('Invalid remaining sessions');
      if (
        !expiresAt ||
        !Number.isFinite(Date.parse(expiresAt)) ||
        Date.parse(expiresAt) <= Date.now()
      )
        errors.push('Invalid expiry');
      return {
        line: index + 2,
        phone,
        name,
        remaining: Number(remaining),
        expiresAt,
        errors,
      };
    });
    const seen = new Set<string>();
    for (const row of result) {
      if (seen.has(row.phone)) row.errors.push('Duplicate phone');
      seen.add(row.phone);
    }
    return result;
  }
  async importMembers(
    userId: string,
    serviceId: string,
    csv: string,
    key: string,
  ) {
    const preview = await this.previewImport(userId, serviceId, csv);
    if (preview.some((r) => r.errors.length))
      throw new ConflictException('Correct import errors first');
    const service = await this.serviceAccess(userId, serviceId, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      await this.commerce.staff(
        tx,
        userId,
        service.organization_id,
        service.branch_id,
        ['owner', 'manager', 'receptionist'],
      );
      const existing = await rows(
        tx,
        sql`SELECT id FROM audit_events WHERE actor_id=${userId} AND action='sports.members.imported' AND details->>'key'=${key}`,
      );
      if (existing.length) return { imported: 0, replayed: true };
      const [version] = await rows<{ id: string }>(
        tx,
        sql`SELECT id FROM sport_service_versions WHERE service_id=${serviceId} ORDER BY version DESC LIMIT 1`,
      );
      for (const row of preview) {
        const [user] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO users(phone,display_name) VALUES(${row.phone},${row.name}) ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id`,
        );
        const duplicates = await rows(
          tx,
          sql`SELECT id FROM sport_memberships WHERE user_id=${user.id} AND service_id=${serviceId} AND status='active'`,
        );
        if (duplicates.length)
          throw new ConflictException(
            'Member already has an active imported plan',
          );
        const [membership] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO sport_memberships(user_id,service_id,version_id,organization_id,branch_id,status,granted,ends_at) VALUES(${user.id},${serviceId},${version.id},${service.organization_id},${service.branch_id},'active',${row.remaining},${row.expiresAt}) RETURNING id`,
        );
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,kind,quantity,source_key,actor_id) VALUES(${membership.id},'grant',${row.remaining},${`import:${key}:${row.line}`},${userId})`,
        );
      }
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${userId},${service.organization_id},'sports.members.imported',${serviceId},${JSON.stringify({ key, count: String(preview.length) })}::jsonb)`,
      );
      return { imported: preview.length, replayed: false };
    });
  }
}
