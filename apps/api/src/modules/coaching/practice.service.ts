import {
  managementWhere,
  managementPage,
  managementDirection,
  type ManagementFilters,
} from '../commerce/management-filters';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { randomUUID, createHash } from 'node:crypto';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { lockWritableAccount } from '../auth/account-lock';
import { publicServiceVisible } from '../commerce/public-service';
import { serviceSchema } from '../commerce/commerce.contracts';
import { CommerceService, rows } from '../commerce/commerce.service';
import { StorageService } from '../clubs/storage.service';
import type { Tx, Db } from '../clubs/club.repository';
import * as c from './practice.contracts';

export async function activeRelationship(
  db: Db | Tx,
  actor: string,
  id: string,
  studentOnly = false,
) {
  const [r] = await rows<{
    id: string;
    coach_id: string;
    student_id: string;
    status: string;
  }>(
    db,
    sql`SELECT r.* FROM coaching_relationships r JOIN users c ON c.id=r.coach_id JOIN users u ON u.id=r.student_id WHERE r.id=${id} AND (r.student_id=${actor} OR r.coach_id=${actor}) AND c.status='active' AND u.status='active' AND c.deleted_at IS NULL AND u.deleted_at IS NULL AND NOT c.deletion_pending AND NOT u.deletion_pending`,
  );
  if (
    !r ||
    (studentOnly && r.student_id !== actor) ||
    (r.coach_id === actor && r.status !== 'active')
  )
    throw new NotFoundException('Coaching.notFound');
  return r;
}
export async function approvedCoach(db: Db | Tx, id: string) {
  const [p] = await rows(
    db,
    sql`SELECT p.* FROM coaching_practices p JOIN users u ON u.id=p.user_id WHERE p.user_id=${id} AND p.review_status='approved' AND p.review_expires_at>now() AND u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending`,
  );
  if (!p) throw new ForbiddenException('Practice.approvalRequired');
  return p;
}
export async function coachingWrite<T>(
  db: Db,
  actor: string,
  work: (tx: Tx) => Promise<T>,
) {
  try {
    return await db.transaction(async (tx) => {
      await lockWritableAccount(tx, actor);
      return work(tx);
    });
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    if (
      ['23P01', '23505', '40001', '40P01'].includes(
        e.code ?? e.cause?.code ?? '',
      )
    )
      throw new ConflictException('Practice.conflict');
    throw error;
  }
}

@Injectable()
export class CoachingPracticeService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
    private readonly storage: StorageService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async workspace(actor: string, includeSessions = true) {
    const [practice] = await rows(
      this.db,
      sql`SELECT * FROM coaching_practices WHERE user_id=${actor}`,
    );
    const credentials = await rows(
      this.db,
      sql`SELECT id,title,issuer,expires_at,(object_key IS NOT NULL) AS has_file FROM coaching_credentials WHERE coach_id=${actor} ORDER BY created_at DESC LIMIT 50`,
    );
    const availability = await rows(
      this.db,
      sql`SELECT id,kind,starts_at,ends_at FROM coaching_availability WHERE coach_id=${actor} AND ends_at>now() ORDER BY starts_at LIMIT 100`,
    );
    const services = await rows(
      this.db,
      sql`SELECT s.id,s.kind,s.title,s.branch_id,s.organization_id,b.name AS branch_name,org.name AS club_name,s.status,cs.mode,cs.entry_amount_minor::text,v.amount_minor::text,v.policy FROM coaching_services cs JOIN sport_services s ON s.id=cs.service_id JOIN sport_service_versions v ON v.id=s.published_version_id JOIN branches b ON b.id=s.branch_id JOIN organizations org ON org.id=s.organization_id WHERE cs.coach_id=${actor} ORDER BY s.created_at DESC LIMIT 100`,
    );
    const sessions = includeSessions ? await this.sessions(actor) : [];
    const notes = await rows(
      this.db,
      sql`SELECT n.* FROM coaching_session_notes n WHERE n.student_id=${actor} AND n.shared=true ORDER BY n.updated_at DESC LIMIT 100`,
    );
    const studentSessions = await rows(
      this.db,
      sql`SELECT r.id,o.id AS occurrence_id,o.revision AS occurrence_revision,o.start_at,o.end_at,o.status AS occurrence_status,s.title,r.status,r.revision,u.display_name FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN coaching_services cs ON cs.service_id=s.id JOIN users u ON u.id=cs.coach_id WHERE r.user_id=${actor} ORDER BY o.start_at DESC LIMIT 100`,
    );
    const [sessionSummary] = await rows(
      this.db,
      sql`WITH sessions AS (
        SELECT o.id,o.start_at,o.status,
          count(r.id) FILTER (WHERE r.status IN ('confirmed','pending_approval','completed','no_show')) AS booked,
          count(r.id) FILTER (WHERE r.status IN ('confirmed','pending_approval')) AS awaiting,
          count(r.id) FILTER (WHERE r.status='completed') AS completed
        FROM sport_occurrences o
        JOIN sport_service_versions v ON v.id=o.version_id
        LEFT JOIN sport_reservations r ON r.occurrence_id=o.id
        WHERE v.coach_user_id=${actor}
        GROUP BY o.id
      ) SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status='scheduled' AND start_at>now() AND (booked=0 OR awaiting>0))::int AS upcoming,
        count(*) FILTER (WHERE status<>'cancelled' AND completed>0 AND awaiting=0)::int AS completed
      FROM sessions`,
    );
    const studentMemberships = await rows(
      this.db,
      sql`SELECT m.id,v.title,m.granted,m.consumed,m.ends_at,m.status,
        (SELECT count(*)::int FROM sport_reservations r WHERE r.membership_id=m.id AND NOT r.consumed AND (r.status IN ('pending_approval','confirmed') OR (r.status='held' AND r.expires_at>now()))) AS held
      FROM sport_memberships m
      JOIN sport_service_versions v ON v.id=m.version_id
      JOIN coaching_services cs ON cs.service_id=m.service_id
      WHERE m.user_id=${actor} AND m.status IN ('active','frozen') AND (m.ends_at IS NULL OR m.ends_at>now())
      ORDER BY m.created_at DESC LIMIT 100`,
    );
    return {
      practice: practice ?? null,
      credentials,
      availability,
      services,
      sessions,
      sessionSummary,
      studentMemberships,
      notes,
      studentSessions,
    };
  }
  async sessions(actor: string, filters?: ManagementFilters) {
    return rows(
      this.db,
      sql`WITH page AS (
        SELECT DISTINCT o.id,o.start_at
        FROM sport_occurrences o JOIN sport_service_versions v ON v.id=o.version_id
        JOIN sport_services s ON s.id=o.service_id
        JOIN branches b ON b.id=s.branch_id JOIN organizations org ON org.id=s.organization_id
        LEFT JOIN sport_reservations r ON r.occurrence_id=o.id AND r.status IN('pending_approval','confirmed','completed','no_show')
        LEFT JOIN users u ON u.id=r.user_id
        WHERE v.coach_user_id=${actor}
          AND ${filters?.from || filters?.to ? sql`true` : sql`o.end_at>now()-interval '30 days'`}
          AND ${managementWhere(filters, sql`o.start_at`, sql`coalesce(r.status,o.status)`, [sql`s.title`, sql`b.name`, sql`org.name`, sql`u.display_name`])}
        ORDER BY o.start_at ${managementDirection(filters)},o.id ${managementPage(filters)}
      )
      SELECT o.id AS occurrence_id,o.revision AS occurrence_revision,o.start_at,o.end_at,o.status AS occurrence_status,s.title,s.branch_id,b.name AS branch_name,org.name AS club_name,r.id,r.user_id,r.status,r.revision,coalesce((SELECT name FROM sport_dependents WHERE id=r.dependent_id),u.display_name) display_name
      FROM page JOIN sport_occurrences o ON o.id=page.id
      JOIN sport_services s ON s.id=o.service_id
      JOIN branches b ON b.id=s.branch_id JOIN organizations org ON org.id=s.organization_id
      LEFT JOIN sport_reservations r ON r.occurrence_id=o.id AND r.status IN('pending_approval','confirmed','completed','no_show')
      LEFT JOIN users u ON u.id=r.user_id
      ORDER BY o.start_at ${managementDirection(filters)},o.id,r.id`,
    );
  }
  async save(actor: string, input: z.infer<typeof c.practiceSchema>) {
    return coachingWrite(this.db, actor, async (tx) => {
      await rows(
        tx,
        sql`INSERT INTO coach_profiles(user_id) VALUES(${actor}) ON CONFLICT DO NOTHING`,
      );
      await rows(
        tx,
        sql`INSERT INTO coaching_practices(user_id) VALUES(${actor}) ON CONFLICT DO NOTHING`,
      );
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor},83))`,
      );
      const [old] = await rows(
        tx,
        sql`SELECT * FROM coaching_practices WHERE user_id=${actor} FOR UPDATE`,
      );
      if (old.revision !== input.revision)
        throw new ConflictException('Practice.conflict');
      if (
        (old.buffer_minutes !== input.bufferMinutes ||
          old.travel_minutes !== input.travelMinutes) &&
        (
          await rows(
            tx,
            sql`SELECT id FROM sport_coach_claims WHERE coach_user_id=${actor} AND active AND upper(period)>now() LIMIT 1`,
          )
        ).length
      )
        throw new ConflictException('Practice.futureSessions');
      const identityChanged =
        JSON.stringify(old.specialties) !== JSON.stringify(input.specialties) ||
        old.experience_years !== input.experienceYears;
      // JSON arrays are cast through jsonb, avoiding array-literal escaping rules.
      const result = await rows(
        tx,
        sql`UPDATE coaching_practices SET specialties=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.specialties)}::jsonb)),goals=ARRAY(SELECT jsonb_array_elements_text(${JSON.stringify(input.goals)}::jsonb)),city=${input.city},experience_years=${input.experienceYears},published=${input.published},buffer_minutes=${input.bufferMinutes},travel_minutes=${input.travelMinutes},review_status=CASE WHEN ${identityChanged} THEN 'pending' ELSE CASE WHEN review_status='draft' THEN 'pending' ELSE review_status END END,revision=revision+1,updated_at=now() WHERE user_id=${actor} RETURNING *`,
      );
      if (input.published)
        await rows(
          tx,
          sql`UPDATE users SET profile_public=true WHERE id=${actor}`,
        );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,action,target_id) VALUES(${actor},'coaching.profile.updated',${actor})`,
      );
      return result[0];
    });
  }
  async credential(
    actor: string,
    input: z.infer<typeof c.credentialSchema>,
    file?: { buffer: Buffer; mimetype: string },
  ) {
    const id = randomUUID(),
      key = `coaching/${actor}/${id}`;
    if (
      file &&
      (file.buffer.length > 4 * 1024 * 1024 ||
        !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(
          file.mimetype,
        ))
    )
      throw new BadRequestException('Practice.invalidFile');
    if (file) {
      const h = file.buffer.subarray(0, 12);
      const valid =
        file.mimetype === 'application/pdf'
          ? h.subarray(0, 5).toString() === '%PDF-'
          : file.mimetype === 'image/jpeg'
            ? h[0] === 255 && h[1] === 216
            : file.mimetype === 'image/png'
              ? h
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : h.subarray(0, 4).toString() === 'RIFF' &&
                h.subarray(8, 12).toString() === 'WEBP';
      if (!valid) throw new BadRequestException('Practice.invalidFile');
    }
    return coachingWrite(this.db, actor, async (tx) => {
      const [p] = await rows(
        tx,
        sql`SELECT user_id FROM coaching_practices WHERE user_id=${actor} FOR UPDATE`,
      );
      if (!p) throw new NotFoundException('Coaching.activateFirst');
      if (
        (
          await rows(
            tx,
            sql`SELECT id FROM coaching_credentials WHERE coach_id=${actor} LIMIT 50`,
          )
        ).length >= 50
      )
        throw new ConflictException('Practice.limit');
      if (new Date(input.expiresAt) <= new Date())
        throw new BadRequestException('Practice.expired');
      if (file) await this.storage.put(key, file.buffer, file.mimetype);
      try {
        await rows(
          tx,
          sql`INSERT INTO coaching_credentials(id,coach_id,title,issuer,expires_at,object_key,content_type) VALUES(${id},${actor},${input.title},${input.issuer},${input.expiresAt},${file ? key : null},${file?.mimetype ?? null})`,
        );
        await rows(
          tx,
          sql`UPDATE coaching_practices SET review_status='pending',revision=revision+1,updated_at=now() WHERE user_id=${actor}`,
        );
        return { id };
      } catch (error) {
        if (file) await this.storage.delete(key).catch(() => {});
        throw error;
      }
    });
  }
  async previewCredential(actor: string, id: string, admin = false) {
    const [r] = await rows<{ object_key: string }>(
      this.db,
      sql`SELECT object_key FROM coaching_credentials WHERE id=${id} AND (${admin} OR coach_id=${actor})`,
    );
    if (!r?.object_key) throw new NotFoundException();
    return this.storage.preview(r.object_key);
  }
  async reviewQueue() {
    return rows(
      this.db,
      sql`SELECT p.*,u.display_name,(SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'issuer',c.issuer,'expiresAt',c.expires_at,'hasFile',c.object_key IS NOT NULL)),'[]') FROM coaching_credentials c WHERE c.coach_id=p.user_id) AS credentials FROM coaching_practices p JOIN users u ON u.id=p.user_id WHERE u.deleted_at IS NULL ORDER BY (p.review_status='pending') DESC,p.updated_at DESC LIMIT 100`,
    );
  }
  async review(
    actor: string,
    id: string,
    input: z.infer<typeof c.reviewPracticeSchema>,
  ) {
    return coachingWrite(this.db, actor, async (tx) => {
      await lockWritableAccount(tx, id);
      if (
        input.approved &&
        (new Date(input.expiresAt) <= new Date() ||
          !(
            await rows(
              tx,
              sql`SELECT id FROM coaching_credentials WHERE coach_id=${id} AND expires_at>=${input.expiresAt}::timestamptz LIMIT 1`,
            )
          ).length)
      )
        throw new BadRequestException('Practice.credentialRequired');
      const result = await rows(
        tx,
        sql`UPDATE coaching_practices SET review_status=${input.approved ? 'approved' : 'rejected'},review_reason=${input.reason},review_expires_at=${input.approved ? input.expiresAt : null},revision=revision+1,updated_at=now() WHERE user_id=${id} AND revision=${input.revision} RETURNING user_id`,
      );
      if (!result.length) throw new ConflictException('Practice.conflict');
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,action,target_id,details) VALUES(${actor},'coaching.reviewed',${id},${JSON.stringify({ approved: input.approved, reason: input.reason })}::jsonb)`,
      );
      return { ok: true };
    });
  }
  async search(
    input: Omit<z.infer<typeof c.coachSearchSchema>, 'limit'> & {
      limit?: number;
    },
    id?: string,
  ) {
    const limit = input.limit ?? 50;
    const term = `%${input.search.replace(/[\\%_]/g, '\\$&')}%`;
    const result = await rows(
      this.db,
      sql`WITH directory_practices AS (
        SELECT p.user_id,p.specialties,p.goals,p.city,p.experience_years,p.review_status,p.review_reason,p.review_expires_at,p.published,p.buffer_minutes,p.travel_minutes,p.revision,p.updated_at,p.public_id,true AS credential_verified FROM coaching_practices p
        UNION ALL
        SELECT c.user_id, coalesce(aff.specialties,'{}'::text[]) AS specialties, '{}'::text[] AS goals,
          coalesce(aff.city,'') AS city, 0 AS experience_years, 'approved' AS review_status,
          NULL::text AS review_reason, 'infinity'::timestamptz AS review_expires_at, true AS published,
          0 AS buffer_minutes, 0 AS travel_minutes, 1 AS revision, c.updated_at,
          'affiliate-' || replace(c.user_id::text,'-','') AS public_id, false AS credential_verified
        FROM coach_profiles c
        JOIN LATERAL (
          SELECT array_agg(DISTINCT sp.name) FILTER (WHERE sp.name IS NOT NULL) AS specialties, min(ci.name) AS city
          FROM branch_coaches bc JOIN branches b ON b.id=bc.branch_id
          JOIN clubs cl ON cl.id=b.organization_id JOIN organizations org ON org.id=cl.id
          JOIN branch_profiles bp ON bp.branch_id=b.id LEFT JOIN cities ci ON ci.id=bp.city_id
          LEFT JOIN sports sp ON sp.id=bc.sport_id
          WHERE bc.coach_id=c.user_id AND bc.status='active'
            AND (bc.starts_on IS NULL OR bc.starts_on<=current_date) AND (bc.ends_on IS NULL OR bc.ends_on>=current_date)
            AND cl.publication_status='published' AND cl.archived_at IS NULL AND cl.operating_status='active' AND org.status='approved' AND bp.archived_at IS NULL AND bp.operating_status='active'
            AND NOT EXISTS(SELECT 1 FROM business_branch_state bs WHERE bs.branch_id=b.id AND NOT bs.active)
            AND bp.address IS NOT NULL AND bp.country_id IS NOT NULL AND bp.province_id IS NOT NULL AND bp.city_id IS NOT NULL AND bp.latitude IS NOT NULL AND bp.longitude IS NOT NULL
            AND EXISTS(SELECT 1 FROM branch_weekly_hours wh WHERE wh.branch_id=b.id)
            AND EXISTS(SELECT 1 FROM branch_sports bs WHERE bs.branch_id=b.id)
            AND EXISTS(SELECT 1 FROM club_phones ph WHERE ph.club_id=cl.id AND (ph.branch_id IS NULL OR ph.branch_id=b.id))
          HAVING count(*)>0
        ) aff ON true
        WHERE NOT EXISTS(SELECT 1 FROM coaching_practices existing WHERE existing.user_id=c.user_id)
      ) SELECT p.credential_verified,p.user_id,p.public_id,p.specialties,p.goals,p.city,p.experience_years,CASE WHEN p.credential_verified THEN p.review_expires_at ELSE NULL END AS review_expires_at,u.display_name,c.biography,(SELECT min(v.amount_minor)::text FROM coaching_services cs JOIN sport_services s ON s.id=cs.service_id JOIN sport_service_versions v ON v.id=s.published_version_id JOIN clubs cl ON cl.id=s.organization_id JOIN organizations org ON org.id=s.organization_id WHERE cs.coach_id=p.user_id AND ${publicServiceVisible}) AS from_price_minor FROM directory_practices p JOIN users u ON u.id=p.user_id JOIN coach_profiles c ON c.user_id=p.user_id WHERE p.review_status='approved' AND p.review_expires_at>now() AND p.published AND u.profile_public AND u.status='active' AND NOT u.deletion_pending AND u.deleted_at IS NULL AND (${id ?? null}::uuid IS NULL OR p.user_id=${id ?? null}::uuid) AND (${input.search}='' OR u.display_name ILIKE ${term} OR c.biography ILIKE ${term}) AND (${input.city}='' OR p.city=${input.city}) AND (${input.specialty}='' OR ${input.specialty}=ANY(p.specialties)) AND (${input.goal}='' OR ${input.goal}=ANY(p.goals)) AND (${input.maxPrice ?? null}::bigint IS NULL OR EXISTS(SELECT 1 FROM coaching_services cs JOIN sport_services s ON s.id=cs.service_id JOIN sport_service_versions v ON v.id=s.published_version_id WHERE cs.coach_id=p.user_id AND ${publicServiceVisible} AND v.amount_minor<=${input.maxPrice ?? null}::bigint)) ORDER BY u.display_name,p.user_id LIMIT ${limit + 1} OFFSET ${(input.page - 1) * limit}`,
    );
    return { items: result.slice(0, limit), hasMore: result.length > limit };
  }
  async detail(reference: string) {
    const [match] = await rows<{ user_id: string }>(
      this.db,
      sql`SELECT user_id FROM coaching_practices WHERE public_id=${reference} OR user_id::text=${reference} UNION SELECT user_id FROM coach_profiles WHERE 'affiliate-' || replace(user_id::text,'-','')=${reference}`,
    );
    if (!match) throw new NotFoundException('Practice.unavailable');
    const id = match.user_id;
    const result = await this.search(c.coachSearchSchema.parse({}), id);
    if (!result.items[0]) throw new NotFoundException('Practice.unavailable');
    const services = await rows(
      this.db,
      sql`SELECT cs.service_id,s.public_id,s.kind,cs.mode,cs.entry_amount_minor::text,s.title,b.name AS branch_name,o.name AS club_name,v.amount_minor::text,v.approval_required,v.session_count,v.duration_days,v.policy FROM coaching_services cs JOIN sport_services s ON s.id=cs.service_id JOIN sport_service_versions v ON v.id=s.published_version_id JOIN branches b ON b.id=s.branch_id JOIN organizations o ON o.id=s.organization_id JOIN clubs cl ON cl.id=o.id WHERE cs.coach_id=${id} AND ${publicServiceVisible} LIMIT 100`,
    );
    const reviews = await rows(
      this.db,
      sql`SELECT cr.id,cr.rating,cr.body,cr.reply,cr.reply_revision,cr.coach_id,CASE WHEN cr.example_consent THEN cr.example ELSE '' END AS example,cr.created_at FROM coaching_reviews cr JOIN sport_reservations r ON r.id=cr.reservation_id WHERE cr.coach_id=${id} AND cr.published AND NOT cr.hidden AND r.status='completed' ORDER BY cr.created_at DESC LIMIT 50`,
    );
    return { ...result.items[0], services, reviews };
  }
  async availability(
    actor: string,
    input: z.infer<typeof c.availabilitySchema>,
  ) {
    return coachingWrite(this.db, actor, async (tx) => {
      await approvedCoach(tx, actor);
      if (new Date(input.endsAt) <= new Date())
        throw new BadRequestException('Practice.expired');
      return (
        await rows(
          tx,
          sql`INSERT INTO coaching_availability(coach_id,kind,starts_at,ends_at) VALUES(${actor},${input.kind},${input.startsAt},${input.endsAt}) RETURNING id`,
        )
      )[0];
    });
  }
  async removeAvailability(actor: string, id: string) {
    return coachingWrite(this.db, actor, async (tx) => {
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor},83))`,
      );
      const [a] = await rows<{ kind: string; starts_at: Date; ends_at: Date }>(
        tx,
        sql`SELECT * FROM coaching_availability WHERE id=${id} AND coach_id=${actor} FOR UPDATE`,
      );
      if (!a) throw new NotFoundException();
      if (
        a.kind === 'available' &&
        (
          await rows(
            tx,
            sql`SELECT id FROM sport_coach_claims WHERE coach_user_id=${actor} AND active AND period && tstzrange(${a.starts_at},${a.ends_at},'[)') LIMIT 1`,
          )
        ).length
      )
        throw new ConflictException('Practice.futureSessions');
      await rows(tx, sql`DELETE FROM coaching_availability WHERE id=${id}`);
      return { ok: true };
    });
  }
  async candidates(actor: string, org: string, branch: string) {
    await this.commerce.staff(this.db, actor, org, branch, [
      'owner',
      'manager',
      'accountant',
    ]);
    return rows(
      this.db,
      sql`SELECT p.user_id,u.display_name,p.specialties FROM branch_coaches bc JOIN coaching_practices p ON p.user_id=bc.coach_id JOIN users u ON u.id=p.user_id WHERE bc.branch_id=${branch} AND bc.status='active' AND p.review_status='approved' AND p.review_expires_at>now() AND u.deleted_at IS NULL AND u.status='active' AND NOT u.deletion_pending ORDER BY u.display_name LIMIT 100`,
    );
  }
  async createOffering(actor: string, input: z.infer<typeof c.offeringSchema>) {
    return coachingWrite(this.db, actor, async (tx) => {
      const key = 'coaching-offer:' + input.idempotencyKey;
      const fingerprint = createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex');
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor}:${key}`},87))`,
      );
      const [prior] = await rows(
        tx,
        sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${actor} AND command_key=${key}`,
      );
      if (prior) {
        if (prior.request_hash !== fingerprint)
          throw new ConflictException('Practice.conflict');
        return prior.result;
      }
      const service = await this.commerce.createService(
        actor,
        serviceSchema.parse(input.service),
        tx,
      );
      await this.registerService(
        actor,
        {
          serviceId: service.id,
          mode: input.mode,
          entryAmountMinor: input.entryAmountMinor,
        },
        tx,
      );
      await this.commerce.publish(actor, service.id, 1, tx);
      const result = { id: service.id };
      await rows(
        tx,
        sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result) VALUES(${actor},${key},${fingerprint},${JSON.stringify(result)}::jsonb)`,
      );
      return result;
    });
  }
  async registerService(
    actor: string,
    input: z.infer<typeof c.coachingServiceSchema>,
    transaction?: Tx,
  ) {
    const execute = async (tx: Tx) => {
      const [s] = await rows<{
        organization_id: string;
        branch_id: string;
        coach_user_id: string;
        kind: string;
        amount_minor: string;
      }>(
        tx,
        sql`SELECT s.*,v.coach_user_id,v.amount_minor FROM sport_services s JOIN LATERAL(SELECT * FROM sport_service_versions WHERE service_id=s.id ORDER BY version DESC LIMIT 1)v ON true WHERE s.id=${input.serviceId} FOR UPDATE OF s`,
      );
      if (!s) throw new NotFoundException();
      await this.commerce.staff(tx, actor, s.organization_id, s.branch_id);
      if (
        !s.coach_user_id ||
        !['class', 'membership', 'program'].includes(s.kind)
      )
        throw new BadRequestException('Practice.invalidService');
      await approvedCoach(tx, s.coach_user_id);
      const assigned = await rows<{ coach_id: string }>(
        tx,
        sql`SELECT coach_id FROM coaching_services WHERE service_id=${input.serviceId}`,
      );
      if (assigned[0] && assigned[0].coach_id !== s.coach_user_id)
        throw new ConflictException('Practice.conflict');
      if (BigInt(input.entryAmountMinor) > BigInt(s.amount_minor))
        throw new BadRequestException('Practice.invalidService');
      if (
        (
          await rows(
            tx,
            sql`SELECT id FROM sport_occurrences WHERE service_id=${input.serviceId} LIMIT 1`,
          )
        ).length
      )
        throw new ConflictException('Practice.futureSessions');
      await rows(
        tx,
        sql`INSERT INTO coaching_services(service_id,coach_id,mode,entry_amount_minor) VALUES(${input.serviceId},${s.coach_user_id},${input.mode},${input.entryAmountMinor}) ON CONFLICT(service_id) DO UPDATE SET mode=EXCLUDED.mode,entry_amount_minor=EXCLUDED.entry_amount_minor`,
      );
      return { ok: true };
    };
    return transaction
      ? execute(transaction)
      : coachingWrite(this.db, actor, execute);
  }
  async assessment(
    actor: string,
    id: string,
    input?: z.infer<typeof c.assessmentSchema>,
  ) {
    if (!input) {
      const r = await activeRelationship(this.db, actor, id);
      const record = (
        await rows(
          this.db,
          sql`SELECT * FROM coaching_assessments WHERE relationship_id=${id} AND (shared OR ${r.student_id === actor})`,
        )
      )[0];
      return {
        ...(record ?? {
          goals: '',
          level: '',
          equipment: '',
          limitations: '',
          shared: false,
          revision: 0,
        }),
        canEdit: r.student_id === actor,
      };
    }
    return coachingWrite(this.db, actor, async (tx) => {
      await activeRelationship(tx, actor, id, true);
      const [a] = await rows(
        tx,
        sql`SELECT revision FROM coaching_assessments WHERE relationship_id=${id} FOR UPDATE`,
      );
      if ((a?.revision ?? 0) !== input.revision)
        throw new ConflictException('Practice.conflict');
      return (
        await rows(
          tx,
          sql`INSERT INTO coaching_assessments(relationship_id,goals,level,equipment,limitations,shared) VALUES(${id},${input.goals},${input.level},${input.equipment},${input.limitations},${input.shared}) ON CONFLICT(relationship_id) DO UPDATE SET goals=EXCLUDED.goals,level=EXCLUDED.level,equipment=EXCLUDED.equipment,limitations=EXCLUDED.limitations,shared=EXCLUDED.shared,revision=coaching_assessments.revision+1,updated_at=now() RETURNING *`,
        )
      )[0];
    });
  }
}
