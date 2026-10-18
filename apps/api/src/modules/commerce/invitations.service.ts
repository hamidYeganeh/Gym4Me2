import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { lockWritableAccount } from '../auth/account-lock';
import { deliverSportsNotification } from './notification-delivery';
import type { Db, Tx } from '../clubs/club.repository';
import { CommerceService, jsonDto, rows, type Row } from './commerce.service';
import type {
  invitationCreateSchema,
  invitationAnswerSchema,
  invitationCancelSchema,
} from './invitations.contracts';
type Service = Row & {
  id: string;
  organization_id: string;
  branch_id: string;
  available: boolean;
};
type Invitation = Row & {
  id: string;
  service_id: string;
  user_id: string;
  status: string;
  revision: number;
};
const eligible = (
  service: Service,
) => sql`u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending AND (
 EXISTS(SELECT 1 FROM sport_memberships m WHERE m.user_id=u.id AND m.organization_id=${service.organization_id} AND m.branch_id=${service.branch_id}) OR
 EXISTS(SELECT 1 FROM sport_reservations r JOIN sport_occurrences ro ON ro.id=r.occurrence_id JOIN sport_services rs ON rs.id=ro.service_id WHERE r.user_id=u.id AND rs.organization_id=${service.organization_id} AND rs.branch_id=${service.branch_id} AND r.status IN ('confirmed','completed','no_show')))`;

@Injectable()
export class SportsInvitationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  private async service(db: Db | Tx, id: string, actor?: string) {
    const [service] = await rows<Service>(
      db,
      sql`SELECT s.id,s.organization_id,s.branch_id,
   (s.status='published' AND s.published_version_id IS NOT NULL AND o.status='approved' AND c.publication_status='published' AND c.archived_at IS NULL) available
   FROM sport_services s JOIN organizations o ON o.id=s.organization_id JOIN clubs c ON c.id=s.organization_id WHERE s.id=${id}`,
    );
    if (!service) throw new NotFoundException('Backend.invitationUnavailable');
    if (actor)
      await this.commerce.staff(
        db,
        actor,
        service.organization_id,
        service.branch_id,
      );
    return service;
  }
  private async page(where: SQL, cursor?: string) {
    let before = sql``;
    if (cursor) {
      const [anchor] = await rows<{ id: string }>(
        this.db,
        sql`SELECT i.id FROM sport_invitations i WHERE ${where} AND i.id=${cursor}`,
      );
      if (!anchor)
        throw new BadRequestException('Backend.invalidInvitationCursor');
      // Keep PostgreSQL's microsecond precision; a JavaScript Date would lose rows.
      before = sql`AND (i.created_at,i.id)<(SELECT anchor.created_at,anchor.id FROM sport_invitations anchor WHERE anchor.id=${anchor.id})`;
    }
    const items = await rows<{ id: string } & Row>(
      this.db,
      sql`SELECT i.id,i.service_id,i.user_id,i.status,i.revision,i.created_at,i.updated_at,i.answered_at,i.cancelled_at,
   coalesce(v.title,s.title) title,o.name club_name,b.name branch_name,u.display_name,right(u.phone,4) phone_suffix,
   (s.status='published' AND s.published_version_id IS NOT NULL AND o.status='approved' AND c.publication_status='published' AND c.archived_at IS NULL) available
   FROM sport_invitations i JOIN sport_services s ON s.id=i.service_id JOIN users u ON u.id=i.user_id
   JOIN organizations o ON o.id=s.organization_id JOIN clubs c ON c.id=s.organization_id JOIN branches b ON b.id=s.branch_id
   LEFT JOIN sport_service_versions v ON v.id=s.published_version_id WHERE ${where} ${before} ORDER BY i.created_at DESC,i.id DESC LIMIT 26`,
    );
    return {
      items: items.slice(0, 25),
      nextCursor: items.length > 25 ? items[24].id : null,
    };
  }
  list(userId: string, cursor?: string) {
    return this.page(sql`i.user_id=${userId}`, cursor);
  }
  async host(actor: string, serviceId: string, cursor?: string) {
    await this.service(this.db, serviceId, actor);
    return this.page(sql`i.service_id=${serviceId}`, cursor);
  }
  async recipients(actor: string, serviceId: string, search: string) {
    const service = await this.service(this.db, serviceId, actor);
    return rows(
      this.db,
      sql`SELECT u.id,u.display_name,right(u.phone,4) phone_suffix FROM users u WHERE ${eligible(service)} AND (coalesce(u.display_name,'') ILIKE ${`%${search}%`} OR u.phone ILIKE ${`%${search}%`}) ORDER BY u.display_name NULLS LAST,u.id LIMIT 30`,
    );
  }
  private command(
    actor: string,
    kind: string,
    input: Record<string, unknown> & { idempotencyKey: string },
    write: (tx: Tx) => Promise<Row>,
    authorize?: (tx: Tx) => Promise<unknown>,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, actor);
      if (authorize) await authorize(tx);
      const key = `invitation:${kind}:${input.idempotencyKey}`;
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor}:${key}`},0))`,
      );
      const fingerprint = createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex');
      const [previous] = await rows<{ request_hash: string; result: Row }>(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${actor} AND command_key=${key}`,
      );
      // Authorization is deliberately rechecked by the caller before any receipt replay.
      if (previous) {
        if (previous.request_hash !== fingerprint)
          throw new ConflictException('Backend.invitationKeyReused');
        return previous.result;
      }
      const result = jsonDto(await write(tx)) as Row;
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${actor},${key},${fingerprint},${JSON.stringify(result)}::jsonb)`,
      );
      return result;
    });
  }
  private async audit(
    tx: Tx,
    actor: string,
    service: Service,
    id: string,
    action: string,
    status: string,
  ) {
    await rows(
      tx,
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${service.organization_id},${action},${id},${JSON.stringify({ serviceId: service.id, branchId: service.branch_id, status })}::jsonb)`,
    );
  }
  async create(actor: string, input: z.infer<typeof invitationCreateSchema>) {
    await this.service(this.db, input.serviceId, actor);
    return this.command(
      actor,
      'create',
      input,
      async (tx) => {
        const service = await this.service(tx, input.serviceId, actor);
        if (!service.available)
          throw new ConflictException('Backend.invitationServiceUnpublished');
        const recipients = await rows(
          tx,
          sql`SELECT u.id FROM users u WHERE u.id=${input.userId} AND ${eligible(service)} FOR SHARE OF u`,
        );
        if (!recipients.length)
          throw new NotFoundException('Backend.invitationRecipientUnavailable');
        const [invitation] = await rows<Invitation>(
          tx,
          sql`INSERT INTO sport_invitations(service_id,user_id,invited_by) VALUES(${input.serviceId},${input.userId},${actor}) ON CONFLICT(service_id,user_id) DO NOTHING RETURNING *`,
        );
        if (!invitation) {
          const [existing] = await rows<Invitation>(
            tx,
            sql`SELECT * FROM sport_invitations WHERE service_id=${input.serviceId} AND user_id=${input.userId}`,
          );
          return existing;
        }
        await this.audit(
          tx,
          actor,
          service,
          invitation.id,
          'sports.invitation.created',
          'invited',
        );
        await deliverSportsNotification(tx, {
          userId: input.userId,
          title: 'دعوت به فعالیت ورزشی',
          body: '',
          href: '/invitations/sports',
          sourceKey: `invite:${invitation.id}`,
          preference: 'invitations',
        });
        return invitation;
      },
      (tx) => this.service(tx, input.serviceId, actor),
    );
  }
  async answer(
    userId: string,
    id: string,
    input: z.infer<typeof invitationAnswerSchema>,
  ) {
    const [own] = await rows(
      this.db,
      sql`SELECT id FROM sport_invitations WHERE id=${id} AND user_id=${userId}`,
    );
    if (!own) throw new NotFoundException('Backend.invitationUnavailable');
    return this.command(userId, `answer:${id}`, input, async (tx) => {
      const [invitation] = await rows<Invitation>(
        tx,
        sql`SELECT * FROM sport_invitations WHERE id=${id} AND user_id=${userId} FOR UPDATE`,
      );
      if (!invitation)
        throw new NotFoundException('Backend.invitationUnavailable');
      if (
        invitation.revision !== input.revision ||
        invitation.status !== 'invited'
      )
        throw new ConflictException('Backend.invitationChanged');
      const service = await this.service(tx, invitation.service_id);
      if (input.accept && !service.available)
        throw new ConflictException('Backend.invitationServiceUnpublished');
      const [updated] = await rows(
        tx,
        sql`UPDATE sport_invitations SET status=${input.accept ? 'accepted' : 'declined'},revision=revision+1,updated_at=now(),answered_at=now() WHERE id=${id} RETURNING *`,
      );
      await this.audit(
        tx,
        userId,
        service,
        id,
        'sports.invitation.answered',
        input.accept ? 'accepted' : 'declined',
      );
      return updated;
    });
  }
  async cancel(
    actor: string,
    id: string,
    input: z.infer<typeof invitationCancelSchema>,
  ) {
    const [invitation] = await rows<Invitation>(
      this.db,
      sql`SELECT * FROM sport_invitations WHERE id=${id}`,
    );
    if (!invitation)
      throw new NotFoundException('Backend.invitationUnavailable');
    await this.service(this.db, invitation.service_id, actor);
    return this.command(
      actor,
      `cancel:${id}`,
      input,
      async (tx) => {
        const service = await this.service(tx, invitation.service_id, actor);
        const [updated] = await rows(
          tx,
          sql`UPDATE sport_invitations SET status='cancelled',revision=revision+1,updated_at=now(),cancelled_at=now() WHERE id=${id} AND status='invited' AND revision=${input.revision} RETURNING *`,
        );
        if (!updated) throw new ConflictException('Backend.invitationChanged');
        await rows(
          tx,
          sql`DELETE FROM sport_notifications WHERE user_id=${invitation.user_id} AND source_key=${`invite:${id}`} AND read_at IS NULL`,
        );
        await this.audit(
          tx,
          actor,
          service,
          id,
          'sports.invitation.cancelled',
          'cancelled',
        );
        return updated;
      },
      (tx) => this.service(tx, invitation.service_id, actor),
    );
  }
}
