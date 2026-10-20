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
      const [review] = await tx
        .insert(s.clubReviews)
        .values({ ...input, authorId: p.user.id, branchId })
        .onConflictDoUpdate({
          target: [s.clubReviews.branchId, s.clubReviews.authorId],
          set: {
            ...input,
            body: input.body ?? null,
            status: 'pending',
            moderationReason: null,
            reply: null,
            repliedBy: null,
            repliedAt: null,
            updatedAt: new Date(),
          },
        })
        .returning();
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
