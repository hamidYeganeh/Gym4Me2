import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { CommerceService, rows } from '../commerce/commerce.service';
import {
  activeRelationship,
  approvedCoach,
  coachingWrite,
} from './practice.service';
import * as c from './practice.contracts';
@Injectable()
export class CoachingRecordsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async note(actor: string, id: string, input?: z.infer<typeof c.noteSchema>) {
    const read = async (
      db:
        | typeof this.db
        | Parameters<Parameters<typeof this.db.transaction>[0]>[0],
    ) => {
      const [r] = await rows<{
        coach_id: string;
        student_id: string;
        relationship_id: string;
        status: string;
      }>(
        db,
        sql`SELECT cs.coach_id,r.user_id AS student_id,rel.id AS relationship_id,r.status FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN coaching_services cs ON cs.service_id=o.service_id JOIN coaching_relationships rel ON rel.coach_id=cs.coach_id AND rel.student_id=r.user_id WHERE r.id=${id} AND (cs.coach_id=${actor} OR r.user_id=${actor})`,
      );
      if (!r) throw new NotFoundException('Coaching.notFound');
      await activeRelationship(db, actor, r.relationship_id);
      return r;
    };
    if (!input) {
      const r = await read(this.db);
      const record = (
        await rows(
          this.db,
          sql`SELECT * FROM coaching_session_notes WHERE reservation_id=${id} AND (${r.coach_id === actor} OR shared)`,
        )
      )[0];
      return {
        ...(record ?? { note: '', follow_up: '', shared: false, revision: 0 }),
        canEdit: r.coach_id === actor,
      };
    }
    return coachingWrite(this.db, actor, async (tx) => {
      const r = await read(tx);
      if (r.coach_id !== actor) throw new ForbiddenException();
      if (!['completed', 'no_show'].includes(r.status))
        throw new ConflictException('Practice.completeFirst');
      await approvedCoach(tx, actor);
      const [old] = await rows(
        tx,
        sql`SELECT revision FROM coaching_session_notes WHERE reservation_id=${id} FOR UPDATE`,
      );
      if ((old?.revision ?? 0) !== input.revision)
        throw new ConflictException('Practice.conflict');
      return (
        await rows(
          tx,
          sql`INSERT INTO coaching_session_notes(reservation_id,coach_id,student_id,note,follow_up,shared) VALUES(${id},${actor},${r.student_id},${input.note},${input.followUp},${input.shared}) ON CONFLICT(reservation_id) DO UPDATE SET note=EXCLUDED.note,follow_up=EXCLUDED.follow_up,shared=EXCLUDED.shared,revision=coaching_session_notes.revision+1,updated_at=now() RETURNING *`,
        )
      )[0];
    });
  }
  async finance(actor: string, organizationId?: string, branchId?: string) {
    if (organizationId && branchId)
      await this.commerce.staff(this.db, actor, organizationId, branchId, [
        'owner',
        'manager',
        'accountant',
      ]);
    else if (organizationId || branchId) throw new BadRequestException();
    const contracts = await rows(
      this.db,
      sql`SELECT c.*,o.name AS club_name,b.name AS branch_name FROM coaching_contracts c JOIN organizations o ON o.id=c.organization_id JOIN branches b ON b.id=c.branch_id WHERE ${organizationId && branchId ? sql`c.organization_id=${organizationId} AND c.branch_id=${branchId}` : sql`c.coach_id=${actor}`} ORDER BY c.created_at DESC LIMIT 100`,
    );
    const ledger = await rows(
      this.db,
      sql`SELECT l.id,l.contract_id,l.kind,l.amount_minor::text,l.reservation_id,l.reference,l.confirmed,l.created_at FROM coaching_ledger l JOIN coaching_contracts c ON c.id=l.contract_id WHERE ${organizationId && branchId ? sql`c.organization_id=${organizationId} AND c.branch_id=${branchId}` : sql`c.coach_id=${actor}`} ORDER BY l.created_at DESC LIMIT 200`,
    );
    const bookings =
      organizationId && branchId
        ? await rows(
            this.db,
            sql`SELECT r.id,v.coach_user_id AS coach_id,s.title,o.start_at FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_service_versions v ON v.id=o.version_id JOIN sport_services s ON s.id=o.service_id WHERE s.organization_id=${organizationId} AND s.branch_id=${branchId} AND r.status IN('completed','no_show') AND v.coach_user_id IS NOT NULL ORDER BY o.start_at DESC LIMIT 100`,
          )
        : [];
    return { contracts, ledger, bookings };
  }
  async contract(actor: string, input: z.infer<typeof c.contractSchema>) {
    return coachingWrite(this.db, actor, async (tx) => {
      await this.commerce.staff(
        tx,
        actor,
        input.organizationId,
        input.branchId,
      );
      await approvedCoach(tx, input.coachId);
      const affiliation = await rows(
        tx,
        sql`SELECT id FROM branch_coaches WHERE branch_id=${input.branchId} AND coach_id=${input.coachId} AND status='active'`,
      );
      if (!affiliation.length)
        throw new ForbiddenException('Practice.affiliationRequired');
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.branchId}:${input.coachId}`},85))`,
      );
      const [version] = await rows<{ version: number }>(
        tx,
        sql`SELECT coalesce(max(version),0)+1 AS version FROM coaching_contracts WHERE branch_id=${input.branchId} AND coach_id=${input.coachId}`,
      );
      const result = await rows(
        tx,
        sql`INSERT INTO coaching_contracts(organization_id,branch_id,coach_id,version,starts_on,ends_on,share_basis_points,basis,costs_minor,terms,created_by) VALUES(${input.organizationId},${input.branchId},${input.coachId},${version.version},${input.startsOn},${input.endsOn},${input.shareBasisPoints},${input.basis},${input.costsMinor},${input.terms},${actor}) RETURNING *`,
      );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id) VALUES(${actor},${input.organizationId},'coaching.contract.created',${result[0].id as string})`,
      );
      return result[0];
    });
  }
  async ledger(actor: string, input: z.infer<typeof c.ledgerSchema>) {
    return coachingWrite(this.db, actor, async (tx) => {
      const [contract] = await rows<{
        organization_id: string;
        branch_id: string;
        coach_id: string;
        starts_on: string;
        ends_on: string | null;
      }>(
        tx,
        sql`SELECT * FROM coaching_contracts WHERE id=${input.contractId} FOR UPDATE`,
      );
      if (!contract) throw new NotFoundException();
      if (
        (
          await rows(
            tx,
            sql`SELECT contract_id FROM business_contract_rules WHERE contract_id=${input.contractId} LIMIT 1`,
          )
        ).length
      )
        throw new ConflictException('PH5.advancedLedger');
      await this.commerce.staff(
        tx,
        actor,
        contract.organization_id,
        contract.branch_id,
        ['owner', 'manager', 'accountant'],
      );
      if (input.kind === 'income' && !input.reservationId)
        throw new BadRequestException('Practice.reservationRequired');
      if (
        input.reservationId &&
        !(
          await rows(
            tx,
            sql`SELECT r.id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_service_versions v ON v.id=o.version_id JOIN sport_services s ON s.id=o.service_id WHERE r.id=${input.reservationId} AND v.coach_user_id=${contract.coach_id} AND s.branch_id=${contract.branch_id} AND (o.start_at AT TIME ZONE 'Asia/Tehran')::date>=${contract.starts_on}::date AND (${contract.ends_on}::date IS NULL OR (o.start_at AT TIME ZONE 'Asia/Tehran')::date<=${contract.ends_on}::date) AND r.status IN('completed','no_show')`,
          )
        ).length
      )
        throw new BadRequestException('Practice.reservationRequired');
      await rows(
        tx,
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor}:${input.idempotencyKey}`},86))`,
      );
      const [prior] = await rows(
        tx,
        sql`SELECT * FROM coaching_ledger WHERE actor_id=${actor} AND command_key=${input.idempotencyKey}`,
      );
      if (prior) {
        if (
          prior.contract_id !== input.contractId ||
          prior.kind !== input.kind ||
          String(prior.amount_minor) !== input.amountMinor ||
          prior.reservation_id !== input.reservationId ||
          prior.reference !== input.reference ||
          prior.confirmed !== input.confirmed
        )
          throw new ConflictException('Practice.conflict');
        return prior;
      }
      const result = await rows(
        tx,
        sql`INSERT INTO coaching_ledger(contract_id,kind,amount_minor,reservation_id,reference,confirmed,actor_id,command_key) VALUES(${input.contractId},${input.kind},${input.amountMinor},${input.reservationId},${input.reference},${input.confirmed},${actor},${input.idempotencyKey}) RETURNING *`,
      );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id) VALUES(${actor},${contract.organization_id},'coaching.ledger.recorded',${result[0].id as string})`,
      );
      return result[0];
    });
  }
  async review(
    actor: string,
    reservationId: string,
    input: z.infer<typeof c.coachReviewSchema>,
  ) {
    return coachingWrite(this.db, actor, async (tx) => {
      const [r] = await rows<{ coach_id: string; status: string }>(
        tx,
        sql`SELECT cs.coach_id,r.status FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN coaching_services cs ON cs.service_id=o.service_id WHERE r.id=${reservationId} AND r.user_id=${actor} FOR SHARE OF r`,
      );
      if (!r) throw new ForbiddenException('Practice.completeFirst');
      const [prior] = await rows(
        tx,
        sql`SELECT revision FROM coaching_reviews WHERE reservation_id=${reservationId} FOR UPDATE`,
      );
      if (
        r.status !== 'completed' &&
        (!prior || input.published || input.exampleConsent)
      )
        throw new ForbiddenException('Practice.completeFirst');
      if ((prior?.revision ?? 0) !== input.revision)
        throw new ConflictException('Practice.conflict');
      return (
        await rows(
          tx,
          sql`INSERT INTO coaching_reviews(reservation_id,coach_id,student_id,rating,body,published,example,example_consent) VALUES(${reservationId},${r.coach_id},${actor},${input.rating},${input.body},${input.published},${input.example},${input.exampleConsent}) ON CONFLICT(reservation_id) DO UPDATE SET rating=EXCLUDED.rating,body=EXCLUDED.body,published=EXCLUDED.published,example=EXCLUDED.example,example_consent=EXCLUDED.example_consent,revision=coaching_reviews.revision+1 RETURNING *`,
        )
      )[0];
    });
  }
  async myReviews(actor: string) {
    return rows(
      this.db,
      sql`SELECT * FROM coaching_reviews WHERE student_id=${actor} ORDER BY created_at DESC LIMIT 100`,
    );
  }
  async reply(
    actor: string,
    id: string,
    input: z.infer<typeof c.reviewReplySchema>,
  ) {
    return coachingWrite(this.db, actor, async (tx) => {
      const result = await rows(
        tx,
        sql`UPDATE coaching_reviews SET reply=${input.body},reply_revision=reply_revision+1 WHERE id=${id} AND coach_id=${actor} AND reply_revision=${input.revision} RETURNING id`,
      );
      if (!result.length) throw new ConflictException('Practice.conflict');
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,action,target_id) VALUES(${actor},'coaching.review.replied',${id})`,
      );
      return { ok: true };
    });
  }
  async report(
    actor: string,
    id: string,
    input: z.infer<typeof c.reviewReportSchema>,
  ) {
    return coachingWrite(this.db, actor, async (tx) => {
      const [review] = await rows(
        tx,
        sql`SELECT cr.id FROM coaching_reviews cr JOIN sport_reservations r ON r.id=cr.reservation_id WHERE cr.id=${id} AND cr.student_id<>${actor} AND cr.published AND NOT cr.hidden AND r.status='completed' FOR SHARE OF cr`,
      );
      if (!review) throw new NotFoundException('Practice.unavailable');
      return (
        await rows(
          tx,
          sql`INSERT INTO coaching_review_reports(review_id,reporter_id,reason) VALUES(${id},${actor},${input.reason}) ON CONFLICT(review_id,reporter_id) DO UPDATE SET review_id=EXCLUDED.review_id RETURNING id,status`,
        )
      )[0];
    });
  }
  async reviewReports() {
    return rows(
      this.db,
      sql`SELECT rp.*,cr.body,cr.reply,cr.hidden,cr.rating,(SELECT coalesce(jsonb_agg(jsonb_build_object('reason',ae.details->>'reason','hidden',ae.details->'hidden','createdAt',ae.created_at) ORDER BY ae.created_at),'[]'::jsonb) FROM audit_events ae WHERE ae.target_id=rp.id AND ae.action='coaching.review.resolved') AS decisions FROM coaching_review_reports rp JOIN coaching_reviews cr ON cr.id=rp.review_id ORDER BY (rp.status='pending') DESC,rp.created_at DESC LIMIT 100`,
    );
  }
  async resolveReview(
    actor: string,
    id: string,
    input: z.infer<typeof c.reviewResolutionSchema>,
  ) {
    // Caller must pass AdminService.requireAdmin; keep the decision and history atomic.
    return coachingWrite(this.db, actor, async (tx) => {
      const [target] = await rows<{ review_id: string }>(
        tx,
        sql`SELECT review_id FROM coaching_review_reports WHERE id=${id}`,
      );
      if (!target) throw new NotFoundException('Practice.unavailable');
      await rows(
        tx,
        sql`SELECT id FROM coaching_reviews WHERE id=${target.review_id} FOR UPDATE`,
      );

      const [report] = await rows<{ review_id: string }>(
        tx,
        sql`UPDATE coaching_review_reports SET status='resolved',revision=revision+1 WHERE id=${id} AND revision=${input.revision} RETURNING review_id`,
      );
      if (!report) throw new ConflictException('Practice.conflict');
      await rows(
        tx,
        sql`UPDATE coaching_review_reports SET revision=revision+1 WHERE review_id=${report.review_id} AND id<>${id}`,
      );
      await rows(
        tx,
        sql`UPDATE coaching_reviews SET hidden=${input.hidden} WHERE id=${report.review_id}`,
      );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,action,target_id,details) VALUES(${actor},'coaching.review.resolved',${id},${JSON.stringify({ reason: input.reason, hidden: input.hidden })}::jsonb)`,
      );
      return { ok: true };
    });
  }
}
