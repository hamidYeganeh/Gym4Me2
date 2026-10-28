import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { AdminService } from '../admin/admin.service';
import type { Principal } from '../auth/auth.service';
import { lockWritableAccount } from '../auth/account-lock';
import { rows } from '../commerce/commerce.service';
import { ClubService } from './club.service';
import { affiliationSchema, reviewSchema } from './club.contracts';
import { activeTerms, lockClub, requireBranch } from './club.repository';

@Injectable()
export class ClubCommunityService {
  constructor(
    private readonly database: DatabaseService,
    private readonly clubs: ClubService,
    private readonly admin: AdminService,
  ) {}
  async coachProfile(p: Principal, biography: string | null) {
    if (p.session.client !== 'application')
      throw new ForbiddenException('Backend.signInFromTheCoachApplication');
    return this.clubs.write(async (tx) => {
      await lockWritableAccount(tx, p.user.id);
      const [profile] = await tx
        .insert(s.coachProfiles)
        .values({ userId: p.user.id, biography })
        .onConflictDoUpdate({
          target: s.coachProfiles.userId,
          set: { biography, updatedAt: new Date() },
        })
        .returning();
      return profile;
    });
  }
  async inviteCoach(
    userId: string,
    clubId: string,
    branchId: string,
    input: z.infer<typeof affiliationSchema>,
  ) {
    return this.clubs.write(async (tx) => {
      await lockClub(tx, userId, clubId, branchId);
      await requireBranch(tx, clubId, branchId);
      if (input.sportId) await activeTerms(tx, 'sports', [input.sportId]);
      const [row] = await tx
        .insert(s.branchCoaches)
        .values({ ...input, branchId })
        .returning();
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        organizationId: clubId,
        action: 'coach.invited',
        targetId: row.id,
      });
      return row;
    });
  }
  async affiliations(p: Principal, page = 1) {
    return this.database.db
      .select({
        id: s.branchCoaches.id,
        branchId: s.branchCoaches.branchId,
        branchName: s.branches.name,
        clubId: s.branchProfiles.clubId,
        status: s.branchCoaches.status,
        startsOn: s.branchCoaches.startsOn,
        endsOn: s.branchCoaches.endsOn,
        sportId: s.branchCoaches.sportId,
      })
      .from(s.branchCoaches)
      .innerJoin(s.branches, eq(s.branches.id, s.branchCoaches.branchId))
      .innerJoin(
        s.branchProfiles,
        eq(s.branchProfiles.branchId, s.branchCoaches.branchId),
      )
      .where(eq(s.branchCoaches.coachId, p.user.id))
      .orderBy(desc(s.branchCoaches.createdAt), s.branchCoaches.id)
      .limit(100)
      .offset((page - 1) * 100);
  }
  async respondAffiliation(p: Principal, id: string, action: 'accept' | 'end') {
    if (p.session.client !== 'application')
      throw new ForbiddenException('Backend.signInFromTheCoachApplication');
    return this.clubs.write(async (tx) => {
      await lockWritableAccount(tx, p.user.id);
      const [row] = await tx
        .select()
        .from(s.branchCoaches)
        .where(
          and(
            eq(s.branchCoaches.id, id),
            eq(s.branchCoaches.coachId, p.user.id),
          ),
        )
        .for('update');
      if (!row || (action === 'accept' && row.status !== 'pending'))
        throw new NotFoundException('Backend.noActiveInvitationFound');
      const [result] = await tx
        .update(s.branchCoaches)
        .set({ status: action === 'accept' ? 'active' : 'ended' })
        .where(eq(s.branchCoaches.id, id))
        .returning();
      const [branch] = await tx
        .select()
        .from(s.branchProfiles)
        .where(eq(s.branchProfiles.branchId, row.branchId));
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        organizationId: branch.clubId,
        action: `coach.${action}`,
        targetId: id,
      });
      return result;
    });
  }
  async endCoach(userId: string, clubId: string, branchId: string, id: string) {
    return this.clubs.write(async (tx) => {
      await lockClub(tx, userId, clubId, branchId);
      await requireBranch(tx, clubId, branchId);
      const [row] = await tx
        .update(s.branchCoaches)
        .set({ status: 'ended' })
        .where(
          and(
            eq(s.branchCoaches.id, id),
            eq(s.branchCoaches.branchId, branchId),
          ),
        )
        .returning();
      if (!row) throw new NotFoundException('Backend.affiliationNotFound');
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        organizationId: clubId,
        action: 'coach.ended',
        targetId: id,
      });
      return row;
    });
  }
  async createReview(
    p: Principal,
    clubId: string,
    branchId: string,
    input: z.infer<typeof reviewSchema>,
  ) {
    if (p.session.client !== 'application')
      throw new ForbiddenException('Backend.signInFromTheAthleteApplication');
    await this.clubs.publicBranch(clubId, branchId);
    return this.clubs.write(async (tx) => {
      await lockWritableAccount(tx, p.user.id);
      const [staff] = await tx
        .select()
        .from(s.organizationMembers)
        .where(
          and(
            eq(s.organizationMembers.organizationId, clubId),
            eq(s.organizationMembers.userId, p.user.id),
          ),
        );
      const [coach] = await tx
        .select()
        .from(s.branchCoaches)
        .where(
          and(
            eq(s.branchCoaches.branchId, branchId),
            eq(s.branchCoaches.coachId, p.user.id),
            eq(s.branchCoaches.status, 'active'),
          ),
        );
      if (staff || coach)
        throw new ForbiddenException(
          'Backend.teamMembersAndActiveCoachesCannotRate',
        );
      const [proof] = await rows<{ id: string }>(
        tx,
        sql`SELECT r.id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services v ON v.id=o.service_id WHERE r.user_id=${p.user.id} AND v.branch_id=${branchId} AND v.organization_id=${clubId} AND r.status='completed' AND o.end_at <= now() AND (${input.reservationId ?? null}::uuid IS NULL OR r.id=${input.reservationId ?? null}::uuid) ORDER BY o.start_at DESC LIMIT 1 FOR SHARE OF r`,
      );
      if (!proof)
        throw new ForbiddenException('Training.completedServiceRequired');
      const reviewInput = { rating: input.rating, body: input.body ?? null };
      const [review] = await tx
        .insert(s.clubReviews)
        .values({ ...reviewInput, authorId: p.user.id, branchId })
        .onConflictDoUpdate({
          target: [s.clubReviews.branchId, s.clubReviews.authorId],
          set: {
            ...reviewInput,
            status: sql`CASE WHEN club_reviews.status='rejected' THEN 'rejected' ELSE 'pending' END`,
            moderationReason: sql`CASE WHEN club_reviews.status='rejected' THEN club_reviews.moderation_reason ELSE NULL END`,
            reply: null,
            repliedBy: null,
            repliedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning();
      await tx.execute(
        sql`INSERT INTO club_review_proofs(review_id,reservation_id) VALUES(${review.id},${proof.id}) ON CONFLICT(review_id) DO UPDATE SET reservation_id=EXCLUDED.reservation_id`,
      );
      return review;
    });
  }
  async reviews(clubId: string, branchId: string, page: number) {
    await this.clubs.publicBranch(clubId, branchId);
    return this.database.db
      .select({
        id: s.clubReviews.id,
        author: sql<
          string | null
        >`CASE WHEN ${s.users.profilePublic} AND NOT ${s.users.deletionPending} THEN ${s.users.displayName} ELSE NULL END`,
        rating: s.clubReviews.rating,
        verified: sql<boolean>`EXISTS(SELECT 1 FROM club_review_proofs p JOIN sport_reservations r ON r.id=p.reservation_id WHERE p.review_id=${s.clubReviews.id} AND r.status='completed')`,
        body: s.clubReviews.body,
        reply: s.clubReviews.reply,
        repliedAt: s.clubReviews.repliedAt,
        createdAt: s.clubReviews.createdAt,
      })
      .from(s.clubReviews)
      .innerJoin(s.users, eq(s.users.id, s.clubReviews.authorId))
      .where(
        and(
          eq(s.clubReviews.branchId, branchId),
          eq(s.clubReviews.status, 'published'),
        ),
      )
      .orderBy(desc(s.clubReviews.createdAt), s.clubReviews.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
  async reportReview(
    p: Principal,
    clubId: string,
    branchId: string,
    reviewId: string,
    reason: string,
  ) {
    if (p.session.client !== 'application') throw new ForbiddenException();
    await this.clubs.publicBranch(clubId, branchId);
    return this.clubs.write(async (tx) => {
      await lockWritableAccount(tx, p.user.id);
      const [review] = await rows(
        tx,
        sql`SELECT id FROM club_reviews WHERE id=${reviewId} AND branch_id=${branchId} AND status='published' FOR UPDATE`,
      );
      if (!review) throw new NotFoundException('Backend.reviewNotFound');
      const [quota] = await rows<{ count: string }>(
        tx,
        sql`SELECT count(*)::text AS count FROM club_review_reports WHERE reporter_id=${p.user.id} AND created_at>now()-interval '1 day'`,
      );
      if (Number(quota.count) >= 10)
        throw new ConflictException('Training.reportLimit');
      const [report] = await rows(
        tx,
        sql`INSERT INTO club_review_reports(review_id,reporter_id,reason) VALUES(${reviewId},${p.user.id},${reason}) ON CONFLICT(review_id,reporter_id) DO UPDATE SET reason=EXCLUDED.reason,status='open',decision=NULL,revision=club_review_reports.revision+1,created_at=now() RETURNING id`,
      );
      return report;
    });
  }
  async reviewReports(p: Principal) {
    await this.admin.requireAdmin(p);
    return rows(
      this.database.db,
      sql`SELECT r.id,r.review_id,r.reason,r.status,r.revision,r.decision,v.body,v.reply,v.status AS review_status,(SELECT coalesce(jsonb_agg(jsonb_build_object('reason',a.details->>'reason','status',a.details->>'status','at',a.created_at) ORDER BY a.created_at),'[]'::jsonb) FROM audit_events a WHERE a.action='review.report.resolved' AND a.target_id=v.id) AS history FROM club_review_reports r JOIN club_reviews v ON v.id=r.review_id ORDER BY r.created_at DESC LIMIT 100`,
    );
  }
  async resolveReport(
    p: Principal,
    id: string,
    input: { reason: string; hidden: boolean; revision: number },
  ) {
    await this.admin.requireAdmin(p);
    return this.clubs.write(async (tx) => {
      const [lookup] = await rows<{ review_id: string }>(
        tx,
        sql`SELECT review_id FROM club_review_reports WHERE id=${id}`,
      );
      if (!lookup) throw new NotFoundException();
      await rows(
        tx,
        sql`SELECT id FROM club_reviews WHERE id=${lookup.review_id} FOR UPDATE`,
      );
      const [r] = await rows<{
        review_id: string;
        revision: number;
        status: string;
      }>(tx, sql`SELECT * FROM club_review_reports WHERE id=${id} FOR UPDATE`);
      if (!r || r.revision !== input.revision || r.status !== 'open')
        throw new ConflictException('Training.conflict');
      const status = input.hidden ? 'rejected' : 'published';
      await tx.execute(
        sql`UPDATE club_reviews SET status=${status},moderation_reason=${input.reason},updated_at=now() WHERE id=${r.review_id}`,
      );
      await tx.execute(
        sql`UPDATE club_review_reports SET status='resolved',decision=${input.reason},resolved_by=${p.user.id},resolved_at=now(),revision=revision+1 WHERE review_id=${r.review_id} AND status='open'`,
      );
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        action: 'review.report.resolved',
        targetId: r.review_id,
        details: { reason: input.reason, status, reportId: id },
      });
      return { success: true };
    });
  }
  async moderationQueue(
    p: Principal,
    page: number,
    status: 'pending' | 'published' | 'rejected' = 'pending',
  ) {
    await this.admin.requireAdmin(p);
    return this.database.db
      .select({
        id: s.clubReviews.id,
        branchId: s.clubReviews.branchId,
        authorId: s.clubReviews.authorId,
        rating: s.clubReviews.rating,
        body: s.clubReviews.body,
        status: s.clubReviews.status,
        moderationReason: s.clubReviews.moderationReason,
        reply: s.clubReviews.reply,
        createdAt: s.clubReviews.createdAt,
        updatedAt: s.clubReviews.updatedAt,
        authorName: s.users.displayName,
        organizationId: s.organizations.id,
        organizationName: s.organizations.name,
        branchName: s.branches.name,
      })
      .from(s.clubReviews)
      .innerJoin(s.users, eq(s.users.id, s.clubReviews.authorId))
      .innerJoin(
        s.branchProfiles,
        eq(s.branchProfiles.branchId, s.clubReviews.branchId),
      )
      .innerJoin(s.branches, eq(s.branches.id, s.clubReviews.branchId))
      .innerJoin(
        s.organizations,
        eq(s.organizations.id, s.branchProfiles.clubId),
      )
      .where(eq(s.clubReviews.status, status))
      .orderBy(s.clubReviews.createdAt, s.clubReviews.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
  async moderate(
    p: Principal,
    id: string,
    status: 'published' | 'rejected',
    reason: string,
    expectedStatus?: 'pending' | 'published' | 'rejected',
  ) {
    await this.admin.requireAdmin(p);
    return this.clubs.write(async (tx) => {
      const [current] = await tx
        .select()
        .from(s.clubReviews)
        .where(eq(s.clubReviews.id, id))
        .for('update');
      if (!current) throw new NotFoundException('Backend.reviewNotFound');
      if (expectedStatus && current.status !== expectedStatus)
        throw new ConflictException(
          'Backend.theReviewStatusChangedRefreshTheList',
        );
      const [review] = await tx
        .update(s.clubReviews)
        .set({ status, moderationReason: reason, updatedAt: new Date() })
        .where(eq(s.clubReviews.id, id))
        .returning();
      if (!review) throw new NotFoundException('Backend.reviewNotFound');
      const [branch] = await tx
        .select()
        .from(s.branchProfiles)
        .where(eq(s.branchProfiles.branchId, review.branchId));
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        organizationId: branch.clubId,
        action: 'review.moderated',
        targetId: id,
        details: { status, reason },
      });
      return review;
    });
  }
  async reply(
    userId: string,
    clubId: string,
    branchId: string,
    reviewId: string,
    reply: string,
  ) {
    return this.clubs.write(async (tx) => {
      await lockClub(tx, userId, clubId, branchId);
      await requireBranch(tx, clubId, branchId);
      const [row] = await tx
        .update(s.clubReviews)
        .set({ reply, repliedBy: userId, repliedAt: new Date() })
        .where(
          and(
            eq(s.clubReviews.id, reviewId),
            eq(s.clubReviews.branchId, branchId),
            eq(s.clubReviews.status, 'published'),
          ),
        )
        .returning();
      if (!row) throw new NotFoundException('Backend.publishedReviewNotFound');
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        organizationId: clubId,
        action: 'review.replied',
        targetId: reviewId,
      });
      return row;
    });
  }
}
