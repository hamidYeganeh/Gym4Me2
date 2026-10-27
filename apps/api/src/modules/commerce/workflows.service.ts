import { assertResourcesAvailable } from './resource-capacity';
import { createBasicSubscription } from '../advanced-business/ph5.access';
import { scheduleReservationReminders } from './scheduled-notifications';
import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import type { Tx } from '../clubs/club.repository';
import { lockWritableAccount } from '../auth/account-lock';
import { serviceSchema } from './commerce.contracts';
import { CommerceService, rows } from './commerce.service';
import { SportsOperationsService } from './operations.service';
import { deliverSportsNotification } from './notification-delivery';
import { approvedCoach } from '../coaching/practice.service';
import * as c from './workflows.contracts';

// Full single-transaction bank reversals use the provider. Offline receipts and
// bank partial/split collections require a recorded, reviewed repayment.
function manualRefundSource(orderId: SQL, amount: SQL) {
  return sql`EXISTS(SELECT 1 FROM sport_payments p WHERE p.order_id=${orderId} AND p.state='verified' AND (
    p.provider IN ('cash','pos','bank_transfer') OR (p.provider='saman_sandbox' AND (
      p.amount_minor<>${amount} OR (SELECT count(*) FROM sport_payments all_p WHERE all_p.order_id=${orderId} AND all_p.state='verified')<>1
    ))
  ))`;
}

@Injectable()
export class SportsWorkflowsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
    private readonly operations: SportsOperationsService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async command<T>(
    actor: string,
    key: string,
    input: unknown,
    authorize: (tx: Tx) => Promise<unknown>,
    work: (tx: Tx) => Promise<T>,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, actor);
      await authorize(tx);
      const digest = createHash('sha256')
          .update(JSON.stringify(input))
          .digest('hex'),
        command = `workflow:${key}`;
      const [old] = await rows<{ request_hash: string; result: T }>(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${actor} AND command_key=${command}`,
      );
      if (old) {
        if (old.request_hash !== digest)
          throw new ConflictException('Workflow.keyReused');
        return old.result;
      }
      const result = await work(tx);
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${actor},${command},${digest},${JSON.stringify(result)}::jsonb)`,
      );
      return result;
    });
  }
  async sports() {
    return rows(
      this.db,
      sql`SELECT sp.id,sp.name,sp.slug,coalesce((SELECT jsonb_agg(DISTINCT s.kind) FROM sport_services s JOIN sport_service_versions v ON v.id=s.published_version_id WHERE v.sport_id=sp.id AND s.status='published'),'[]'::jsonb) formats FROM sports sp WHERE sp.is_active ORDER BY sp.name`,
    );
  }
  async createCoachProgram(
    actor: string,
    input: z.infer<typeof c.coachProgramSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['coach-program', input],
      (tx) => approvedCoach(tx, actor),
      async (tx) => {
        let [shop] = await rows<{ organization_id: string; branch_id: string }>(
          tx,
          sql`SELECT * FROM coach_program_shops WHERE coach_id=${actor}`,
        );
        const [user] = await rows<{ display_name: string | null }>(
          tx,
          sql`SELECT display_name FROM users WHERE id=${actor}`,
        );
        if (!shop) {
          const [org] = await rows<{ id: string }>(
            tx,
            sql`INSERT INTO organizations(name,slug,status) VALUES(${user.display_name ?? 'Coach'},${`coach-${actor}`},'approved') RETURNING id`,
          );
          await createBasicSubscription(tx, org.id);
          const [branch] = await rows<{ id: string }>(
            tx,
            sql`INSERT INTO branches(organization_id,name,slug) VALUES(${org.id},${user.display_name ?? 'Coach'},'online') RETURNING id`,
          );
          await rows(
            tx,
            sql`INSERT INTO organization_members(organization_id,user_id,role,all_branches) VALUES(${org.id},${actor},'owner',true)`,
          );
          // The online shop stays out of the physical-club directory. Only approved coach programs are public.
          await rows(
            tx,
            sql`INSERT INTO clubs(id,owner_id,publication_status) VALUES(${org.id},${actor},'draft')`,
          );
          await rows(
            tx,
            sql`INSERT INTO branch_profiles(club_id,branch_id) VALUES(${org.id},${branch.id})`,
          );
          await rows(
            tx,
            sql`INSERT INTO branch_coaches(branch_id,coach_id,status) VALUES(${branch.id},${actor},'active')`,
          );
          await rows(
            tx,
            sql`INSERT INTO coach_program_shops(coach_id,organization_id,branch_id) VALUES(${actor},${org.id},${branch.id})`,
          );
          shop = { organization_id: org.id, branch_id: branch.id };
        }
        const service = await this.commerce.createService(
          actor,
          serviceSchema.parse({
            organizationId: shop.organization_id,
            branchId: shop.branch_id,
            title: input.title,
            kind: 'program',
            sportId: input.sportId,
            coachUserId: actor,
            coachName: user.display_name ?? '',
            amountMinor: input.amountMinor,
            offering: {
              entryAllowed: false,
              deliveryDays: input.deliveryDays,
              supportDays: input.supportDays,
              maxRevisions: input.maxRevisions,
              responseHours: input.responseHours,
            },
            policy: {
              cancellationHours: 0,
              lateRefundBasisPoints: 0,
              noShowConsumesSession: false,
              consumeOn: 'attendance',
              freezeDays: 0,
              depositBasisPoints: 0,
              guestAllowance: 0,
              transferable: false,
              terms: input.terms,
            },
          }),
          tx,
        );
        await rows(
          tx,
          sql`INSERT INTO coaching_services(service_id,coach_id,mode,entry_amount_minor) VALUES(${service.id},${actor},'online',0)`,
        );
        await this.commerce.publish(actor, service.id, 1, tx);
        return { id: service.id };
      },
    );
  }
  async receptionSale(
    actor: string,
    input: z.infer<typeof c.receptionSaleSchema>,
  ) {
    return this.command(
      actor,
      input.purchase.idempotencyKey,
      ['sale', input],
      async (tx) => {
        const service = await this.commerce.service(
          tx,
          input.purchase.serviceId,
          true,
        );
        await this.commerce.staff(
          tx,
          actor,
          service.organization_id,
          service.branch_id,
          ['owner', 'manager', 'receptionist'],
        );
      },
      async (tx) => {
        const [customer] = await rows<{
          id: string;
          status: string;
          deleted_at: Date | null;
          deletion_pending: boolean;
        }>(
          tx,
          sql`INSERT INTO users(phone,display_name) VALUES(${input.customer.phone},${input.customer.name}) ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id,status,deleted_at,deletion_pending`,
        );
        if (
          customer.status !== 'active' ||
          customer.deleted_at ||
          customer.deletion_pending
        )
          throw new ConflictException('Workflow.customerUnavailable');
        const order = await this.commerce.checkout(
          customer.id,
          { ...input.purchase, quoteId: undefined },
          'reception',
          false,
          tx,
        );
        if (
          order.snapshot.kind === 'membership' ||
          order.snapshot.kind === 'program'
        )
          await rows(
            tx,
            sql`UPDATE sport_orders SET expires_at=now()+interval '30 days' WHERE id=${order.id}`,
          );
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${order.organization_id},'sports.reception.sale',${order.id},${JSON.stringify({ customerId: customer.id })}::jsonb)`,
        );
        return { id: order.id, userId: customer.id };
      },
    );
  }
  async customers(
    actor: string,
    scope: z.infer<typeof c.scopeSchema>,
    search: string,
  ) {
    await this.commerce.staff(
      this.db,
      actor,
      scope.organizationId,
      scope.branchId,
      ['owner', 'manager', 'receptionist'],
    );
    if (search.trim().length < 3) return [];
    return rows(
      this.db,
      sql`SELECT DISTINCT u.id,u.display_name,u.phone,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'serviceId',m.service_id,'dependentId',m.dependent_id,'dependentName',(SELECT name FROM sport_dependents WHERE id=m.dependent_id),'title',v.title,'status',m.status,'startsAt',m.starts_at,'endsAt',m.ends_at,'remaining',m.granted-m.consumed,'entryAllowed',coalesce(m.entry_allowed_override,(v.offering->>'entryAllowed')::boolean))) FROM sport_memberships m JOIN sport_service_versions v ON v.id=m.version_id WHERE m.user_id=u.id AND m.organization_id=${scope.organizationId} AND m.branch_id=${scope.branchId}),'[]'::jsonb) memberships
      FROM users u WHERE u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending AND (u.phone LIKE ${`%${search}%`} OR u.display_name ILIKE ${`%${search}%`}) AND (EXISTS(SELECT 1 FROM sport_memberships m WHERE m.user_id=u.id AND m.organization_id=${scope.organizationId} AND m.branch_id=${scope.branchId}) OR EXISTS(SELECT 1 FROM sport_orders o WHERE o.user_id=u.id AND o.organization_id=${scope.organizationId} AND o.snapshot->>'branchId'=${scope.branchId})) ORDER BY u.display_name LIMIT 30`,
    );
  }
  async entry(actor: string, input: z.infer<typeof c.manualEntrySchema>) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['entry', input],
      (tx) =>
        this.commerce.staff(tx, actor, input.organizationId, input.branchId, [
          'owner',
          'manager',
          'receptionist',
        ]),
      (tx) => this.commerce.admit(tx, actor, input),
    );
  }
  async submitReceipt(
    actor: string,
    input: z.infer<typeof c.receiptSchema>,
    business: boolean,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['receipt', input],
      async (tx) => {
        const [o] = await rows<{
          organization_id: string;
          user_id: string;
          snapshot: { branchId: string };
        }>(tx, sql`SELECT * FROM sport_orders WHERE id=${input.orderId}`);
        if (!o) throw new NotFoundException();
        if (business)
          await this.commerce.staff(
            tx,
            actor,
            o.organization_id,
            o.snapshot.branchId,
            ['owner', 'manager', 'accountant', 'receptionist'],
          );
        else if (o.user_id !== actor || input.method !== 'bank_transfer')
          throw new ForbiddenException();
      },
      async (tx) => {
        const [o] = await rows<{
          amount_minor: string;
          expires_at: Date;
          status: string;
          snapshot: { kind: string; groupId?: string };
        }>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${input.orderId} FOR UPDATE`,
        );
        if (
          !['awaiting_payment', 'partially_paid'].includes(o.status) ||
          (o.status === 'awaiting_payment' && o.expires_at <= new Date()) ||
          o.snapshot.groupId
        )
          throw new ConflictException('Workflow.orderUnavailable');
        const [p] = await rows<{ paid: string; pending: string }>(
          tx,
          sql`SELECT coalesce(sum(amount_minor) FILTER(WHERE status='pending'),0)::text pending,(SELECT coalesce(sum(amount_minor),0)::text FROM sport_payments WHERE order_id=${input.orderId} AND state='verified') paid FROM sport_manual_receipts WHERE order_id=${input.orderId}`,
        );
        if (
          BigInt(input.amountMinor) + BigInt(p.paid) + BigInt(p.pending) >
          BigInt(o.amount_minor)
        )
          throw new ConflictException('Workflow.overpayment');
        const [receipt] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO sport_manual_receipts(order_id,method,amount_minor,reference,submitted_by,reason,idempotency_key) VALUES(${input.orderId},${input.method},${input.amountMinor},${input.reference},${actor},${input.reason},${input.idempotencyKey}) RETURNING id`,
        );
        return receipt;
      },
    );
  }
  async receipts(actor: string, scope: z.infer<typeof c.scopeSchema>) {
    await this.commerce.staff(
      this.db,
      actor,
      scope.organizationId,
      scope.branchId,
      ['owner', 'manager', 'accountant', 'receptionist'],
    );
    return rows(
      this.db,
      sql`SELECT r.*,r.amount_minor::text,u.display_name,o.snapshot->>'title' title FROM sport_manual_receipts r JOIN sport_orders o ON o.id=r.order_id JOIN users u ON u.id=o.user_id WHERE o.organization_id=${scope.organizationId} AND o.snapshot->>'branchId'=${scope.branchId} ORDER BY r.created_at DESC LIMIT 100`,
    );
  }
  async decideReceipt(
    actor: string,
    id: string,
    input: z.infer<typeof c.receiptDecisionSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['receipt-decision', id, input],
      async (tx) => {
        const [o] = await rows<{
          organization_id: string;
          snapshot: { branchId: string };
          method: string;
        }>(
          tx,
          sql`SELECT o.organization_id,o.snapshot,r.method FROM sport_orders o JOIN sport_manual_receipts r ON r.order_id=o.id WHERE r.id=${id}`,
        );
        if (!o) throw new NotFoundException();
        await this.commerce.staff(
          tx,
          actor,
          o.organization_id,
          o.snapshot.branchId,
          o.method === 'bank_transfer'
            ? ['owner', 'manager', 'accountant']
            : ['owner', 'manager', 'accountant', 'receptionist'],
        );
      },
      async (tx) => {
        const [initial] = await rows<{ order_id: string }>(
          tx,
          sql`SELECT order_id FROM sport_manual_receipts WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`SELECT o.id FROM sport_occurrences o WHERE o.id IN (SELECT occurrence_id FROM sport_reservations WHERE order_id=${initial.order_id}) ORDER BY o.id FOR UPDATE`,
        );
        const [order] = await rows<Parameters<CommerceService['fulfil']>[1]>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${initial.order_id} FOR UPDATE`,
        );
        const [r] = await rows<{
          status: string;
          revision: number;
          amount_minor: string;
          method: string;
        }>(
          tx,
          sql`SELECT * FROM sport_manual_receipts WHERE id=${id} FOR UPDATE`,
        );
        if (r.status !== 'pending' || r.revision !== input.revision)
          throw new ConflictException('Workflow.receiptChanged');
        if (input.approved) {
          if (
            !['awaiting_payment', 'partially_paid'].includes(order.status) ||
            (order.status === 'awaiting_payment' &&
              order.expires_at <= new Date())
          )
            throw new ConflictException('Workflow.orderUnavailable');
          const unresolved = await rows(
            tx,
            sql`SELECT id FROM sport_payments WHERE order_id=${order.id} AND state IN ('pending','unknown')`,
          );
          if (unresolved.length)
            throw new ConflictException('Workflow.reconcileFirst');
          const [p] = await rows<{ paid: string }>(
            tx,
            sql`SELECT coalesce(sum(amount_minor),0)::text paid FROM sport_payments WHERE order_id=${order.id} AND state='verified'`,
          );
          if (
            BigInt(p.paid) + BigInt(r.amount_minor) >
            BigInt(order.amount_minor)
          )
            throw new ConflictException('Workflow.overpayment');
          const invalid = await rows(
            tx,
            sql`SELECT r.id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE r.order_id=${order.id} AND (r.status NOT IN ('held','confirmed','pending_approval') OR o.status<>'scheduled' OR o.start_at<=now())`,
          );
          if (invalid.length)
            throw new ConflictException('Workflow.orderUnavailable');
          if (
            order.snapshot.offering?.confirmation === 'before_payment' &&
            !(order as unknown as { coordination_approved: boolean })
              .coordination_approved
          )
            throw new ConflictException('Workflow.confirmFirst');
          const [payment] = await rows<{ id: string }>(
            tx,
            sql`INSERT INTO sport_payments(order_id,provider,reference,amount_minor,scenario,state,actor_id,verified_at) VALUES(${order.id},${r.method},${`manual:${id}`},${r.amount_minor},'success','verified',${actor},now()) RETURNING id`,
          );
          await this.commerce.journal(
            tx,
            order,
            `payment:${payment.id}`,
            r.amount_minor,
            r.method,
            'service-liability',
          );
          await this.commerce.fulfil(tx, order);
        }
        await rows(
          tx,
          sql`UPDATE sport_manual_receipts SET status=${input.approved ? 'approved' : 'rejected'},reviewed_by=${actor},reason=${input.reason},revision=revision+1 WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${order.organization_id},'sports.receipt.reviewed',${id},${JSON.stringify(input)}::jsonb)`,
        );
        return { ok: true };
      },
    );
  }
  async roster(actor: string, occurrenceId: string) {
    const [o] = await rows<{ service_id: string }>(
      this.db,
      sql`SELECT service_id FROM sport_occurrences WHERE id=${occurrenceId}`,
    );
    if (!o) throw new NotFoundException();
    await this.commerce.serviceActor(this.db, actor, o.service_id, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT r.id,r.revision,r.status,r.checked_in_at,r.quantity,coalesce((SELECT name FROM sport_dependents WHERE id=r.dependent_id),u.display_name) display_name,a.status attendance,o.status payment_status,m.granted-m.consumed remaining,r.membership_id,m.granted,m.consumed,
        (SELECT count(*)::int FROM sport_reservations held WHERE held.membership_id=m.id AND NOT held.consumed AND (held.status IN ('pending_approval','confirmed') OR (held.status='held' AND held.expires_at>now()))) AS held
      FROM sport_reservations r JOIN users u ON u.id=r.user_id JOIN sport_orders o ON o.id=r.order_id LEFT JOIN sport_attendance a ON a.reservation_id=r.id LEFT JOIN sport_memberships m ON m.id=r.membership_id WHERE r.occurrence_id=${occurrenceId} AND r.status IN ('confirmed','completed','no_show','pending_approval') ORDER BY u.display_name,r.id`,
    );
  }
  async rollcall(
    actor: string,
    id: string,
    input: z.infer<typeof c.rollcallSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['rollcall', id, input],
      async (tx) => {
        const [o] = await rows<{ service_id: string }>(
          tx,
          sql`SELECT service_id FROM sport_occurrences WHERE id=${id}`,
        );
        if (!o) throw new NotFoundException();
        return this.commerce.serviceActor(tx, actor, o.service_id, [
          'owner',
          'manager',
          'receptionist',
        ]);
      },
      async (tx) => {
        for (const change of [...input.changes].sort((a, b) =>
          a.reservationId.localeCompare(b.reservationId),
        )) {
          const [r] = await rows<{ revision: number }>(
            tx,
            sql`SELECT revision FROM sport_reservations WHERE id=${change.reservationId} AND occurrence_id=${id} FOR UPDATE`,
          );
          if (!r || r.revision !== change.revision)
            throw new ConflictException('Workflow.rosterChanged');
          await this.operations.recordAttendance(
            tx,
            actor,
            change.reservationId,
            change.present,
            input.reason,
          );
        }
        return { ok: true, count: input.changes.length };
      },
    );
  }
  async programs(actor: string, coach = false) {
    if (coach) await approvedCoach(this.db, actor);
    return rows(
      this.db,
      sql`SELECT p.*,u.display_name,(SELECT count(*)::int FROM sport_program_events e WHERE e.request_id=p.id AND e.kind='revision_requested') revision_count,(SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'reason',e.reason,'createdAt',e.created_at) ORDER BY e.sequence),'[]'::jsonb) FROM sport_program_events e WHERE e.request_id=p.id) events,(CASE WHEN p.status IN ('queued','preparing','revision_requested') THEN coalesce(p.revision_due_at,CASE WHEN p.assignment_id IS NULL THEN p.due_at END)<now() ELSE false END) overdue,o.snapshot->>'title' title,o.snapshot->'offering' offering,coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'title',t.title)) FROM training_assignments a JOIN training_versions v ON v.id=a.version_id JOIN training_plans t ON t.id=v.plan_id WHERE a.relationship_id=p.relationship_id AND t.owner_id=p.coach_id),'[]'::jsonb) assignments FROM sport_program_requests p JOIN users u ON u.id=CASE WHEN ${coach} THEN p.athlete_id ELSE p.coach_id END JOIN sport_orders o ON o.id=p.order_id WHERE ${coach ? sql`p.coach_id=${actor}` : sql`p.athlete_id=${actor}`} ORDER BY p.created_at DESC LIMIT 100`,
    );
  }
  private async programAccess(
    tx: Tx,
    actor: string,
    id: string,
    coach: boolean,
  ) {
    const [p] = await rows<{ id: string }>(
      tx,
      sql`SELECT p.id FROM sport_program_requests p JOIN sport_orders o ON o.id=p.order_id WHERE p.id=${id} AND ${coach ? sql`p.coach_id=${actor}` : sql`p.athlete_id=${actor}`} AND o.status IN ('paid','partially_refunded') AND p.status<>'cancelled'`,
    );
    if (!p) throw new NotFoundException();
    if (coach) await approvedCoach(tx, actor);
  }
  async intake(
    actor: string,
    id: string,
    input: z.infer<typeof c.programIntakeSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['intake', id, input],
      (tx) => this.programAccess(tx, actor, id, false),
      async (tx) => {
        const [p] = await rows(
          tx,
          sql`UPDATE sport_program_requests SET intake=${JSON.stringify({ goals: input.goals, experience: input.experience, limitations: input.limitations, location: input.location })}::jsonb,status='queued',revision=revision+1,updated_at=now(),due_at=now()+coalesce((SELECT (snapshot->'offering'->>'deliveryDays')::int FROM sport_orders WHERE id=order_id),3)*interval '1 day' WHERE id=${id} AND revision=${input.revision} AND status='intake' RETURNING id,coach_id`,
        );
        if (!p) throw new ConflictException('Workflow.programChanged');
        await tx.execute(
          sql`INSERT INTO sport_program_events(request_id,kind) VALUES(${id},'intake')`,
        );
        return { ok: true };
      },
    );
  }
  async updateProgram(
    actor: string,
    id: string,
    input: z.infer<typeof c.programUpdateSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['program-update', id, input],
      (tx) => this.programAccess(tx, actor, id, true),
      async (tx) => {
        const [p] = await rows<{
          athlete_id: string;
          relationship_id: string;
          revision: number;
          status: string;
          order_id: string;
        }>(
          tx,
          sql`SELECT * FROM sport_program_requests WHERE id=${id} FOR UPDATE`,
        );
        if (
          p.revision !== input.revision ||
          !['queued', 'preparing', 'revision_requested'].includes(p.status)
        )
          throw new ConflictException('Workflow.programChanged');
        if (input.status === 'delivered') {
          const valid = await rows(
            tx,
            sql`SELECT a.id FROM training_assignments a JOIN training_versions v ON v.id=a.version_id JOIN training_plans t ON t.id=v.plan_id WHERE a.id=${input.assignmentId ?? null} AND a.athlete_id=${p.athlete_id} AND a.relationship_id=${p.relationship_id} AND t.owner_id=${actor}`,
          );
          if (!valid.length)
            throw new ConflictException('Workflow.assignmentRequired');
        }
        await rows(
          tx,
          sql`UPDATE sport_program_requests SET status=${input.status},assignment_id=coalesce(${input.assignmentId ?? null}::uuid,assignment_id),support_ends_at=CASE WHEN ${input.status}='delivered' THEN coalesce(support_ends_at,now()+coalesce((SELECT (snapshot->'offering'->>'supportDays')::int FROM sport_orders WHERE id=${p.order_id}),30)*interval '1 day') ELSE support_ends_at END,revision=revision+1,updated_at=now() WHERE id=${id}`,
        );
        await tx.execute(
          sql`INSERT INTO sport_program_events(request_id,kind,assignment_id) VALUES(${id},${input.status},${input.assignmentId ?? null})`,
        );
        if (input.status === 'delivered')
          await deliverSportsNotification(tx, {
            userId: p.athlete_id,
            title: 'Workflow.programDelivered',
            body: 'Workflow.openProgram',
            href: '/programs',
            sourceKey: `program:${id}:${input.revision}`,
            preference: 'messages',
          });
        return { ok: true };
      },
    );
  }
  async reviseProgram(
    actor: string,
    id: string,
    input: z.infer<typeof c.programRevisionSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['program-revise', id, input],
      (tx) => this.programAccess(tx, actor, id, false),
      async (tx) => {
        const [p] = await rows<{
          status: string;
          revision: number;
          support_ends_at: Date | null;
          max_revisions: number | null;
          response_hours: number | null;
        }>(
          tx,
          sql`SELECT p.*,(o.snapshot->'offering'->>'maxRevisions')::int max_revisions,(o.snapshot->'offering'->>'responseHours')::int response_hours FROM sport_program_requests p JOIN sport_orders o ON o.id=p.order_id WHERE p.id=${id} FOR UPDATE OF p`,
        );
        if (
          !p ||
          p.revision !== input.revision ||
          p.status !== 'delivered' ||
          !p.support_ends_at ||
          p.support_ends_at <= new Date()
        )
          throw new ConflictException('Workflow.programChanged');
        const [count] = await rows<{ total: number }>(
          tx,
          sql`SELECT count(*)::int total FROM sport_program_events WHERE request_id=${id} AND kind='revision_requested'`,
        );
        if (p.max_revisions !== null && count.total >= p.max_revisions)
          throw new ConflictException('Workflow.revisionLimitReached');
        await tx.execute(
          sql`UPDATE sport_program_requests SET status='revision_requested',intake=intake||jsonb_build_object('revisionReason',${input.reason}::text),revision_due_at=CASE WHEN ${p.response_hours}::int IS NOT NULL THEN now()+${p.response_hours}*interval '1 hour' ELSE NULL END,revision=revision+1,updated_at=now() WHERE id=${id}`,
        );
        await tx.execute(
          sql`INSERT INTO sport_program_events(request_id,kind,reason) VALUES(${id},'revision_requested',${input.reason})`,
        );
        return { ok: true };
      },
    );
  }
  async membershipBenefits(
    actor: string,
    id: string,
    input: z.infer<typeof c.membershipBenefitsSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['membership-benefits', id, input],
      async (tx) => {
        const [m] = await rows<{ organization_id: string; branch_id: string }>(
          tx,
          sql`SELECT organization_id,branch_id FROM sport_memberships WHERE id=${id}`,
        );
        if (!m) throw new NotFoundException();
        return this.commerce.staff(tx, actor, m.organization_id, m.branch_id, [
          'owner',
          'manager',
        ]);
      },
      async (tx) => {
        const [m] = await rows<{
          organization_id: string;
          branch_id: string;
          revision: number;
        }>(
          tx,
          sql`SELECT organization_id,branch_id,revision FROM sport_memberships WHERE id=${id} FOR UPDATE`,
        );
        if (m.revision !== input.revision)
          throw new ConflictException('Workflow.rosterChanged');
        for (const serviceId of input.serviceIds) {
          const valid = await rows(
            tx,
            sql`SELECT id FROM sport_services WHERE id=${serviceId} AND organization_id=${m.organization_id} AND branch_id=${m.branch_id} AND kind NOT IN ('membership','program') AND status<>'archived'`,
          );
          if (!valid.length)
            throw new ConflictException('Workflow.invalidBenefit');
        }
        await rows(
          tx,
          sql`UPDATE sport_memberships SET benefit_service_ids=${JSON.stringify([...new Set(input.serviceIds)])}::jsonb,entry_allowed_override=${input.entryAllowed},benefits_reviewed_at=now(),revision=revision+1 WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${m.organization_id},'sports.membership.benefits',${id},${JSON.stringify(input)}::jsonb)`,
        );
        return { ok: true };
      },
    );
  }
  async replacementOptions(actor: string, id: string) {
    const [o] = await rows<{ service_id: string }>(
      this.db,
      sql`SELECT service_id FROM sport_occurrences WHERE id=${id}`,
    );
    if (!o) throw new NotFoundException();
    await this.commerce.serviceActor(this.db, actor, o.service_id, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT id,start_at FROM sport_occurrences WHERE service_id=${o.service_id} AND id<>${id} AND status='scheduled' AND start_at>now() ORDER BY start_at LIMIT 100`,
    );
  }
  async makeup(
    actor: string,
    id: string,
    input: z.infer<typeof c.makeupSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['makeup', id, input],
      async (tx) => {
        const [r] = await rows<{ service_id: string }>(
          tx,
          sql`SELECT o.service_id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE r.id=${id}`,
        );
        if (!r) throw new NotFoundException();
        return this.commerce.serviceActor(tx, actor, r.service_id, [
          'owner',
          'manager',
          'receptionist',
        ]);
      },
      async (tx) => {
        const [old] = await rows<{ occurrence_id: string }>(
          tx,
          sql`SELECT occurrence_id FROM sport_reservations WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`SELECT id FROM sport_occurrences WHERE id IN(${old.occurrence_id},${input.targetOccurrenceId}) ORDER BY id FOR UPDATE`,
        );
        const [r] = await rows<{
          user_id: string;
          membership_id: string | null;
          consumed: boolean;
          quantity: number;
          revision: number;
          status: string;
          checked_in_at: Date | null;
          order_id: string;
        }>(tx, sql`SELECT * FROM sport_reservations WHERE id=${id} FOR UPDATE`);
        const [target] = await rows<{
          id: string;
          service_id: string;
          capacity: number;
          start_at: Date;
          status: string;
        }>(
          tx,
          sql`SELECT * FROM sport_occurrences WHERE id=${input.targetOccurrenceId}`,
        );
        const [order] = await rows<{
          service_id: string;
          status: string;
          snapshot: { kind: string };
        }>(tx, sql`SELECT * FROM sport_orders WHERE id=${r.order_id}`);
        if (
          r.revision !== input.revision ||
          !['no_show', 'confirmed'].includes(r.status) ||
          r.checked_in_at ||
          !target ||
          target.id === old.occurrence_id ||
          target.service_id !== order.service_id ||
          !['class', 'course'].includes(order.snapshot.kind) ||
          order.status !== 'paid' ||
          target.start_at <= new Date() ||
          target.status !== 'scheduled'
        )
          throw new ConflictException('Workflow.orderUnavailable');
        await assertResourcesAvailable(tx, target.id);
        const [capacity] = await rows<{ used: number }>(
          tx,
          sql`SELECT coalesce(sum(quantity),0)::int used FROM sport_reservations WHERE occurrence_id=${target.id} AND (status IN ('pending_approval','confirmed','completed','no_show') OR status='held' AND expires_at>now())`,
        );
        const duplicate = await rows(
          tx,
          sql`SELECT id FROM sport_reservations WHERE occurrence_id=${target.id} AND user_id=${r.user_id} AND dependent_id IS NOT DISTINCT FROM ${(r as typeof r & { dependent_id?: string | null }).dependent_id ?? null}::uuid AND status IN ('held','pending_approval','confirmed','completed','no_show')`,
        );
        if (capacity.used + r.quantity > target.capacity || duplicate.length)
          throw new ConflictException('Workflow.seriesUnavailable');
        if (r.membership_id && r.consumed) {
          await rows(
            tx,
            sql`UPDATE sport_memberships SET consumed=consumed-1,revision=revision+1 WHERE id=${r.membership_id} AND consumed>0`,
          );
          await rows(
            tx,
            sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key,actor_id) VALUES(${r.membership_id},${id},'restore',1,${`makeup:${id}:${r.revision}`},${actor})`,
          );
        }
        await rows(
          tx,
          sql`INSERT INTO sport_makeup_events(reservation_id,previous_occurrence_id,target_occurrence_id,actor_id,reason) VALUES(${id},${old.occurrence_id},${target.id},${actor},${input.reason})`,
        );
        await rows(
          tx,
          sql`UPDATE sport_reservations SET occurrence_id=${target.id},status='confirmed',consumed=false,checked_in_at=NULL,admitted_count=0,revision=revision+1 WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`DELETE FROM sport_attendance WHERE reservation_id=${id}`,
        );
        await scheduleReservationReminders(tx, r.order_id);
        return { ok: true };
      },
    );
  }
  async enrollSeries(
    actor: string,
    input: z.infer<typeof c.seriesEnrollmentSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['series-enroll', input],
      async (tx) => {
        const owned = await rows(
          tx,
          sql`SELECT id FROM sport_memberships WHERE id=${input.membershipId} AND user_id=${actor}`,
        );
        if (!owned.length) throw new NotFoundException();
      },
      async (tx) => {
        const service = await this.commerce.service(tx, input.serviceId, true);
        if (!['class', 'course'].includes(service.kind))
          throw new ConflictException('Closure.seriesFormat');
        const occurrences = await rows<{ id: string }>(
          tx,
          sql`SELECT id FROM sport_occurrences WHERE series_id=${input.seriesId} AND service_id=${input.serviceId} AND status='scheduled' AND start_at>now() ORDER BY id FOR UPDATE`,
        );
        if (!occurrences.length)
          throw new ConflictException('Workflow.seriesUnavailable');
        const orders: string[] = [];
        for (const o of service.kind === 'course'
          ? occurrences.slice(0, 1)
          : occurrences)
          orders.push(
            (
              await this.commerce.checkout(
                actor,
                {
                  serviceId: input.serviceId,
                  occurrenceId: o.id,
                  membershipId: input.membershipId,
                  participants: input.participants,
                  dependentId: input.dependentId,
                  idempotencyKey: `${input.idempotencyKey.slice(0, 50)}-${o.id}`,
                },
                'online',
                false,
                tx,
              )
            ).id,
          );
        return { orderIds: orders };
      },
    );
  }
  async refunds(actor: string, scope: z.infer<typeof c.scopeSchema>) {
    await this.commerce.staff(
      this.db,
      actor,
      scope.organizationId,
      scope.branchId,
      ['owner', 'manager', 'accountant'],
    );
    return rows(
      this.db,
      sql`SELECT f.*,f.amount_minor::text,u.display_name,o.snapshot->>'title' title,sett.method,sett.reference,sett.returned_on FROM sport_refunds f JOIN sport_orders o ON o.id=f.order_id JOIN users u ON u.id=o.user_id LEFT JOIN sport_refund_settlements sett ON sett.refund_id=f.id WHERE o.organization_id=${scope.organizationId} AND o.snapshot->>'branchId'=${scope.branchId} AND ${manualRefundSource(sql`o.id`, sql`f.amount_minor`)} ORDER BY f.created_at DESC LIMIT 100`,
    );
  }
  async settleRefund(
    actor: string,
    id: string,
    input: z.infer<typeof c.refundSettlementSchema>,
  ) {
    return this.command(
      actor,
      input.idempotencyKey,
      ['refund-settle', id, input],
      async (tx) => {
        const [o] = await rows<{
          organization_id: string;
          snapshot: { branchId: string };
        }>(
          tx,
          sql`SELECT o.* FROM sport_orders o JOIN sport_refunds f ON f.order_id=o.id WHERE f.id=${id}`,
        );
        if (!o) throw new NotFoundException();
        await this.commerce.staff(
          tx,
          actor,
          o.organization_id,
          o.snapshot.branchId,
          ['owner', 'manager', 'accountant'],
        );
      },
      async (tx) => {
        const [f] = await rows<{
          id: string;
          order_id: string;
          amount_minor: string;
          created_at: Date;
        }>(tx, sql`SELECT * FROM sport_refunds WHERE id=${id}`);
        await rows(
          tx,
          sql`SELECT id FROM sport_occurrences WHERE id IN(SELECT occurrence_id FROM sport_reservations WHERE order_id=${f.order_id}) ORDER BY id FOR UPDATE`,
        );
        const [o] = await rows<Parameters<CommerceService['fulfil']>[1]>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${f.order_id} FOR UPDATE`,
        );
        const sources = await rows(
          tx,
          sql`SELECT 1 WHERE ${manualRefundSource(sql`${o.id}::uuid`, sql`${f.amount_minor}::bigint`)}`,
        );
        const validDate = await rows(
          tx,
          sql`SELECT id FROM sport_orders WHERE id=${o.id} AND ${input.returnedOn}::date BETWEEN (created_at AT TIME ZONE 'Asia/Tehran')::date AND (now() AT TIME ZONE 'Asia/Tehran')::date`,
        );
        if (!sources.length || !validDate.length)
          throw new ConflictException('Closure.refundChanged');
        const changed = await this.commerce.completeRefund(
          tx,
          o,
          f,
          input.reference,
          input.method,
        );
        if (!changed) throw new ConflictException('Closure.refundChanged');
        await rows(
          tx,
          sql`INSERT INTO sport_refund_settlements(refund_id,actor_id,method,reference,returned_on,reason) VALUES(${id},${actor},${input.method},${input.reference},${input.returnedOn}::date,${input.reason})`,
        );
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${o.organization_id},'sports.refund.settled',${id},${JSON.stringify(input)}::jsonb)`,
        );
        return { ok: true };
      },
    );
  }
}
