import type { Principal } from '../auth/auth.service';
import { assertSchedulingAdmin } from './scheduling-authority';
import { coachingVisible, publicServiceVisible } from './public-service';
import { serviceCoverProjection, type ServiceCover } from './service-cover';
import {
  resourceClaims,
  resourceAvailable,
  assertResourcesAvailable,
  insertResourceClaim,
} from './resource-capacity';
import {
  decodeBookingCursor,
  encodeBookingCursor,
  type BookingPageInput,
} from './booking-page';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import {
  memberAccess,
  requireBranch,
  type Db,
  type Tx,
} from '../clubs/club.repository';
import { lockWritableAccount } from '../auth/account-lock';
import { deliverSportsNotification } from './notification-delivery';
import {
  deliverOrderNotification,
  retireOrderNotices,
} from './order-notifications';
import { deliverTimeSensitiveNotification } from './time-sensitive-notifications';
import {
  scheduleReservationReminders,
  retireReservationReminders,
  retireWaitlistOffer,
  retireOrderWaitlistOffers,
} from './scheduled-notifications';
import {
  basisPoints,
  type ServiceInput,
  type ServiceEligibility,
  type ServicePolicy,
  type OccurrenceSeriesInput,
  type OccurrenceEditInput,
  type OccurrenceSeriesEditInput,
  type PaymentScenario,
  type checkoutSchema,
  type couponSchema,
} from './commerce.contracts';
import type { z } from 'zod';
import { PAYMENT_ADAPTER, type PaymentAdapter } from './sandbox-payment';

export type Row = Record<string, unknown>;
export async function rows<T = Row>(db: Db | Tx, query: SQL): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        typeof value === 'string' &&
        /(?:_at|_until)$/.test(key) &&
        /^\d{4}-\d{2}-\d{2}/.test(value)
          ? new Date(value)
          : value,
      ]),
    ),
  ) as T[];
}
async function one<T = Row>(db: Db | Tx, query: SQL): Promise<T> {
  const [row] = await rows<T>(db, query);
  if (!row) throw new NotFoundException('Backend.clubNotFound');
  return row;
}
async function databaseNow(tx: Tx) {
  return (
    await one<{ current_at: Date }>(
      tx,
      sql`SELECT clock_timestamp() current_at`,
    )
  ).current_at;
}
type Service = Row & {
  id: string;
  organization_id: string;
  branch_id: string;
  version_id: string;
  title: string;
  kind: string;
  status: string;
  published_version_id: string | null;
  amount_minor: string;
  policy: ServicePolicy;
  resource_ids: string[];
  requirements: string[];
  eligibility: ServiceEligibility;
  cover: ServiceCover | null;
  duration_days: number | null;
  session_count: number | null;
  approval_required: boolean;
  coach_user_id: string | null;
};
type Occurrence = Row & {
  id: string;
  service_id: string;
  start_at: Date;
  end_at: Date;
  capacity: number;
  status: string;
};
type SeriesEditResult = {
  id: string;
  revision: number;
  occurrences: {
    id: string;
    startAt: string;
    endAt: string;
    capacity: number;
  }[];
};
type Order = Row & {
  id: string;
  user_id: string;
  organization_id: string;
  service_id: string;
  version_id: string;
  amount_minor: string;
  refunded_minor: string;
  status: string;
  expires_at: Date;
  snapshot: {
    title: string;
    policy: ServicePolicy;
    eligibility?: ServiceEligibility;
    durationDays: number | null;
    sessionCount: number | null;
    kind: string;
    branchId: string;
    approvalRequired: boolean;
  };
  request_hash: string;
};
type Reservation = Row & {
  id: string;
  occurrence_id: string;
  order_id: string;
  membership_id: string | null;
  status: string;
  user_id: string;
  revision: number;
  consumed: boolean;
};
type Coupon = Row & {
  id: string;
  code: string;
  revision: number;
};
const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const ENTRY_EARLY_MS = 2 * 60 * 60 * 1000;
const entryWindow = (start: Date, end: Date) => {
  const now = Date.now();
  return now >= start.getTime() - ENTRY_EARLY_MS && now <= end.getTime();
};
const active = sql`('held','pending_approval','confirmed')`;
export function jsonDto(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(jsonDto);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        jsonDto(v),
      ]),
    );
  return value;
}

function scheduleFailure(error: unknown): never {
  const failure = error as { code?: string; cause?: { code?: string } };
  if (
    ['23P01', '23514', '40001', '40P01'].includes(
      failure.code ?? failure.cause?.code ?? '',
    )
  )
    throw new ConflictException('Practice.conflict');
  throw error;
}
@Injectable()
export class CommerceService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(PAYMENT_ADAPTER) private readonly payments: PaymentAdapter,
  ) {}
  private get db() {
    return this.database.db;
  }
  async staff(
    db: Db | Tx,
    userId: string,
    org: string,
    branch: string,
    roles = ['owner', 'manager'],
  ) {
    const member = await memberAccess(db, userId, org, branch);
    await requireBranch(db, org, branch);
    if (!roles.includes(member.role))
      throw new ForbiddenException('Backend.branchAccessDenied');
    return member;
  }
  async serviceActor(
    db: Db | Tx,
    userId: string,
    serviceId: string,
    roles = ['owner', 'manager'],
  ) {
    const [assigned] = await rows(
      db,
      sql`SELECT cs.coach_id FROM coaching_services cs JOIN coaching_practices p ON p.user_id=cs.coach_id JOIN sport_services s ON s.id=cs.service_id JOIN branch_coaches bc ON bc.branch_id=s.branch_id AND bc.coach_id=cs.coach_id JOIN users u ON u.id=cs.coach_id WHERE cs.service_id=${serviceId} AND cs.coach_id=${userId} AND bc.status='active' AND (bc.ends_on IS NULL OR bc.ends_on>=current_date) AND p.review_status='approved' AND p.review_expires_at>now() AND u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending`,
    );
    if (assigned) return { role: 'coach' };
    const [service] = await rows<{
      organization_id: string;
      branch_id: string;
    }>(
      db,
      sql`SELECT organization_id,branch_id FROM sport_services WHERE id=${serviceId}`,
    );
    if (!service) throw new NotFoundException();
    return this.staff(
      db,
      userId,
      service.organization_id,
      service.branch_id,
      roles,
    );
  }
  private async coachingSale(db: Db | Tx, userId: string, serviceId: string) {
    const [special] = await rows<{ coach_id: string }>(
      db,
      sql`SELECT coach_id FROM coaching_services WHERE service_id=${serviceId}`,
    );
    if (!special) return;
    const [allowed] = await rows(
      db,
      sql`SELECT p.user_id FROM coaching_practices p JOIN users u ON u.id=p.user_id JOIN coaching_relationships r ON r.coach_id=p.user_id AND r.student_id=${userId} AND r.status='active' WHERE p.user_id=${special.coach_id} AND p.review_status='approved' AND p.review_expires_at>now() AND u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending AND EXISTS(SELECT 1 FROM branch_coaches bc JOIN sport_services ss ON ss.branch_id=bc.branch_id WHERE ss.id=${serviceId} AND bc.coach_id=p.user_id AND bc.status='active' AND (bc.ends_on IS NULL OR bc.ends_on>=current_date))`,
    );
    if (!allowed) throw new ForbiddenException('Practice.relationshipRequired');
  }
  private async service(db: Db | Tx, id: string, published = false) {
    return one<Service>(
      db,
      sql`SELECT s.*,v.id version_id,v.title AS title,v.amount_minor::text,v.description,v.policy,v.eligibility,v.requirements,v.resource_ids,v.duration_days,v.session_count,v.coach_name,v.coach_user_id,v.level,v.visibility,v.approval_required,v.show_participants,${serviceCoverProjection},
      b.name branch_name,o.name club_name FROM sport_services s
      JOIN LATERAL(SELECT * FROM sport_service_versions WHERE service_id=s.id ${published ? sql`AND id=s.published_version_id` : sql``} ORDER BY version DESC LIMIT 1) v ON true
      JOIN branches b ON b.id=s.branch_id JOIN clubs c ON c.id=s.organization_id JOIN organizations o ON o.id=s.organization_id
      WHERE s.id=${id} ${published ? sql`AND s.status='published' AND c.publication_status='published' AND o.status='approved' AND c.archived_at IS NULL AND ${coachingVisible}` : sql``}`,
    );
  }
  async catalog(search = '', branchId?: string, organizationId?: string) {
    return (
      await this.catalogPage(search, branchId, organizationId, undefined, 100)
    ).items;
  }
  async catalogPage(
    search = '',
    branchId?: string,
    organizationId?: string,
    cursor?: string,
    limit = 20,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new BadRequestException('Backend.invalidInput');
    const filter = sql`${publicServiceVisible}
      ${organizationId ? sql`AND s.organization_id=${organizationId}` : sql``} ${branchId ? sql`AND s.branch_id=${branchId}` : sql``} AND (v.title ILIKE ${`%${search}%`} OR v.description ILIKE ${`%${search}%`})`;
    let before = sql``;
    if (cursor) {
      const [anchor] = await rows(
        this.db,
        sql`SELECT s.id FROM sport_services s JOIN branch_profiles bp ON bp.branch_id=s.branch_id AND bp.club_id=s.organization_id JOIN clubs c ON c.id=s.organization_id JOIN organizations o ON o.id=s.organization_id JOIN sport_service_versions v ON v.id=s.published_version_id WHERE s.id=${cursor} AND ${filter}`,
      );
      if (!anchor)
        throw new BadRequestException('Backend.invalidCalendarCursor');
      before = sql`AND (s.created_at,s.id)<(SELECT created_at,id FROM sport_services WHERE id=${cursor})`;
    }
    const items = await rows<Row & { id: string }>(
      this.db,
      sql`SELECT s.id,s.organization_id,v.title,s.kind,s.branch_id,b.name branch_name,o.name club_name,v.amount_minor::text,v.description,v.level,v.coach_name,v.coach_user_id,v.eligibility,${serviceCoverProjection},
      (SELECT min(o.start_at) FROM sport_occurrences o JOIN sport_service_versions ov ON ov.id=o.version_id WHERE o.service_id=s.id AND o.status='scheduled' AND o.start_at>now() AND (${resourceAvailable})) next_start_at
      FROM sport_services s JOIN branches b ON b.id=s.branch_id JOIN branch_profiles bp ON bp.branch_id=s.branch_id AND bp.club_id=s.organization_id JOIN clubs c ON c.id=s.organization_id JOIN organizations o ON o.id=s.organization_id
      JOIN sport_service_versions v ON v.id=s.published_version_id
      WHERE ${filter} ${before} ORDER BY s.created_at DESC,s.id DESC LIMIT ${limit + 1}`,
    );
    return {
      items: items.slice(0, limit),
      nextCursor: items.length > limit ? items[limit - 1].id : null,
    };
  }
  async detail(id: string) {
    const service = await this.service(this.db, id, true);
    const occurrences = await rows(
      this.db,
      sql`SELECT o.*,(${resourceAvailable}) resource_available,
      o.capacity-(SELECT count(*)::int FROM sport_reservations r WHERE r.occurrence_id=o.id AND (r.status='confirmed' OR r.status IN ('held','pending_approval') AND r.expires_at>now())) remaining
      FROM sport_occurrences o JOIN sport_service_versions ov ON ov.id=o.version_id WHERE o.service_id=${id} AND o.status='scheduled' AND o.end_at>now() ORDER BY o.start_at LIMIT 100`,
    );
    return { ...service, occurrences };
  }
  async business(userId: string, org: string, branch: string) {
    await this.staff(this.db, userId, org, branch, [
      'owner',
      'manager',
      'receptionist',
      'accountant',
    ]);
    return rows(
      this.db,
      sql`SELECT s.*,v.title AS title,v.amount_minor::text,v.description,v.policy,v.eligibility,v.duration_days,v.session_count,v.requirements,v.resource_ids,v.level,v.coach_name,v.coach_user_id,v.visibility,v.approval_required,v.show_participants,(s.published_version_id IS DISTINCT FROM v.id) has_unpublished_changes,${serviceCoverProjection} FROM sport_services s
      JOIN LATERAL(SELECT * FROM sport_service_versions WHERE service_id=s.id ORDER BY version DESC LIMIT 1) v ON true WHERE s.organization_id=${org} AND s.branch_id=${branch} ORDER BY s.created_at DESC LIMIT 100`,
    );
  }
  async coupons(userId: string, serviceId: string) {
    const service = await this.service(this.db, serviceId);
    await this.staff(
      this.db,
      userId,
      service.organization_id,
      service.branch_id,
    );
    return rows(
      this.db,
      sql`SELECT c.id,c.code,c.basis_points,c.max_uses,c.expires_at,c.disabled_at,c.revision,
      (SELECT count(*)::int FROM sport_orders o WHERE o.service_id=c.service_id AND o.snapshot->>'coupon'=c.code AND o.status NOT IN ('cancelled','refunded')) used
      FROM sport_coupons c WHERE c.service_id=${serviceId} ORDER BY c.expires_at DESC LIMIT 100`,
    );
  }
  async createCoupon(
    userId: string,
    serviceId: string,
    input: z.infer<typeof couponSchema>,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const service = await this.service(tx, serviceId);
      await this.staff(tx, userId, service.organization_id, service.branch_id);
      const created = await rows<{ id: string }>(
        tx,
        sql`INSERT INTO sport_coupons(service_id,code,basis_points,max_uses,expires_at)
        VALUES(${serviceId},${input.code},${input.basisPoints},${input.maxUses},${input.expiresAt})
        ON CONFLICT(service_id,code) DO NOTHING RETURNING id`,
      );
      if (!created[0]) throw new ConflictException('Coupon already exists');
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details)
        VALUES(${userId},${service.organization_id},'sports.coupon.create',${created[0].id},${JSON.stringify({ serviceId, code: input.code })}::jsonb)`,
      );
      return one<Coupon>(
        tx,
        sql`SELECT id,code,basis_points,max_uses,expires_at,disabled_at,revision FROM sport_coupons WHERE id=${created[0].id}`,
      );
    });
  }
  async disableCoupon(
    userId: string,
    serviceId: string,
    couponId: string,
    revision: number,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const service = await this.service(tx, serviceId);
      await this.staff(tx, userId, service.organization_id, service.branch_id);
      const changed = await rows<Coupon>(
        tx,
        sql`UPDATE sport_coupons SET disabled_at=now(),revision=revision+1
        WHERE id=${couponId} AND service_id=${serviceId} AND revision=${revision} AND disabled_at IS NULL
        RETURNING id,code,basis_points,max_uses,expires_at,disabled_at,revision`,
      );
      if (!changed[0]) throw new ConflictException('Coupon changed');
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details)
        VALUES(${userId},${service.organization_id},'sports.coupon.disable',${couponId},${JSON.stringify({ serviceId })}::jsonb)`,
      );
      return changed[0];
    });
  }
  async createService(userId: string, input: ServiceInput, transaction?: Tx) {
    const execute = async (tx: Tx) => {
      await lockWritableAccount(tx, userId);
      await this.staff(tx, userId, input.organizationId, input.branchId);
      await requireBranch(tx, input.organizationId, input.branchId);
      for (const id of input.resourceIds)
        await one(
          tx,
          sql`SELECT id FROM sport_resources WHERE id=${id} AND organization_id=${input.organizationId} AND branch_id=${input.branchId} AND active=true`,
        );
      const service = await one<{ id: string }>(
        tx,
        sql`INSERT INTO sport_services(organization_id,branch_id,title,kind) VALUES(${input.organizationId},${input.branchId},${input.title},${input.kind}) RETURNING id`,
      );
      if (input.coachUserId)
        await one(
          tx,
          sql`SELECT id FROM branch_coaches WHERE coach_id=${input.coachUserId} AND branch_id=${input.branchId} AND status='active'`,
        );
      await this.insertVersion(tx, service.id, 1, input);
      await rows(
        tx,
        sql`INSERT INTO sport_calendars(organization_id,branch_id,title) SELECT o.id,b.id,left(o.name||' · '||b.name,160) FROM organizations o JOIN branches b ON b.organization_id=o.id WHERE o.id=${input.organizationId} AND b.id=${input.branchId} ON CONFLICT(branch_id) DO NOTHING`,
      );
      return this.service(tx, service.id);
    };
    return transaction ? execute(transaction) : this.db.transaction(execute);
  }
  private insertVersion(
    tx: Tx,
    id: string,
    version: number,
    input: ServiceInput,
  ) {
    return rows(
      tx,
      sql`INSERT INTO sport_service_versions(service_id,version,title,amount_minor,description,policy,eligibility,requirements,resource_ids,duration_days,session_count,level,coach_name,visibility,approval_required,show_participants,coach_user_id)
      VALUES(${id},${version},${input.title},${input.amountMinor},${input.description},${JSON.stringify(input.policy)}::jsonb,${JSON.stringify(input.eligibility)}::jsonb,${JSON.stringify(input.requirements)}::jsonb,${`{${input.resourceIds.join(',')}}`}::uuid[],${input.durationDays},${input.sessionCount},${input.level},${input.coachName},${input.visibility},${input.approvalRequired},${input.showParticipants},${input.coachUserId})`,
    );
  }
  async publish(
    userId: string,
    id: string,
    revision: number,
    transaction?: Tx,
  ) {
    const execute = async (tx: Tx) => {
      await lockWritableAccount(tx, userId);
      await rows(
        tx,
        sql`SELECT id FROM sport_services WHERE id=${id} FOR UPDATE`,
      );
      const service = await this.service(tx, id);
      await this.staff(tx, userId, service.organization_id, service.branch_id);
      const result = await rows(
        tx,
        sql`UPDATE sport_services SET status='published',published_version_id=${service.version_id},title=${service.title},revision=revision+1 WHERE id=${id} AND revision=${revision} AND status<>'archived' RETURNING *`,
      );
      if (!result.length) throw new ConflictException('Backend.serviceChanged');
      return result[0];
    };
    return transaction ? execute(transaction) : this.db.transaction(execute);
  }
  async schedule(
    userId: string,
    id: string,
    input: { startAt: string; endAt: string; capacity: number },
  ) {
    return this.db
      .transaction(async (tx) => {
        await rows(
          tx,
          sql`SELECT id FROM sport_services WHERE id=${id} FOR UPDATE`,
        );
        const draft = await this.service(tx, id);
        const service =
          draft.status === 'published' &&
          draft.published_version_id !== draft.version_id
            ? await this.service(tx, id, true)
            : draft;
        await this.serviceActor(tx, userId, service.id);
        if (service.kind === 'membership')
          throw new BadRequestException('Practice.invalidService');
        await this.assertCourseScheduleOpen(tx, service);
        if (new Date(input.startAt) <= new Date())
          throw new BadRequestException('Start must be in the future');
        const occurrence = await one<Occurrence>(
          tx,
          sql`INSERT INTO sport_occurrences(service_id,version_id,start_at,end_at,capacity) VALUES(${id},${service.version_id},${input.startAt},${input.endAt},${input.capacity}) RETURNING *`,
        );
        if (service.kind === 'class' || service.kind === 'course')
          await this.occupy(tx, service, occurrence);
        else if (service.kind === 'court') {
          await resourceClaims(tx, service);
          await assertResourcesAvailable(tx, occurrence.id);
        }
        if (service.coach_user_id)
          await rows(
            tx,
            sql`INSERT INTO sport_coach_claims(coach_user_id,occurrence_id,period) VALUES(${service.coach_user_id},${occurrence.id},tstzrange(${occurrence.start_at},${occurrence.end_at},'[)'))`,
          );
        return occurrence;
      })
      .catch(scheduleFailure);
  }
  private async schedulingAccess(
    db: Db | Tx,
    userId: string,
    service: { organization_id: string; branch_id: string },
    administrator?: Principal,
  ) {
    if (administrator) {
      await assertSchedulingAdmin(db, administrator, userId);
      await requireBranch(db, service.organization_id, service.branch_id);
      return;
    }
    await this.staff(db, userId, service.organization_id, service.branch_id);
  }
  async scheduleSeries(
    userId: string,
    id: string,
    input: OccurrenceSeriesInput,
    administrator?: Principal,
    reason?: string,
  ) {
    const requestHash = hash(
      JSON.stringify({
        serviceId: id,
        startAt: input.startAt,
        endAt: input.endAt,
        capacity: input.capacity,
        count: input.count,
        intervalDays: input.intervalDays,
        revision: input.revision,
      }),
    );
    try {
      return await this.db
        .transaction(async (tx) => {
          await lockWritableAccount(tx, userId);
          await rows(
            tx,
            sql`SELECT id FROM sport_services WHERE id=${id} FOR UPDATE`,
          );
          const draft = await this.service(tx, id);
          await this.schedulingAccess(tx, userId, draft, administrator);
          const [previous] = await rows<{ id: string; request_hash: string }>(
            tx,
            sql`SELECT id,request_hash FROM sport_occurrence_series WHERE actor_id=${userId} AND idempotency_key=${input.idempotencyKey}`,
          );
          if (previous) {
            if (previous.request_hash !== requestHash)
              throw new ConflictException('Backend.scheduleKeyReused');
            return {
              id: previous.id,
              occurrences: await rows<Occurrence>(
                tx,
                sql`SELECT * FROM sport_occurrences WHERE series_id=${previous.id} ORDER BY start_at`,
              ),
            };
          }
          if (Number(draft.revision) !== input.revision)
            throw new ConflictException('Backend.serviceChanged');
          if (draft.kind === 'membership')
            throw new BadRequestException('Backend.invalidField');
          const service =
            draft.status === 'published' &&
            draft.published_version_id !== draft.version_id
              ? await this.service(tx, id, true)
              : draft;
          await this.assertCourseScheduleOpen(tx, service);
          const start = Date.parse(input.startAt);
          const end = Date.parse(input.endAt);
          if (start <= Date.now())
            throw new BadRequestException('Backend.scheduleStartInPast');
          const series = await one<{ id: string }>(
            tx,
            sql`INSERT INTO sport_occurrence_series(service_id,version_id,actor_id,idempotency_key,request_hash,interval_days,occurrence_count)
          VALUES(${id},${service.version_id},${userId},${input.idempotencyKey},${requestHash},${input.intervalDays},${input.count}) RETURNING id`,
          );
          const intervalMs = input.intervalDays * 24 * 60 * 60 * 1000;
          const occurrences: Occurrence[] = [];
          for (let index = 0; index < input.count; index++) {
            const occurrence = await one<Occurrence>(
              tx,
              sql`INSERT INTO sport_occurrences(service_id,version_id,series_id,start_at,end_at,capacity)
            VALUES(${id},${service.version_id},${series.id},${new Date(start + index * intervalMs)},${new Date(end + index * intervalMs)},${input.capacity}) RETURNING *`,
            );
            if (service.kind === 'class' || service.kind === 'course')
              await this.occupy(tx, service, occurrence);
            else if (service.kind === 'court') {
              await resourceClaims(tx, service);
              await assertResourcesAvailable(tx, occurrence.id);
            }
            if (service.coach_user_id)
              await rows(
                tx,
                sql`INSERT INTO sport_coach_claims(coach_user_id,occurrence_id,period) VALUES(${service.coach_user_id},${occurrence.id},tstzrange(${occurrence.start_at},${occurrence.end_at},'[)'))`,
              );
            occurrences.push(occurrence);
          }
          await rows(
            tx,
            sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details)
          VALUES(${userId},${service.organization_id},'sports.occurrence-series.create',${series.id},${JSON.stringify({ serviceId: id, count: input.count, intervalDays: input.intervalDays, reason })}::jsonb)`,
          );
          return { id: series.id, occurrences };
        })
        .catch(scheduleFailure);
    } catch (error) {
      const pgCode =
        (error as { code?: string; cause?: { code?: string } }).code ??
        (error as { cause?: { code?: string } }).cause?.code;
      if (
        pgCode === '23505' ||
        pgCode === '23P01' ||
        (error instanceof ConflictException &&
          error.message === 'Backend.resourceConflict')
      )
        throw new ConflictException('Backend.scheduleConflict');
      throw error;
    }
  }
  private async assertCourseScheduleOpen(tx: Tx, service: Service) {
    if (service.kind !== 'course') return;
    const sold = await rows<{ id: string }>(
      tx,
      sql`SELECT id FROM sport_orders WHERE service_id=${service.id} AND status NOT IN ('cancelled','refunded') LIMIT 1`,
    );
    if (sold.length)
      throw new ConflictException('Backend.courseScheduleLocked');
  }
  async listSeries(
    userId: string,
    serviceId: string,
    administrator?: Principal,
  ) {
    const service = await this.service(this.db, serviceId);
    await this.schedulingAccess(this.db, userId, service, administrator);
    return rows(
      this.db,
      sql`SELECT x.id,x.service_id,x.version_id,x.interval_days,x.occurrence_count,x.revision,
      first.start_at,first.end_at,first.capacity,
      (first.start_at>now()
       AND NOT EXISTS(SELECT 1 FROM sport_occurrences o WHERE o.series_id=x.id AND o.status<>'scheduled')
       AND NOT EXISTS(SELECT 1 FROM sport_occurrences o JOIN sport_reservations r ON r.occurrence_id=o.id WHERE o.series_id=x.id)
       AND NOT EXISTS(SELECT 1 FROM sport_occurrences o JOIN sport_waitlist w ON w.occurrence_id=o.id WHERE o.series_id=x.id)
       AND NOT EXISTS(SELECT 1 FROM sport_occurrences o JOIN sport_conversations c ON c.occurrence_id=o.id WHERE o.series_id=x.id)
       AND NOT EXISTS(SELECT 1 FROM sport_invitations i WHERE i.service_id=x.service_id)
       AND (${service.kind !== 'course'} OR NOT EXISTS(
         SELECT 1 FROM sport_orders od WHERE od.service_id=x.service_id
         AND od.status NOT IN ('cancelled','refunded')
       ))
      ) editable
      FROM sport_occurrence_series x JOIN LATERAL(
        SELECT start_at,end_at,capacity FROM sport_occurrences WHERE series_id=x.id ORDER BY start_at LIMIT 1
      ) first ON true WHERE x.service_id=${serviceId} ORDER BY first.start_at DESC LIMIT 100`,
    );
  }
  async editSeries(
    userId: string,
    serviceId: string,
    seriesId: string,
    input: OccurrenceSeriesEditInput,
    administrator?: Principal,
  ) {
    const commandKey = `series-edit:${input.idempotencyKey}`;
    const requestHash = hash(
      JSON.stringify({
        serviceId,
        seriesId,
        startAt: input.startAt,
        endAt: input.endAt,
        capacity: input.capacity,
        intervalDays: input.intervalDays,
        revision: input.revision,
        reason: input.reason,
      }),
    );
    try {
      return await this.db.transaction(async (tx) => {
        await lockWritableAccount(tx, userId);
        await rows(
          tx,
          sql`SELECT id FROM sport_services WHERE id=${serviceId} FOR UPDATE`,
        );
        const service = await this.service(tx, serviceId);
        await this.schedulingAccess(tx, userId, service, administrator);
        const [receipt] = await rows<{
          request_hash: string;
          result: SeriesEditResult;
        }>(
          tx,
          sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${commandKey}`,
        );
        if (receipt) {
          if (receipt.request_hash !== requestHash)
            throw new ConflictException('Backend.scheduleKeyReused');
          return receipt.result;
        }
        const series = await one<{
          id: string;
          version_id: string;
          interval_days: number;
          occurrence_count: number;
          revision: number;
        }>(
          tx,
          sql`SELECT id,version_id,interval_days,occurrence_count,revision FROM sport_occurrence_series WHERE id=${seriesId} AND service_id=${serviceId} FOR UPDATE`,
        );
        if (series.revision !== input.revision)
          throw new ConflictException('Backend.seriesChanged');
        await this.assertCourseScheduleOpen(tx, service);
        const start = Date.parse(input.startAt);
        const end = Date.parse(input.endAt);
        if (start <= Date.now())
          throw new BadRequestException('Backend.scheduleStartInPast');
        const occurrences = await rows<Occurrence>(
          tx,
          sql`SELECT * FROM sport_occurrences WHERE series_id=${seriesId} ORDER BY start_at,id FOR UPDATE`,
        );
        if (occurrences.length !== series.occurrence_count)
          throw new ConflictException('Backend.seriesChanged');
        const [locked] = await rows<{ locked: boolean }>(
          tx,
          sql`SELECT (
            EXISTS(SELECT 1 FROM sport_occurrences o WHERE o.series_id=${seriesId} AND (o.status<>'scheduled' OR o.start_at<=now()))
            OR EXISTS(SELECT 1 FROM sport_occurrences o JOIN sport_reservations r ON r.occurrence_id=o.id WHERE o.series_id=${seriesId})
            OR EXISTS(SELECT 1 FROM sport_occurrences o JOIN sport_waitlist w ON w.occurrence_id=o.id WHERE o.series_id=${seriesId})
            OR EXISTS(SELECT 1 FROM sport_occurrences o JOIN sport_conversations c ON c.occurrence_id=o.id WHERE o.series_id=${seriesId})
            OR EXISTS(SELECT 1 FROM sport_invitations i WHERE i.service_id=${serviceId})
          ) locked`,
        );
        if (locked.locked) throw new ConflictException('Backend.seriesLocked');
        const ids = `{${occurrences.map((item) => item.id).join(',')}}`;
        await rows(
          tx,
          sql`DELETE FROM sport_occupancies WHERE occurrence_id=ANY(${ids}::uuid[])`,
        );
        await rows(
          tx,
          sql`DELETE FROM sport_coach_claims WHERE occurrence_id=ANY(${ids}::uuid[])`,
        );
        const intervalMs = input.intervalDays * 24 * 60 * 60 * 1000;
        const updated: Occurrence[] = [];
        for (const [index, item] of occurrences.entries()) {
          const occurrence = await one<Occurrence>(
            tx,
            sql`UPDATE sport_occurrences SET start_at=${new Date(start + index * intervalMs)},end_at=${new Date(end + index * intervalMs)},capacity=${input.capacity},revision=revision+1 WHERE id=${item.id} RETURNING *`,
          );
          if (service.kind === 'class' || service.kind === 'course')
            await this.occupy(tx, service, occurrence);
          else if (service.kind === 'court') {
            await resourceClaims(tx, service);
            await assertResourcesAvailable(tx, occurrence.id);
          }
          if (service.coach_user_id)
            await rows(
              tx,
              sql`INSERT INTO sport_coach_claims(coach_user_id,occurrence_id,period) VALUES(${service.coach_user_id},${occurrence.id},tstzrange(${occurrence.start_at},${occurrence.end_at},'[)'))`,
            );
          updated.push(occurrence);
        }
        const [changed] = await rows<{ revision: number }>(
          tx,
          sql`UPDATE sport_occurrence_series SET interval_days=${input.intervalDays},revision=revision+1,updated_at=now() WHERE id=${seriesId} AND revision=${input.revision} RETURNING revision`,
        );
        if (!changed) throw new ConflictException('Backend.seriesChanged');
        const result: SeriesEditResult = {
          id: seriesId,
          revision: changed.revision,
          occurrences: updated.map((item) => ({
            id: item.id,
            startAt: item.start_at.toISOString(),
            endAt: item.end_at.toISOString(),
            capacity: item.capacity,
          })),
        };
        await rows(
          tx,
          sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${commandKey},${requestHash},${JSON.stringify(result)}::jsonb)`,
        );
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details)
          VALUES(${userId},${service.organization_id},'sports.occurrence-series.edit',${seriesId},${JSON.stringify({ reason: input.reason, previous: occurrences.map((item) => ({ id: item.id, startAt: item.start_at, endAt: item.end_at, capacity: item.capacity })), next: result.occurrences })}::jsonb)`,
        );
        return result;
      });
    } catch (error) {
      const pgCode =
        (error as { code?: string; cause?: { code?: string } }).code ??
        (error as { cause?: { code?: string } }).cause?.code;
      if (
        pgCode === '23505' ||
        pgCode === '23P01' ||
        (error instanceof ConflictException &&
          error.message === 'Backend.resourceConflict')
      )
        throw new ConflictException('Backend.scheduleConflict');
      throw error;
    }
  }
  async editOccurrence(
    userId: string,
    id: string,
    input: OccurrenceEditInput,
    administrator?: Principal,
  ) {
    const commandKey = `occurrence-edit:${input.idempotencyKey}`;
    const requestHash = hash(JSON.stringify({ id, ...input }));
    return this.db
      .transaction(async (tx) => {
        await lockWritableAccount(tx, userId);
        const target = await one<{ service_id: string }>(
          tx,
          sql`SELECT service_id FROM sport_occurrences WHERE id=${id}`,
        );
        await rows(
          tx,
          sql`SELECT id FROM sport_services WHERE id=${target.service_id} FOR UPDATE`,
        );
        const service = await this.service(tx, target.service_id);
        await this.schedulingAccess(tx, userId, service, administrator);
        const [receipt] = await rows<{ request_hash: string; result: unknown }>(
          tx,
          sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${commandKey}`,
        );
        if (receipt) {
          if (receipt.request_hash !== requestHash)
            throw new ConflictException('Backend.scheduleKeyReused');
          return receipt.result;
        }
        const current = await one<
          Occurrence & { revision: number; version_id: string }
        >(tx, sql`SELECT * FROM sport_occurrences WHERE id=${id} FOR UPDATE`);
        if (
          current.revision !== input.revision ||
          current.status !== 'scheduled' ||
          current.start_at <= new Date()
        )
          throw new ConflictException('Backend.seriesChanged');
        const changedTime =
          current.start_at.getTime() !== Date.parse(input.startAt) ||
          current.end_at.getTime() !== Date.parse(input.endAt);
        if (Date.parse(input.startAt) <= Date.now())
          throw new BadRequestException('Backend.scheduleStartInPast');
        const [usage] = await rows<{ reserved: number; locked: boolean }>(
          tx,
          sql`SELECT
        (SELECT count(*)::int FROM sport_reservations WHERE occurrence_id=${id} AND (status='confirmed' OR status IN ('held','pending_approval') AND expires_at>now())) reserved,
        (EXISTS(SELECT 1 FROM sport_reservations WHERE occurrence_id=${id}) OR EXISTS(SELECT 1 FROM sport_waitlist WHERE occurrence_id=${id}) OR EXISTS(SELECT 1 FROM sport_conversations WHERE occurrence_id=${id}) OR EXISTS(SELECT 1 FROM sport_invitations WHERE service_id=${service.id})) locked`,
        );
        if (
          input.capacity < usage.reserved ||
          (changedTime &&
            (usage.locked || current.version_id !== service.version_id))
        )
          throw new ConflictException('Backend.seriesLocked');
        if (service.kind === 'course')
          await this.assertCourseScheduleOpen(tx, service);
        if (changedTime) {
          await rows(
            tx,
            sql`DELETE FROM sport_occupancies WHERE occurrence_id=${id}`,
          );
          await rows(
            tx,
            sql`DELETE FROM sport_coach_claims WHERE occurrence_id=${id}`,
          );
        }
        const result = await one<Occurrence>(
          tx,
          sql`UPDATE sport_occurrences SET start_at=${input.startAt},end_at=${input.endAt},capacity=${input.capacity},revision=revision+1 WHERE id=${id} RETURNING *`,
        );
        if (changedTime) {
          if (service.kind === 'class' || service.kind === 'course')
            await this.occupy(tx, service, result);
          else if (service.kind === 'court') {
            await resourceClaims(tx, service);
            await assertResourcesAvailable(tx, id);
          }
          if (service.coach_user_id)
            await rows(
              tx,
              sql`INSERT INTO sport_coach_claims(coach_user_id,occurrence_id,period) VALUES(${service.coach_user_id},${id},tstzrange(${result.start_at},${result.end_at},'[)'))`,
            );
        }
        await rows(
          tx,
          sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${commandKey},${requestHash},${JSON.stringify(result)}::jsonb)`,
        );
        await rows(
          tx,
          sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${userId},${service.organization_id},'sports.occurrence.edit',${id},${JSON.stringify({ reason: input.reason, previous: current, next: result })}::jsonb)`,
        );
        await rows(
          tx,
          sql`UPDATE sport_occurrence_series SET revision=revision+1,updated_at=now() WHERE id=(SELECT series_id FROM sport_occurrences WHERE id=${id})`,
        );
        return result;
      })
      .catch(scheduleFailure);
  }
  private async occupy(
    tx: Tx,
    service: Service,
    occurrence: Occurrence,
    reservationId?: string,
  ) {
    const units = await resourceClaims(tx, service);
    for (const unit of units)
      await insertResourceClaim(
        tx,
        sql`INSERT INTO sport_occupancies(unit_id,occurrence_id,reservation_id,period) VALUES(${unit.id},${reservationId ? null : occurrence.id},${reservationId ?? null},tstzrange(${occurrence.start_at}::timestamptz-${unit.before}*interval '1 minute',${occurrence.end_at}::timestamptz+${unit.after}*interval '1 minute','[)'))`,
      );
  }
  async resources(userId: string, org: string, branch: string) {
    await this.staff(this.db, userId, org, branch);
    return rows(
      this.db,
      sql`SELECT r.*,ARRAY(SELECT unit_id FROM sport_resource_units WHERE resource_id=r.id ORDER BY unit_id) unit_ids FROM sport_resources r WHERE organization_id=${org} AND branch_id=${branch} ORDER BY name,r.id`,
    );
  }
  async createResource(
    userId: string,
    org: string,
    branch: string,
    name: string,
    unitIds: string[],
    idempotencyKey?: string,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      await this.staff(tx, userId, org, branch);
      await requireBranch(tx, org, branch);
      unitIds = [...new Set(unitIds)].sort();
      const key = `resource-create:${idempotencyKey}`;
      const fingerprint = hash(JSON.stringify({ org, branch, name, unitIds }));
      if (idempotencyKey) {
        await rows(
          tx,
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${key}`},0))`,
        );
        const [previous] = await rows<{
          request_hash: string;
          result: { id: string; name: string };
        }>(
          tx,
          sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${key}`,
        );
        if (previous) {
          if (previous.request_hash !== fingerprint)
            throw new ConflictException('Backend.scheduleKeyReused');
          return previous.result;
        }
      }
      const resource = await one<{ id: string; name: string }>(
        tx,
        sql`INSERT INTO sport_resources(organization_id,branch_id,name) VALUES(${org},${branch},${name}) RETURNING *`,
      );
      if (!unitIds.length)
        unitIds = [
          (
            await one<{ id: string }>(
              tx,
              sql`INSERT INTO sport_conflict_units(organization_id,branch_id,name) VALUES(${org},${branch},${name}) RETURNING id`,
            )
          ).id,
        ];
      for (const unit of unitIds) {
        await one(
          tx,
          sql`SELECT id FROM sport_conflict_units WHERE id=${unit} AND organization_id=${org} AND branch_id=${branch}`,
        );
        await rows(
          tx,
          sql`INSERT INTO sport_resource_units VALUES(${org},${resource.id},${unit})`,
        );
      }
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details)
        VALUES(${userId},${org},'sports.resource.create',${resource.id},${JSON.stringify({ branchId: branch, name, unitIds })}::jsonb)`,
      );
      const result = jsonDto(resource) as { id: string; name: string };
      if (idempotencyKey)
        await rows(
          tx,
          sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${key},${fingerprint},${JSON.stringify(result)}::jsonb)`,
        );
      return result;
    });
  }
  private async expire(tx: Tx) {
    const expired = await rows<{ id: string; membership_id: string | null }>(
      tx,
      sql`UPDATE sport_reservations SET status='expired',revision=revision+1 WHERE status='held' AND expires_at<=now() RETURNING id,membership_id`,
    );
    for (const r of expired) {
      await rows(
        tx,
        sql`UPDATE sport_occupancies SET active=false WHERE reservation_id=${r.id}`,
      );
      if (r.membership_id)
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key) VALUES(${r.membership_id},${r.id},'release',1,${`expire:${r.id}`}) ON CONFLICT DO NOTHING`,
        );
    }
    const orders = await rows<{ id: string }>(
      tx,
      sql`UPDATE sport_orders SET status='cancelled',revision=revision+1 WHERE status='awaiting_payment' AND expires_at<=now() AND NOT EXISTS(SELECT 1 FROM sport_payments p WHERE p.order_id=sport_orders.id AND p.state IN ('pending','unknown')) RETURNING id`,
    );
    for (const order of orders) await retireOrderWaitlistOffers(tx, order.id);
  }
  async quote(
    userId: string,
    input: Omit<z.infer<typeof checkoutSchema>, 'idempotencyKey' | 'quoteId'>,
  ) {
    const service = await this.service(this.db, input.serviceId, true);
    let amount = service.amount_minor;
    if (input.occurrenceId) {
      await one(
        this.db,
        sql`SELECT id FROM sport_occurrences WHERE id=${input.occurrenceId} AND service_id=${input.serviceId} AND status='scheduled' AND start_at>now()`,
      );
      await assertResourcesAvailable(this.db, input.occurrenceId);
    }
    if (input.membershipId) {
      await one(
        this.db,
        sql`SELECT id FROM sport_memberships WHERE id=${input.membershipId} AND user_id=${userId} AND organization_id=${service.organization_id} AND branch_id=${service.branch_id} AND status='active' AND (ends_at IS NULL OR ends_at>now())`,
      );
      amount = '0';
    }
    if (input.coupon && !input.membershipId) {
      const coupon = await one<{ basis_points: number; max_uses: number }>(
        this.db,
        sql`SELECT * FROM sport_coupons WHERE service_id=${input.serviceId} AND code=${input.coupon} AND expires_at>now() AND disabled_at IS NULL`,
      );
      const [usage] = await rows<{ count: number }>(
        this.db,
        sql`SELECT count(*)::int count FROM sport_orders WHERE service_id=${input.serviceId} AND snapshot->>'coupon'=${input.coupon} AND status NOT IN ('cancelled','refunded')`,
      );
      if (usage.count >= coupon.max_uses)
        throw new ConflictException('Coupon limit reached');
      amount = (
        BigInt(amount) - BigInt(basisPoints(amount, coupon.basis_points))
      ).toString();
    }
    const fingerprint = hash(
      JSON.stringify({
        serviceId: input.serviceId,
        occurrenceId: input.occurrenceId ?? null,
        membershipId: input.membershipId ?? null,
        coupon: input.coupon ?? null,
      }),
    );
    const expiresAt = new Date(Date.now() + 120000);
    const quote = await one<{ id: string }>(
      this.db,
      sql`INSERT INTO sport_quotes(user_id,service_id,version_id,input_hash,amount_minor,expires_at) VALUES(${userId},${service.id},${service.version_id},${fingerprint},${amount},${expiresAt}) RETURNING id`,
    );
    const due =
      service.kind !== 'membership' && service.policy.depositBasisPoints > 0
        ? basisPoints(amount, service.policy.depositBasisPoints)
        : amount;
    const [coaching] = await rows<{
      coach_id: string;
      mode: string;
      entry_amount_minor: string;
    }>(
      this.db,
      sql`SELECT coach_id,mode,entry_amount_minor::text FROM coaching_services WHERE service_id=${service.id}`,
    );
    return {
      ...quote,
      coaching: coaching
        ? {
            ...coaching,
            coachingAmountMinor: (
              BigInt(service.amount_minor) - BigInt(coaching.entry_amount_minor)
            ).toString(),
          }
        : null,
      amountMinor: amount,
      payNowMinor: due,
      balanceDueMinor: (BigInt(amount) - BigInt(due)).toString(),
      expiresAt,
      policy: service.policy,
      eligibility: service.eligibility,
      cover: service.cover,
    };
  }
  async checkout(
    userId: string,
    input: z.infer<typeof checkoutSchema>,
    source = 'online',
    holdOnly = false,
    transaction?: Tx,
  ) {
    const execute = async (tx: Tx) => {
      await lockWritableAccount(tx, userId);
      const requestHash = hash(
        JSON.stringify({
          ...input,
          idempotencyKey: undefined,
          source,
          holdOnly,
        }),
      );
      const previous = await rows<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE user_id=${userId} AND idempotency_key=${input.idempotencyKey}`,
      );
      if (previous[0]) {
        if (previous[0].request_hash !== requestHash)
          throw new ConflictException(
            'Idempotency key was already used for another request',
          );
        return this.order(tx, userId, previous[0].id);
      }
      await this.expire(tx);
      const service = await this.service(tx, input.serviceId, true);
      await this.coachingSale(tx, userId, service.id);
      if (service.kind === 'course')
        await rows(
          tx,
          sql`SELECT id FROM sport_services WHERE id=${service.id} FOR SHARE`,
        );
      if (service.kind !== 'membership' && !input.occurrenceId)
        throw new BadRequestException('Select a session');
      if (
        service.kind === 'membership' &&
        (input.occurrenceId || input.membershipId)
      )
        throw new BadRequestException('Invalid membership purchase');
      for (const requirement of service.requirements) {
        const docs = await rows(
          tx,
          sql`SELECT id FROM sport_documents WHERE user_id=${userId} AND service_id=${service.id} AND name=${requirement} AND status='approved' AND (expires_at IS NULL OR expires_at>now())`,
        );
        if (!docs.length)
          throw new ConflictException(`Required document: ${requirement}`);
      }
      let occurrences: Occurrence[] = [];
      if (input.occurrenceId) {
        const selected = await one<Occurrence>(
          tx,
          sql`SELECT * FROM sport_occurrences WHERE id=${input.occurrenceId} AND service_id=${service.id}`,
        );
        occurrences =
          service.kind === 'course'
            ? await rows<Occurrence>(
                tx,
                sql`SELECT * FROM sport_occurrences WHERE service_id=${service.id} AND status='scheduled' ORDER BY id FOR UPDATE`,
              )
            : [
                await one<Occurrence>(
                  tx,
                  sql`SELECT * FROM sport_occurrences WHERE id=${selected.id} FOR UPDATE`,
                ),
              ];
        for (const o of occurrences) {
          if (o.status !== 'scheduled' || o.start_at <= new Date())
            throw new ConflictException('Session is unavailable');
          const [count] = await rows<{ count: number }>(
            tx,
            sql`SELECT count(*)::int count FROM sport_reservations WHERE occurrence_id=${o.id} AND status IN ${active}`,
          );
          if (count.count >= o.capacity)
            throw new ConflictException('Session is full');
        }
      }
      let amount = service.amount_minor;
      if (input.membershipId) {
        const membership = await one<{
          id: string;
          granted: number | null;
          consumed: number;
        }>(
          tx,
          sql`SELECT * FROM sport_memberships WHERE id=${input.membershipId} AND user_id=${userId} AND organization_id=${service.organization_id} AND branch_id=${service.branch_id} AND status='active' AND (ends_at IS NULL OR ends_at>now()) AND version_id IN(SELECT id FROM sport_service_versions WHERE coach_user_id IS NULL OR coach_user_id=${service.coach_user_id}) FOR UPDATE`,
        );
        const [held] = await rows<{ count: number }>(
          tx,
          sql`SELECT count(*)::int count FROM sport_reservations WHERE membership_id=${membership.id} AND consumed=false AND status IN ('held','pending_approval','confirmed')`,
        );
        if (
          membership.granted !== null &&
          membership.consumed + held.count + occurrences.length >
            membership.granted
        )
          throw new ConflictException('No sessions remaining');
        amount = '0';
      }
      if (input.coupon && !input.membershipId) {
        const coupon = await one<{
          id: string;
          basis_points: number;
          max_uses: number;
        }>(
          tx,
          sql`SELECT * FROM sport_coupons WHERE service_id=${service.id} AND code=${input.coupon} AND expires_at>now() AND disabled_at IS NULL FOR UPDATE`,
        );
        const [used] = await rows<{ count: number }>(
          tx,
          sql`SELECT count(*)::int count FROM sport_orders WHERE service_id=${service.id} AND snapshot->>'coupon'=${input.coupon} AND status NOT IN ('cancelled','refunded')`,
        );
        if (used.count >= coupon.max_uses)
          throw new ConflictException('Coupon limit reached');
        amount = (
          BigInt(amount) - BigInt(basisPoints(amount, coupon.basis_points))
        ).toString();
      }
      if (input.quoteId) {
        const quote = await one<{
          version_id: string;
          input_hash: string;
          amount_minor: string;
          expires_at: Date;
        }>(
          tx,
          sql`SELECT * FROM sport_quotes WHERE id=${input.quoteId} AND user_id=${userId}`,
        );
        const expected = hash(
          JSON.stringify({
            serviceId: input.serviceId,
            occurrenceId: input.occurrenceId ?? null,
            membershipId: input.membershipId ?? null,
            coupon: input.coupon ?? null,
          }),
        );
        if (
          quote.expires_at <= new Date() ||
          quote.version_id !== service.version_id ||
          quote.input_hash !== expected ||
          quote.amount_minor !== amount
        )
          throw new ConflictException('Quote changed; review the price again');
      }
      const [coaching] = await rows(
        tx,
        sql`SELECT coach_id,mode,entry_amount_minor::text FROM coaching_services WHERE service_id=${service.id}`,
      );
      const snapshot = {
        coaching: coaching ?? null,
        title: service.title,
        policy: service.policy,
        eligibility: service.eligibility,
        kind: service.kind,
        branchId: service.branch_id,
        durationDays: service.duration_days,
        sessionCount: service.session_count,
        coupon: input.coupon ?? null,
        approvalRequired: service.approval_required,
      };
      const order = await one<Order>(
        tx,
        sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,idempotency_key,request_hash,expires_at) VALUES(${userId},${service.organization_id},${service.id},${service.version_id},${amount},${JSON.stringify(snapshot)}::jsonb,${input.idempotencyKey},${requestHash},now()+interval '10 minutes') RETURNING *`,
      );
      for (const o of occurrences) {
        const r = await one<Reservation>(
          tx,
          sql`INSERT INTO sport_reservations(user_id,occurrence_id,order_id,membership_id,expires_at,source) VALUES(${userId},${o.id},${order.id},${input.membershipId ?? null},${order.expires_at},${source}) RETURNING *`,
        );
        if (service.kind === 'court') await this.occupy(tx, service, o, r.id);
        if (input.membershipId)
          await rows(
            tx,
            sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key) VALUES(${input.membershipId},${r.id},'hold',1,${`hold:${r.id}`})`,
          );
      }
      if (amount === '0' && !holdOnly) await this.fulfil(tx, order);
      await this.event(
        tx,
        'hold.expire',
        order.id,
        `expire:${order.id}`,
        order.expires_at,
      );
      return this.order(tx, userId, order.id);
    };
    return transaction ? execute(transaction) : this.db.transaction(execute);
  }
  private async order(db: Db | Tx, userId: string, id: string) {
    const order = await one<Order>(
      db,
      sql`SELECT * FROM sport_orders WHERE id=${id} AND user_id=${userId}`,
    );
    const reservations = await rows(
      db,
      sql`SELECT r.*,o.start_at,o.end_at,ord.snapshot->>'title' AS title,s.id service_id,s.branch_id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN sport_orders ord ON ord.id=r.order_id WHERE r.order_id=${id} ORDER BY o.start_at`,
    );
    const payments = await rows<{
      id: string;
      provider: string;
      amount_minor: string;
      state: string;
    }>(
      db,
      sql`SELECT id,provider,amount_minor::text,state FROM sport_payments WHERE order_id=${id} ORDER BY created_at,id`,
    );
    const refunds = await rows(
      db,
      sql`SELECT id,amount_minor::text,state,reason FROM sport_refunds WHERE order_id=${id} ORDER BY created_at DESC`,
    );
    const collected = payments
      .filter((p) => p.state === 'verified')
      .reduce((sum, p) => sum + BigInt(p.amount_minor), 0n);
    const balance = BigInt(order.amount_minor) - collected;
    return {
      ...order,
      reservations,
      payments,
      refunds,
      balanceDueMinor: (balance > 0n ? balance : 0n).toString(),
    };
  }
  async myOrder(userId: string, id: string) {
    return this.order(this.db, userId, id);
  }
  async myOrders(userId: string) {
    return rows(
      this.db,
      sql`SELECT id,amount_minor::text,status,created_at,snapshot FROM sport_orders WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 100`,
    );
  }
  async startPayment(
    userId: string,
    id: string,
    scenario: PaymentScenario,
    idempotencyKey: string,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const order = await one<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE id=${id} AND user_id=${userId} FOR UPDATE`,
      );
      const commandKey = `payment:${idempotencyKey}`;
      const requestHash = hash(JSON.stringify({ id, scenario }));
      const [receipt] = await rows<{
        request_hash: string;
        result: { paymentId: string };
      }>(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${commandKey}`,
      );
      if (receipt) {
        if (receipt.request_hash !== requestHash)
          throw new ConflictException('Idempotency key reused');
        return one(
          tx,
          sql`SELECT id,state,provider,scenario FROM sport_payments WHERE id=${receipt.result.paymentId} AND order_id=${id}`,
        );
      }
      const remember = async (payment: Row) => {
        await rows(
          tx,
          sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${commandKey},${requestHash},${JSON.stringify({ paymentId: payment.id })}::jsonb)`,
        );
        return payment;
      };
      if (
        !['awaiting_payment', 'partially_paid'].includes(order.status) ||
        (order.status === 'awaiting_payment' &&
          order.expires_at <= (await databaseNow(tx)))
      )
        throw new ConflictException('Order is unavailable');
      const previous = await rows<{
        id: string;
        state: string;
        provider: string;
        scenario: PaymentScenario;
      }>(
        tx,
        sql`SELECT id,state,provider,scenario FROM sport_payments WHERE order_id=${id} AND state IN ('pending','unknown') ORDER BY created_at DESC LIMIT 1`,
      );
      if (previous[0]) return remember(previous[0]);
      const [received] = await rows<{ amount: string }>(
        tx,
        sql`SELECT coalesce(sum(amount_minor),0)::text amount FROM sport_payments WHERE order_id=${id} AND state='verified'`,
      );
      const total = BigInt(order.amount_minor),
        paid = BigInt(received.amount);
      const initial =
        order.snapshot.kind !== 'membership' &&
        order.snapshot.policy.depositBasisPoints > 0
          ? BigInt(
              basisPoints(
                order.amount_minor,
                order.snapshot.policy.depositBasisPoints,
              ),
            )
          : total;
      const due = paid === 0n && initial > 0n ? initial : total - paid;
      if (due <= 0n) throw new ConflictException('Nothing remains to pay');
      const created = await this.payments.create(
        `${id}:${randomUUID()}`,
        due.toString(),
        scenario,
      );
      const payment = await one(
        tx,
        sql`INSERT INTO sport_payments(order_id,provider,reference,amount_minor,scenario) VALUES(${id},${this.payments.provider},${created.reference},${due.toString()},${scenario}) RETURNING id,state,provider,scenario`,
      );
      await this.event(
        tx,
        'payment.query',
        id,
        `payment:${created.reference}`,
        new Date(),
        {
          paymentId: payment.id,
        },
      );
      return remember(payment);
    });
  }
  async mockPaymentCallback(reference: string, proof: string) {
    if (!this.payments.authenticateCallback(reference, proof))
      throw new ForbiddenException('Invalid payment callback');
    const payment = await one<{
      id: string;
      order_id: string;
      user_id: string;
    }>(
      this.db,
      sql`SELECT p.id,p.order_id,o.user_id FROM sport_payments p JOIN sport_orders o ON o.id=p.order_id WHERE p.reference=${reference} AND p.provider=${this.payments.provider}`,
    );
    return this.verifyPayment(
      payment.user_id,
      payment.order_id,
      false,
      payment.id,
    );
  }
  async verifyPayment(
    userId: string,
    id: string,
    query = false,
    paymentId?: string,
  ) {
    await one<Order>(
      this.db,
      sql`SELECT * FROM sport_orders WHERE id=${id} AND user_id=${userId}`,
    );
    const payment = await one<{
      id: string;
      reference: string;
      amount_minor: string;
      scenario: PaymentScenario;
      state: string;
    }>(
      this.db,
      paymentId
        ? sql`SELECT * FROM sport_payments WHERE id=${paymentId} AND order_id=${id}`
        : sql`SELECT * FROM sport_payments WHERE order_id=${id} ORDER BY created_at DESC,id DESC LIMIT 1`,
    );
    if (payment.state === 'verified') return this.order(this.db, userId, id);
    const state = await this.payments[query ? 'query' : 'verify'](
      payment.reference,
      payment.amount_minor,
      payment.scenario,
    );
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const order = await one<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE id=${id} AND user_id=${userId} FOR UPDATE`,
      );
      const current = await one<{ state: string }>(
        tx,
        sql`SELECT state FROM sport_payments WHERE id=${payment.id} FOR UPDATE`,
      );
      if (current.state === 'verified') return this.order(tx, userId, id);
      await rows(
        tx,
        sql`UPDATE sport_payments SET state=${state},verified_at=${state === 'verified' ? sql`clock_timestamp()` : null} WHERE id=${payment.id}`,
      );
      if (state === 'verified') {
        await this.journal(
          tx,
          order,
          `payment:${payment.id}`,
          payment.amount_minor,
          'cash',
          'service-liability',
        );
        const reservations = await rows<Reservation>(
          tx,
          sql`SELECT * FROM sport_reservations WHERE order_id=${id} ORDER BY occurrence_id FOR UPDATE`,
        );
        const occurrences: Occurrence[] = [];
        for (const r of reservations)
          occurrences.push(
            await one<Occurrence>(
              tx,
              sql`SELECT * FROM sport_occurrences WHERE id=${r.occurrence_id} FOR UPDATE`,
            ),
          );
        const now = await databaseNow(tx);
        const unavailable =
          !['awaiting_payment', 'partially_paid'].includes(order.status) ||
          (order.status === 'awaiting_payment' && order.expires_at <= now) ||
          reservations.some(
            (r, index) =>
              occurrences[index].status !== 'scheduled' ||
              occurrences[index].start_at <= now ||
              ['cancelled', 'expired'].includes(r.status),
          );
        if (unavailable) {
          await rows(
            tx,
            sql`UPDATE sport_orders SET status='review',revision=revision+1 WHERE id=${id}`,
          );
          await this.releaseOrder(tx, order, 'expired');
          await this.requestRefund(
            tx,
            id,
            payment.amount_minor,
            'Payment verified after capacity hold expired',
            `late:${payment.id}`,
          );
          await this.event(tx, 'payment.late', id, `late:${payment.id}`);
        } else await this.fulfil(tx, order);
      } else if (
        state === 'failed' &&
        order.status === 'awaiting_payment' &&
        order.expires_at <= (await databaseNow(tx))
      ) {
        await this.releaseOrder(tx, order, 'expired');
        await rows(
          tx,
          sql`UPDATE sport_orders SET status='cancelled',revision=revision+1 WHERE id=${id}`,
        );
      }
      return this.order(tx, userId, id);
    });
  }
  private async fulfil(tx: Tx, order: Order) {
    const [received] = await rows<{ amount: string }>(
      tx,
      sql`SELECT coalesce(sum(amount_minor),0)::text amount FROM sport_payments WHERE order_id=${order.id} AND state='verified'`,
    );
    const paid = BigInt(received.amount) >= BigInt(order.amount_minor);
    await rows(
      tx,
      sql`UPDATE sport_orders SET status=${paid ? 'paid' : 'partially_paid'},revision=revision+1 WHERE id=${order.id}`,
    );
    await rows(
      tx,
      sql`UPDATE sport_reservations SET status=${order.snapshot.approvalRequired ? 'pending_approval' : 'confirmed'},revision=revision+1 WHERE order_id=${order.id} AND status='held'`,
    );
    if (order.snapshot.kind === 'membership' && paid) {
      const existing = await rows(
        tx,
        sql`SELECT id FROM sport_memberships WHERE order_id=${order.id}`,
      );
      if (!existing.length) {
        const membership = await one<{ id: string }>(
          tx,
          sql`INSERT INTO sport_memberships(user_id,service_id,version_id,organization_id,branch_id,status,ends_at,granted,order_id) VALUES(${order.user_id},${order.service_id},${order.version_id},${order.organization_id},${order.snapshot.branchId},'active',${order.snapshot.durationDays ? new Date(Date.now() + order.snapshot.durationDays * 86400000) : null},${order.snapshot.sessionCount},${order.id}) RETURNING id`,
        );
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,kind,quantity,source_key) VALUES(${membership.id},'grant',${order.snapshot.sessionCount ?? 0},${`grant:${order.id}`})`,
        );
        await this.event(
          tx,
          'membership.issued',
          membership.id,
          `membership:${order.id}`,
        );
      }
    }
    if (order.snapshot.policy.consumeOn === 'confirmation') {
      const reservations = await rows<Reservation>(
        tx,
        sql`SELECT * FROM sport_reservations WHERE order_id=${order.id} AND status='confirmed' ORDER BY id`,
      );
      for (const r of reservations) await this.consume(tx, r);
    }
    await scheduleReservationReminders(tx, order.id);
    await this.event(tx, 'order.confirmed', order.id, `confirmed:${order.id}`);
  }
  private async consume(tx: Tx, r: Reservation) {
    if (!r.membership_id || r.consumed) return;
    await rows(
      tx,
      sql`SELECT id FROM sport_memberships WHERE id=${r.membership_id} FOR UPDATE`,
    );
    await rows(
      tx,
      sql`UPDATE sport_memberships SET consumed=consumed+1,revision=revision+1 WHERE id=${r.membership_id}`,
    );
    await rows(
      tx,
      sql`UPDATE sport_reservations SET consumed=true WHERE id=${r.id}`,
    );
    await rows(
      tx,
      sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key) VALUES(${r.membership_id},${r.id},'consume',1,${`consume:${r.id}`}) ON CONFLICT DO NOTHING`,
    );
  }
  private async journal(
    tx: Tx,
    order: Order,
    key: string,
    amount: string,
    debit: string,
    credit: string,
  ) {
    if (BigInt(amount) === 0n) return;
    const journals = await rows<{ id: string }>(
      tx,
      sql`INSERT INTO sport_journals(organization_id,order_id,source_key) VALUES(${order.organization_id},${order.id},${key}) ON CONFLICT DO NOTHING RETURNING id`,
    );
    if (journals[0])
      await rows(
        tx,
        sql`INSERT INTO sport_journal_lines(journal_id,account,debit_minor,credit_minor) VALUES(${journals[0].id},${debit},${amount},0),(${journals[0].id},${credit},0,${amount})`,
      );
  }
  async event(
    db: Db | Tx,
    kind: string,
    id: string,
    key: string,
    dueAt?: Date,
    payload: Row = {},
  ) {
    await rows(
      db,
      sql`INSERT INTO sport_outbox(kind,aggregate_id,source_key,payload,due_at) VALUES(${kind},${id},${key},${JSON.stringify(payload)}::jsonb,${dueAt ?? sql`now()`}) ON CONFLICT DO NOTHING`,
    );
  }
  private bookingSelection(userId: string, id?: string) {
    return sql`SELECT r.*,o.start_at,o.end_at,ord.snapshot->>'title' AS title,s.id service_id,s.branch_id,b.name branch_name,ord.snapshot,ord.amount_minor::text
      FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id
      JOIN sport_services s ON s.id=o.service_id JOIN branches b ON b.id=s.branch_id
      JOIN sport_orders ord ON ord.id=r.order_id WHERE r.user_id=${userId}
      ${id ? sql`AND r.id=${id}` : sql``}`;
  }
  async bookings(userId: string) {
    return rows(
      this.db,
      sql`${this.bookingSelection(userId)} ORDER BY o.start_at DESC,r.id DESC LIMIT 100`,
    );
  }
  async booking(userId: string, id: string) {
    const [booking] = await rows(this.db, this.bookingSelection(userId, id));
    if (!booking) throw new NotFoundException('Backend.bookingNotFound');
    return booking;
  }
  async bookingPage(userId: string, input: BookingPageInput) {
    const cursor = input.cursor
      ? decodeBookingCursor(input.cursor, userId, input.tab)
      : null;
    const asOf = cursor?.asOf ?? new Date().toISOString();
    const upcoming = sql`q.status IN ('held','pending_approval','confirmed') AND q.end_at>${asOf}::timestamptz`;
    const membership =
      input.tab === 'upcoming' ? upcoming : sql`NOT (${upcoming})`;
    const direction = input.tab === 'upcoming' ? sql`ASC` : sql`DESC`;
    const after = !cursor
      ? sql`true`
      : input.tab === 'upcoming'
        ? sql`(q.start_at,q.id)>(${cursor.startAt}::timestamptz,${cursor.id}::uuid)`
        : sql`(q.start_at,q.id)<(${cursor.startAt}::timestamptz,${cursor.id}::uuid)`;
    const result = await rows<Row & { id: string; cursor_start: string }>(
      this.db,
      sql`SELECT q.*,to_char(q.start_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') cursor_start
        FROM (${this.bookingSelection(userId)}) q WHERE (${membership}) AND (${after})
        ORDER BY q.start_at ${direction},q.id ${direction} LIMIT ${input.limit + 1}`,
    );
    const page = result.slice(0, input.limit);
    const last = page.at(-1);
    return {
      items: page.map(({ cursor_start, ...booking }) => {
        void cursor_start;
        return booking;
      }),
      nextCursor:
        result.length > input.limit && last
          ? encodeBookingCursor({
              userId,
              tab: input.tab,
              asOf,
              startAt: last.cursor_start,
              id: last.id,
            })
          : null,
    };
  }
  private async receipt(
    tx: Tx,
    userId: string,
    key: string | undefined,
    input: unknown,
  ) {
    if (!key) return null;
    const requestHash = hash(JSON.stringify(input));
    const existing = await rows<{
      request_hash: string;
      result: { orderId: string };
    }>(
      tx,
      sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${userId} AND command_key=${key}`,
    );
    if (existing[0]) {
      if (existing[0].request_hash !== requestHash)
        throw new ConflictException('Idempotency key reused');
      return existing[0].result.orderId;
    }
    return null;
  }
  private async recordCommand(
    tx: Tx,
    userId: string,
    key: string | undefined,
    input: unknown,
    orderId: string,
  ) {
    if (key)
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${userId},${key},${hash(JSON.stringify(input))},${JSON.stringify({ orderId })}::jsonb)`,
      );
  }
  private async cancellation(db: Db | Tx, userId: string, id: string) {
    const r = await one<Reservation>(
      db,
      sql`SELECT * FROM sport_reservations WHERE id=${id} AND user_id=${userId}`,
    );
    const order = await one<Order>(
      db,
      sql`SELECT * FROM sport_orders WHERE id=${r.order_id}`,
    );
    const [first] = await rows<{ start_at: Date }>(
      db,
      sql`SELECT min(o.start_at) start_at FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE r.order_id=${order.id}`,
    );
    const early =
      first.start_at.getTime() - Date.now() >=
      order.snapshot.policy.cancellationHours * 3600000;
    const [funds] = await rows<{ paid: string; refunded: string }>(
      db,
      sql`SELECT (SELECT coalesce(sum(amount_minor),0)::text FROM sport_payments WHERE order_id=${order.id} AND state='verified') paid,(SELECT coalesce(sum(amount_minor),0)::text FROM sport_refunds WHERE order_id=${order.id} AND state<>'failed') refunded`,
    );
    const refundable =
      BigInt(
        basisPoints(
          funds.paid,
          early ? 10000 : order.snapshot.policy.lateRefundBasisPoints,
        ),
      ) - BigInt(funds.refunded);
    return {
      revision: r.revision,
      refundMinor: (refundable > 0n ? refundable : 0n).toString(),
      restoreSession: early || !order.snapshot.policy.noShowConsumesSession,
      terms: order.snapshot.policy.terms,
    };
  }
  async cancelPreview(userId: string, id: string) {
    return this.cancellation(this.db, userId, id);
  }
  private async releaseOrder(
    tx: Tx,
    order: Order,
    status = 'cancelled',
    restore = true,
  ) {
    const reservations = await rows<Reservation>(
      tx,
      sql`SELECT * FROM sport_reservations WHERE order_id=${order.id} AND status IN ('held','pending_approval','confirmed') ORDER BY occurrence_id FOR UPDATE`,
    );
    for (const r of reservations) {
      if (!restore && r.membership_id && !r.consumed) await this.consume(tx, r);
      await rows(
        tx,
        sql`UPDATE sport_reservations SET status=${status},revision=revision+1 WHERE id=${r.id}`,
      );
      await retireReservationReminders(tx, r.id);
      await rows(
        tx,
        sql`UPDATE sport_occupancies SET active=false WHERE reservation_id=${r.id}`,
      );
      if (r.membership_id) {
        await rows(
          tx,
          sql`SELECT id FROM sport_memberships WHERE id=${r.membership_id} FOR UPDATE`,
        );
        if (r.consumed && restore)
          await rows(
            tx,
            sql`UPDATE sport_memberships SET consumed=consumed-1,revision=revision+1 WHERE id=${r.membership_id}`,
          );
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key) VALUES(${r.membership_id},${r.id},${r.consumed && restore ? 'restore' : 'release'},1,${`${status}:${r.id}`}) ON CONFLICT DO NOTHING`,
        );
      }
    }
    await retireOrderWaitlistOffers(tx, order.id);
    await retireOrderNotices(tx, order.id, ['order.confirmed']);
  }
  async cancel(
    userId: string,
    id: string,
    revision: number,
    expectedRefundMinor?: string,
    commandKey?: string,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const input = { action: 'cancel', id, revision, expectedRefundMinor };
      const repeated = await this.receipt(tx, userId, commandKey, input);
      if (repeated) return this.order(tx, userId, repeated);
      const r = await one<Reservation>(
        tx,
        sql`SELECT * FROM sport_reservations WHERE id=${id} AND user_id=${userId}`,
      );
      const order = await one<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE id=${r.order_id} FOR UPDATE`,
      );
      const current = await one<Reservation>(
        tx,
        sql`SELECT * FROM sport_reservations WHERE id=${id} FOR UPDATE`,
      );
      if (current.status === 'cancelled')
        return this.order(tx, userId, order.id);
      const preview = await this.cancellation(tx, userId, id);
      if (
        expectedRefundMinor !== undefined &&
        expectedRefundMinor !== preview.refundMinor
      )
        throw new ConflictException('Cancellation price changed; review again');
      if (current.revision !== revision)
        throw new ConflictException('Booking changed');
      if (!['held', 'confirmed', 'pending_approval'].includes(current.status))
        throw new ConflictException('Booking cannot be cancelled');
      await this.releaseOrder(tx, order, 'cancelled', preview.restoreSession);
      await this.requestRefund(
        tx,
        order.id,
        preview.refundMinor,
        'athlete cancellation',
        `cancel:${order.id}`,
        id,
      );
      if (['awaiting_payment', 'partially_paid', 'paid'].includes(order.status))
        await rows(
          tx,
          sql`UPDATE sport_orders SET status='cancelled',revision=revision+1 WHERE id=${order.id}`,
        );
      await this.event(tx, 'reservation.cancelled', id, `cancelled:${id}`);
      await this.recordCommand(tx, userId, commandKey, input, order.id);
      return this.order(tx, userId, order.id);
    });
  }
  async reschedule(
    userId: string,
    id: string,
    revision: number,
    targetId: string,
    commandKey?: string,
  ) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const input = { action: 'reschedule', id, revision, targetId };
      const repeated = await this.receipt(tx, userId, commandKey, input);
      if (repeated) return this.order(tx, userId, repeated);
      const r = await one<Reservation>(
        tx,
        sql`SELECT * FROM sport_reservations WHERE id=${id} AND user_id=${userId}`,
      );
      const occurrences = await rows<Occurrence>(
        tx,
        sql`SELECT * FROM sport_occurrences WHERE id IN(${r.occurrence_id},${targetId}) ORDER BY id FOR UPDATE`,
      );
      const target = occurrences.find((o) => o.id === targetId);
      const current = await one<Reservation>(
        tx,
        sql`SELECT * FROM sport_reservations WHERE id=${id} FOR UPDATE`,
      );
      const order = await one<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE id=${r.order_id}`,
      );
      if (order.snapshot.kind === 'course')
        throw new ConflictException('Reschedule the course through support');
      if (
        !target ||
        target.service_id !== order.service_id ||
        target.status !== 'scheduled' ||
        target.start_at <= new Date() ||
        current.status !== 'confirmed' ||
        current.revision !== revision
      )
        throw new ConflictException('Reschedule unavailable');
      const [used] = await rows<{ count: number }>(
        tx,
        sql`SELECT count(*)::int count FROM sport_reservations WHERE occurrence_id=${targetId} AND status IN ${active}`,
      );
      if (used.count >= target.capacity)
        throw new ConflictException('Session is full');
      await rows(
        tx,
        sql`UPDATE sport_occupancies SET active=false WHERE reservation_id=${id}`,
      );
      const service = await this.service(tx, order.service_id);
      if (service.kind === 'court') await this.occupy(tx, service, target, id);
      await rows(
        tx,
        sql`UPDATE sport_reservations SET occurrence_id=${targetId},revision=revision+1 WHERE id=${id}`,
      );
      await scheduleReservationReminders(tx, order.id);
      await this.event(
        tx,
        'reservation.changed',
        id,
        `change:${id}:${revision}`,
      );
      await this.recordCommand(tx, userId, commandKey, input, order.id);
      return this.order(tx, userId, order.id);
    });
  }
  async cancelHostedOrder(tx: Tx, id: string, reason: string) {
    const order = await one<Order>(
      tx,
      sql`SELECT * FROM sport_orders WHERE id=${id} FOR UPDATE`,
    );
    await this.releaseOrder(tx, order);
    const [funds] = await rows<{ paid: string; reserved: string }>(
      tx,
      sql`SELECT (SELECT coalesce(sum(amount_minor),0)::text FROM sport_payments WHERE order_id=${id} AND state='verified') paid,(SELECT coalesce(sum(amount_minor),0)::text FROM sport_refunds WHERE order_id=${id} AND state<>'failed') reserved`,
    );
    const refund = BigInt(funds.paid) - BigInt(funds.reserved);
    await this.requestRefund(
      tx,
      id,
      refund.toString(),
      reason,
      `host-cancel:${id}`,
    );
    if (!['refunded', 'partially_refunded'].includes(order.status))
      await rows(
        tx,
        sql`UPDATE sport_orders SET status='cancelled',revision=revision+1 WHERE id=${id}`,
      );
    await this.event(tx, 'order.cancelled', id, `host-cancel-notice:${id}`);
  }
  async approveHostedOrder(tx: Tx, id: string) {
    const order = await one<Order>(
      tx,
      sql`SELECT * FROM sport_orders WHERE id=${id} FOR UPDATE`,
    );
    if (!['paid', 'partially_paid'].includes(order.status))
      throw new ConflictException('Order unavailable');
    const reservations = await rows<Reservation>(
      tx,
      sql`UPDATE sport_reservations SET status='confirmed',revision=revision+1 WHERE order_id=${id} AND status='pending_approval' RETURNING *`,
    );
    if (!reservations.length) return;
    await retireOrderNotices(tx, id, ['order.confirmed']);
    if (order.snapshot.policy.consumeOn === 'confirmation')
      for (const r of reservations) await this.consume(tx, r);
    await scheduleReservationReminders(tx, id);
    await this.event(tx, 'order.confirmed', id, `approved:${id}`);
  }
  async memberships(userId: string) {
    return rows(
      this.db,
      sql`SELECT m.*,v.title,v.policy,v.amount_minor::text,(SELECT count(*)::int FROM sport_reservations r WHERE r.membership_id=m.id AND r.consumed=false AND r.status IN ('held','pending_approval','confirmed')) held FROM sport_memberships m JOIN sport_service_versions v ON v.id=m.version_id WHERE m.user_id=${userId} ORDER BY m.created_at DESC LIMIT 100`,
    );
  }
  async membership(userId: string, id: string) {
    const membership = (await this.memberships(userId)).find(
      (m) => m.id === id,
    );
    if (!membership) throw new NotFoundException('Membership not found');
    return {
      ...membership,
      events: await rows(
        this.db,
        sql`SELECT * FROM sport_entitlement_events WHERE membership_id=${id} ORDER BY created_at DESC LIMIT 100`,
      ),
    };
  }
  async freeze(userId: string, id: string, revision: number, days: number) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const m = await one<{
        version_id: string;
        status: string;
        revision: number;
        frozen_days: number;
      }>(
        tx,
        sql`SELECT * FROM sport_memberships WHERE id=${id} AND user_id=${userId} FOR UPDATE`,
      );
      const v = await one<{ policy: ServicePolicy }>(
        tx,
        sql`SELECT policy FROM sport_service_versions WHERE id=${m.version_id}`,
      );
      const rs = await rows(
        tx,
        sql`SELECT id FROM sport_reservations WHERE membership_id=${id} AND status IN ${active}`,
      );
      if (
        m.status !== 'active' ||
        m.revision !== revision ||
        m.frozen_days + days > v.policy.freezeDays ||
        rs.length
      )
        throw new ConflictException('Freeze unavailable');
      return one(
        tx,
        sql`UPDATE sport_memberships SET status='frozen',frozen_days=frozen_days+${days},freeze_until=now()+${days}*interval '1 day',ends_at=ends_at+${days}*interval '1 day',revision=revision+1 WHERE id=${id} RETURNING *`,
      );
    });
  }
  async waitlist(userId: string, occurrenceId?: string) {
    if (occurrenceId) {
      await one(
        this.db,
        sql`SELECT o.id FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE o.id=${occurrenceId} AND s.status='published' AND s.kind IN ('class','course') AND o.start_at>now()`,
      );
      await rows(
        this.db,
        sql`INSERT INTO sport_waitlist(user_id,occurrence_id) VALUES(${userId},${occurrenceId}) ON CONFLICT(user_id,occurrence_id) DO UPDATE SET status=CASE WHEN sport_waitlist.status IN ('withdrawn','expired') THEN 'waiting' ELSE sport_waitlist.status END`,
      );
    }
    return rows(
      this.db,
      sql`SELECT w.*,v.title,o.start_at,o.service_id FROM sport_waitlist w JOIN sport_occurrences o ON o.id=w.occurrence_id JOIN sport_service_versions v ON v.id=o.version_id WHERE w.user_id=${userId} AND w.status NOT IN ('withdrawn','expired') ORDER BY w.created_at LIMIT 100`,
    );
  }
  async withdraw(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const w = await one<{ order_id: string | null; status: string }>(
        tx,
        sql`SELECT * FROM sport_waitlist WHERE id=${id} AND user_id=${userId} FOR UPDATE`,
      );
      if (w.status === 'accepted')
        throw new ConflictException('Cancel the booking instead');
      if (w.order_id) {
        const order = await one<Order>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${w.order_id} FOR UPDATE`,
        );
        await this.releaseOrder(tx, order);
        await rows(
          tx,
          sql`UPDATE sport_orders SET status='cancelled',revision=revision+1 WHERE id=${order.id}`,
        );
      }
      await rows(
        tx,
        sql`UPDATE sport_waitlist SET status='withdrawn' WHERE id=${id}`,
      );
      await retireWaitlistOffer(tx, id);
      return { ok: true };
    });
  }
  async acceptOffer(userId: string, id: string) {
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      const w = await one<{
        order_id: string;
        status: string;
        offer_expires_at: Date;
      }>(
        tx,
        sql`SELECT * FROM sport_waitlist WHERE id=${id} AND user_id=${userId} FOR UPDATE`,
      );
      if (w.status === 'accepted') return this.order(tx, userId, w.order_id);
      if (
        w.status !== 'offered' ||
        w.offer_expires_at <= (await databaseNow(tx))
      )
        throw new ConflictException('Offer expired');
      const order = await one<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE id=${w.order_id} FOR UPDATE`,
      );
      if (order.status !== 'awaiting_payment')
        throw new ConflictException('Offer unavailable');
      await rows(
        tx,
        sql`UPDATE sport_waitlist SET status='accepted' WHERE id=${id}`,
      );
      await retireWaitlistOffer(tx, id);
      if (order.amount_minor === '0') await this.fulfil(tx, order);
      return this.order(tx, userId, order.id);
    });
  }
  private async offerWaitlist() {
    await this.db.transaction(async (tx) => {
      const expired = await rows<{ id: string }>(
        tx,
        sql`UPDATE sport_waitlist SET status='expired' WHERE status='offered' AND offer_expires_at<=now() RETURNING id`,
      );
      for (const offer of expired) await retireWaitlistOffer(tx, offer.id);
    });
    const candidates = await rows<{
      id: string;
      user_id: string;
      occurrence_id: string;
      service_id: string;
    }>(
      this.db,
      sql`SELECT w.*,o.service_id FROM sport_waitlist w JOIN sport_occurrences o ON o.id=w.occurrence_id WHERE w.status='waiting' AND o.start_at>now() AND o.status='scheduled' ORDER BY w.created_at,w.id LIMIT 30`,
    );
    for (const w of candidates) {
      try {
        await this.db.transaction(async (tx) => {
          await lockWritableAccount(tx, w.user_id);
          const current = await one<{ status: string }>(
            tx,
            sql`SELECT status FROM sport_waitlist WHERE id=${w.id} FOR UPDATE SKIP LOCKED`,
          );
          if (current.status !== 'waiting') return;
          const earlier = await rows(
            tx,
            sql`SELECT id FROM sport_waitlist WHERE occurrence_id=${w.occurrence_id} AND status='waiting' AND (created_at,id)<(SELECT created_at,id FROM sport_waitlist WHERE id=${w.id}) LIMIT 1`,
          );
          if (earlier.length) return;
          const order = await this.checkout(
            w.user_id,
            {
              serviceId: w.service_id,
              occurrenceId: w.occurrence_id,
              idempotencyKey: `waitlist:${w.id}`,
            },
            'waitlist',
            true,
            tx,
          );
          await rows(
            tx,
            sql`UPDATE sport_waitlist SET status='offered',order_id=${order.id},offer_expires_at=${order.expires_at} WHERE id=${w.id}`,
          );
          await this.event(tx, 'waitlist.offered', w.id, `offer:${w.id}`);
        });
      } catch (error) {
        if (!(
          error instanceof ConflictException ||
          error instanceof NotFoundException
        ))
          throw error;
      }
    }
  }
  async captureCash(userId: string, id: string, reason: string) {
    return this.db.transaction(async (tx) => {
      const order = await one<Order>(
        tx,
        sql`SELECT * FROM sport_orders WHERE id=${id} FOR UPDATE`,
      );
      await this.staff(
        tx,
        userId,
        order.organization_id,
        order.snapshot.branchId,
        ['owner', 'manager', 'receptionist'],
      );
      if (order.status === 'paid') return this.order(tx, order.user_id, id);
      if (
        !['awaiting_payment', 'partially_paid'].includes(order.status) ||
        (order.status === 'awaiting_payment' &&
          order.expires_at <= (await databaseNow(tx)))
      )
        throw new ConflictException('Order unavailable');
      const pending = await rows(
        tx,
        sql`SELECT id FROM sport_payments WHERE order_id=${id} AND state IN ('pending','unknown')`,
      );
      if (pending.length)
        throw new ConflictException(
          'Reconcile the pending gateway attempt first',
        );
      const [received] = await rows<{ amount: string }>(
        tx,
        sql`SELECT coalesce(sum(amount_minor),0)::text amount FROM sport_payments WHERE order_id=${id} AND state='verified'`,
      );
      const amount = (
        BigInt(order.amount_minor) - BigInt(received.amount)
      ).toString();
      const payment = await one<{ id: string }>(
        tx,
        sql`INSERT INTO sport_payments(order_id,provider,reference,amount_minor,scenario,state,actor_id,verified_at) VALUES(${id},'cash',${`cash:${id}:${received.amount}`},${amount},'success','verified',${userId},now()) RETURNING id`,
      );
      await this.journal(
        tx,
        order,
        `payment:${payment.id}`,
        amount,
        'cash',
        'service-liability',
      );
      await this.fulfil(tx, order);
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${userId},${order.organization_id},'sports.payment.cash',${id},${JSON.stringify({ reason })}::jsonb)`,
      );
      return this.order(tx, order.user_id, id);
    });
  }
  async ticket(userId: string, reference: string, membership = false) {
    if (membership)
      await one(
        this.db,
        sql`SELECT id FROM sport_memberships WHERE id=${reference} AND user_id=${userId} AND status='active' AND (ends_at IS NULL OR ends_at>now())`,
      );
    else {
      const booking = await one<{
        start_at: Date;
        end_at: Date;
        occurrence_status: string;
      }>(
        this.db,
        sql`SELECT o.start_at,o.end_at,o.status occurrence_status FROM sport_reservations r JOIN sport_orders ord ON ord.id=r.order_id JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE r.id=${reference} AND r.user_id=${userId} AND r.status='confirmed' AND ord.status='paid'`,
      );
      if (
        booking.occurrence_status !== 'scheduled' ||
        !entryWindow(booking.start_at, booking.end_at)
      )
        throw new ConflictException('Ticket is available near the session');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 60000);
    await rows(
      this.db,
      sql`INSERT INTO sport_access_tokens(user_id,reservation_id,membership_id,token_hash,expires_at) VALUES(${userId},${membership ? null : reference},${membership ? reference : null},${hash(token)},${expiresAt})`,
    );
    return { token, expiresAt };
  }
  async reception(userId: string, org: string, branch: string) {
    await this.staff(this.db, userId, org, branch, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT r.*,ord.snapshot->>'title' AS title,o.start_at,o.end_at,u.display_name,ord.status payment_status FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN sport_orders ord ON ord.id=r.order_id JOIN users u ON u.id=r.user_id WHERE s.organization_id=${org} AND s.branch_id=${branch} AND o.end_at>now()-interval '1 day' ORDER BY o.start_at LIMIT 100`,
    );
  }
  async receptionVisits(userId: string, org: string, branch: string) {
    await this.staff(this.db, userId, org, branch, [
      'owner',
      'manager',
      'receptionist',
    ]);
    return rows(
      this.db,
      sql`SELECT v.id,v.user_id,v.branch_id,v.created_at,v.exited_at,v.reason,v.exit_reason,u.display_name FROM sport_visits v JOIN users u ON u.id=v.user_id WHERE v.branch_id=${branch} AND v.created_at>=now()-interval '1 day' ORDER BY v.created_at DESC LIMIT 100`,
    );
  }
  async checkIn(userId: string, token: string, reason: string) {
    return this.db.transaction(async (tx) => {
      const t = await one<{
        id: string;
        user_id: string;
        reservation_id: string | null;
        membership_id: string | null;
        expires_at: Date;
        consumed_at: Date | null;
      }>(
        tx,
        sql`SELECT * FROM sport_access_tokens WHERE token_hash=${hash(token)} FOR UPDATE`,
      );
      if (t.expires_at <= new Date())
        throw new ConflictException('Ticket expired');
      let reservation: Reservation | undefined;
      let org: string, branch: string;
      if (t.reservation_id) {
        reservation = await one<Reservation>(
          tx,
          sql`SELECT * FROM sport_reservations WHERE id=${t.reservation_id} FOR UPDATE`,
        );
        const service = await one<Service>(
          tx,
          sql`SELECT s.* FROM sport_services s JOIN sport_occurrences o ON o.service_id=s.id WHERE o.id=${reservation.occurrence_id}`,
        );
        org = service.organization_id;
        branch = service.branch_id;
        const paymentOrder = await one<Order>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${reservation.order_id}`,
        );
        if (paymentOrder.status !== 'paid')
          throw new ConflictException(
            'Pay the outstanding balance before attendance',
          );
        if (!['confirmed', 'completed'].includes(reservation.status))
          throw new ConflictException('Booking unavailable');
        const occurrence = await one<{
          start_at: Date;
          end_at: Date;
          status: string;
        }>(
          tx,
          sql`SELECT start_at,end_at,status FROM sport_occurrences WHERE id=${reservation.occurrence_id}`,
        );
        if (
          occurrence.status !== 'scheduled' ||
          !entryWindow(occurrence.start_at, occurrence.end_at)
        )
          throw new ConflictException('Session entry window is closed');
      } else {
        const m = await one<{ organization_id: string; branch_id: string }>(
          tx,
          sql`SELECT * FROM sport_memberships WHERE id=${t.membership_id} AND status='active' AND (ends_at IS NULL OR ends_at>now()) FOR UPDATE`,
        );
        org = m.organization_id;
        branch = m.branch_id;
      }
      await this.staff(tx, userId, org, branch, [
        'owner',
        'manager',
        'receptionist',
      ]);
      if (t.consumed_at)
        return one(tx, sql`SELECT * FROM sport_visits WHERE token_id=${t.id}`);
      const visit = await one<{ id: string }>(
        tx,
        sql`INSERT INTO sport_visits(user_id,branch_id,token_id,actor_id,reason) VALUES(${t.user_id},${branch},${t.id},${userId},${reason}) RETURNING *`,
      );
      await rows(
        tx,
        sql`UPDATE sport_access_tokens SET consumed_at=now() WHERE id=${t.id}`,
      );
      if (reservation) {
        await this.consume(tx, reservation);
        await rows(
          tx,
          sql`INSERT INTO sport_attendance(reservation_id,visit_id,actor_id,status,reason) VALUES(${reservation.id},${visit.id},${userId},'present',${reason}) ON CONFLICT DO NOTHING`,
        );
        await rows(
          tx,
          sql`UPDATE sport_reservations SET status='completed',revision=revision+1 WHERE id=${reservation.id}`,
        );
        await retireReservationReminders(tx, reservation.id);
      }
      return visit;
    });
  }
  async exitVisit(userId: string, id: string, reason: string) {
    return this.db.transaction(async (tx) => {
      const visit = await one<{
        branch_id: string;
        organization_id: string;
        exited_at: Date | null;
      }>(
        tx,
        sql`SELECT v.*,b.organization_id FROM sport_visits v JOIN branches b ON b.id=v.branch_id WHERE v.id=${id} FOR UPDATE OF v`,
      );
      await this.staff(tx, userId, visit.organization_id, visit.branch_id, [
        'owner',
        'manager',
        'receptionist',
      ]);
      if (visit.exited_at)
        return one(tx, sql`SELECT * FROM sport_visits WHERE id=${id}`);
      return one(
        tx,
        sql`UPDATE sport_visits SET exited_at=now(),exit_actor_id=${userId},exit_reason=${reason} WHERE id=${id} RETURNING *`,
      );
    });
  }
  async report(userId: string, org: string, branch: string) {
    await this.staff(this.db, userId, org, branch, [
      'owner',
      'manager',
      'accountant',
    ]);
    return one(
      this.db,
      sql`SELECT
    (SELECT coalesce(sum(amount_minor),0)::text FROM sport_orders WHERE organization_id=${org} AND snapshot->>'branchId'=${branch} AND status IN ('paid','partially_refunded','refunded','review')) sales_minor,
    (SELECT coalesce(sum(p.amount_minor),0)::text FROM sport_payments p JOIN sport_orders o ON o.id=p.order_id WHERE o.organization_id=${org} AND o.snapshot->>'branchId'=${branch} AND p.state='verified') collected_minor,
    (SELECT count(*)::int FROM sport_attendance a JOIN sport_reservations r ON r.id=a.reservation_id JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${org} AND s.branch_id=${branch} AND a.status='present') attendance_count`,
    );
  }
  private async closeMissedSessions(tx: Tx) {
    const missed = await rows<Reservation & { policy: ServicePolicy }>(
      tx,
      sql`SELECT r.*,ord.snapshot->'policy' policy FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_orders ord ON ord.id=r.order_id WHERE r.status='confirmed' AND o.end_at<now() AND ord.status='paid' ORDER BY o.end_at,r.id FOR UPDATE OF r SKIP LOCKED LIMIT 50`,
    );
    for (const r of missed) {
      if (r.membership_id && r.policy.noShowConsumesSession && !r.consumed)
        await this.consume(tx, r);
      if (r.membership_id && !r.policy.noShowConsumesSession && r.consumed) {
        await rows(
          tx,
          sql`UPDATE sport_memberships SET consumed=consumed-1,revision=revision+1 WHERE id=${r.membership_id} AND consumed>0`,
        );
        await rows(
          tx,
          sql`UPDATE sport_reservations SET consumed=false WHERE id=${r.id}`,
        );
        await rows(
          tx,
          sql`INSERT INTO sport_entitlement_events(membership_id,reservation_id,kind,quantity,source_key) VALUES(${r.membership_id},${r.id},'restore',1,${`no-show:${r.id}`}) ON CONFLICT DO NOTHING`,
        );
      }
      await rows(
        tx,
        sql`UPDATE sport_reservations SET status='no_show',revision=revision+1 WHERE id=${r.id}`,
      );
      await retireReservationReminders(tx, r.id);
      await rows(
        tx,
        sql`INSERT INTO sport_attendance(reservation_id,status,reason) VALUES(${r.id},'absent','Automatic no-show after session end') ON CONFLICT(reservation_id) DO NOTHING`,
      );
      await this.event(tx, 'reservation.no_show', r.id, `no-show:${r.id}`);
    }
  }
  async runJobs() {
    await this.db.transaction(async (tx) => {
      await this.expire(tx);
      await this.closeMissedSessions(tx);
      await rows(
        tx,
        sql`UPDATE sport_memberships SET status='active',freeze_until=null,revision=revision+1 WHERE status='frozen' AND freeze_until<=now()`,
      );
      await rows(
        tx,
        sql`UPDATE sport_memberships SET status='expired',revision=revision+1 WHERE status='active' AND ends_at<=now()`,
      );
    });
    await this.offerWaitlist();
    const jobs = await this.db.transaction((tx) =>
      rows<{
        id: string;
        kind: string;
        aggregate_id: string;
        source_key: string;
        payload: {
          paymentId?: string;
          occurrenceId?: string;
          refundId?: string;
        };
        attempts: number;
      }>(
        tx,
        sql`UPDATE sport_outbox SET lease_until=now()+interval '1 minute',attempts=attempts+1 WHERE id IN(SELECT id FROM sport_outbox WHERE processed_at IS NULL AND due_at<=now() AND (lease_until IS NULL OR lease_until<now()) AND attempts<10 ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 30) RETURNING *`,
      ),
    );
    for (const job of jobs)
      try {
        if (job.kind === 'payment.query') {
          const order = await one<Order>(
            this.db,
            sql`SELECT * FROM sport_orders WHERE id=${job.aggregate_id}`,
          );
          // A delayed query belongs to the attempt that created it. Querying the
          // latest attempt could confirm a later retry from a stale job.
          const payment = await one<{ id: string }>(
            this.db,
            job.payload.paymentId
              ? sql`SELECT id FROM sport_payments WHERE id=${job.payload.paymentId} AND order_id=${order.id}`
              : sql`SELECT id FROM sport_payments WHERE reference=${job.source_key.slice('payment:'.length)} AND order_id=${order.id}`,
          );
          const result = await this.verifyPayment(
            order.user_id,
            order.id,
            true,
            payment.id,
          );
          if (
            result.payments.some(
              (p) => p.id === payment.id && p.state === 'unknown',
            )
          )
            throw new Error('Payment is still unknown');
        }
        if (job.kind === 'refund.process')
          await this.processRefunds(job.aggregate_id, job.payload.refundId);
        await this.notify(job.kind, job.aggregate_id, job.id, job.payload);
        await rows(
          this.db,
          sql`UPDATE sport_outbox SET processed_at=now(),lease_until=null,last_error=null WHERE id=${job.id}`,
        );
      } catch {
        await rows(
          this.db,
          sql`UPDATE sport_outbox SET lease_until=null,due_at=now()+${Math.min(3600, 2 ** job.attempts)}*interval '1 second',last_error='Processing failed' WHERE id=${job.id}`,
        );
      }
    return { processed: jobs.length };
  }
  private async notify(
    kind: string,
    id: string,
    key: string,
    payload: { occurrenceId?: string; refundId?: string },
  ) {
    if (kind === 'reservation.reminder' || kind === 'waitlist.offered')
      return deliverTimeSensitiveNotification(this.db, {
        kind,
        aggregateId: id,
        id: key,
        payload,
      });
    if (
      kind === 'order.confirmed' ||
      kind === 'order.cancelled' ||
      kind === 'refund.process' ||
      kind === 'payment.late'
    )
      return deliverOrderNotification(this.db, {
        kind,
        id: key,
        aggregateId: id,
        payload,
      });
    let recipients: { user_id: string }[] = [];
    let href = '/notifications';
    let title = 'به‌روزرسانی فعالیت ورزشی';
    if (
      [
        'reservation.cancelled',
        'reservation.changed',
        'reservation.no_show',
      ].includes(kind)
    ) {
      recipients = await rows(
        this.db,
        sql`SELECT user_id FROM sport_reservations WHERE id=${id} AND status=${kind === 'reservation.cancelled' ? 'cancelled' : kind === 'reservation.no_show' ? 'no_show' : 'confirmed'}`,
      );
      href = `/bookings/detail?id=${id}`;
      title =
        kind === 'reservation.no_show'
          ? 'عدم حضور در جلسه ثبت شد'
          : 'رزرو شما تغییر کرد';
    }
    for (const r of recipients)
      await deliverSportsNotification(this.db, {
        userId: r.user_id,
        title,
        body: '',
        href,
        sourceKey: `${key}:${r.user_id}`,
      });
  }
  private async requestRefund(
    tx: Tx,
    orderId: string,
    amountMinor: string,
    reason: string,
    sourceKey: string,
    reservationId?: string,
  ) {
    if (BigInt(amountMinor) <= 0n) return;
    const [refund] = await rows<{ id: string }>(
      tx,
      sql`INSERT INTO sport_refunds(order_id,reservation_id,amount_minor,reason,source_key)
        VALUES(${orderId},${reservationId ?? null},${amountMinor},${reason},${sourceKey})
        ON CONFLICT(source_key) DO NOTHING RETURNING id`,
    );
    if (refund)
      await this.event(
        tx,
        'refund.process',
        orderId,
        `refund:${refund.id}`,
        undefined,
        { refundId: refund.id },
      );
  }
  private async processRefunds(orderId: string, refundId?: string) {
    const refunds = await rows<{
      id: string;
      source_key: string;
      amount_minor: string;
    }>(
      this.db,
      sql`SELECT * FROM sport_refunds WHERE order_id=${orderId} AND state IN ('requested','unknown') ${refundId ? sql`AND id=${refundId}` : sql``}`,
    );
    for (const refund of refunds) {
      const result = await this.payments.refund(
        refund.source_key,
        refund.amount_minor,
      );
      await this.db.transaction(async (tx) => {
        const order = await one<Order>(
          tx,
          sql`SELECT * FROM sport_orders WHERE id=${orderId} FOR UPDATE`,
        );
        const current = await one<{ state: string }>(
          tx,
          sql`SELECT state FROM sport_refunds WHERE id=${refund.id} FOR UPDATE`,
        );
        if (current.state === 'succeeded') return;
        await rows(
          tx,
          sql`UPDATE sport_refunds SET state='succeeded',provider_reference=${result.reference} WHERE id=${refund.id}`,
        );
        await rows(
          tx,
          sql`UPDATE sport_orders SET refunded_minor=refunded_minor+${refund.amount_minor},status=CASE WHEN refunded_minor+${refund.amount_minor}>=(SELECT coalesce(sum(amount_minor),0) FROM sport_payments WHERE order_id=${orderId} AND state='verified') THEN 'refunded' ELSE 'partially_refunded' END,revision=revision+1 WHERE id=${orderId}`,
        );
        await retireOrderNotices(tx, orderId, ['payment.late']);
        await this.journal(
          tx,
          order,
          `refund:${refund.id}`,
          refund.amount_minor,
          'service-liability',
          'cash',
        );
      });
    }
  }
}
