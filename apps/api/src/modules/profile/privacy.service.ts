import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import type { Principal } from '../auth/auth.service';
import type { Db, Tx } from '../clubs/club.repository';

export const preferencesSchema = z
  .object({
    policyVersion: z.string().max(100).optional(),
    acceptPolicy: z.literal(true).optional(),
    confirmMinimumAge: z.literal(true).optional(),
    marketingConsent: z.boolean().optional(),
    hidePublicProfile: z.literal(true).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0);
@Injectable()
export class PrivacyService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  policy() {
    const values = {
      minimumAge: this.config.get('ACCOUNT_MINIMUM_AGE', { infer: true }),
      backupRetentionDays: this.config.get('BACKUP_RETENTION_DAYS', {
        infer: true,
      }),
      deletionGraceDays: this.config.get('ACCOUNT_DELETION_GRACE_DAYS', {
        infer: true,
      }),
      otpRetentionDays: this.config.get('OTP_RETENTION_DAYS', { infer: true }),
      sessionRetentionDays: this.config.get('SESSION_RETENTION_DAYS', {
        infer: true,
      }),
      invitationRetentionDays: this.config.get('INVITATION_RETENTION_DAYS', {
        infer: true,
      }),
      auditRetentionDays: this.config.get('AUDIT_RETENTION_DAYS', {
        infer: true,
      }),
    };
    const digest = createHash('sha256')
      .update(JSON.stringify(values))
      .digest('hex')
      .slice(0, 12);
    return {
      version: `${this.config.get('PRIVACY_POLICY_VERSION', { infer: true })}.${digest}`,
      ...values,
    };
  }
  async assertConsent(userId: string) {
    const [row] = await this.database.db
      .select()
      .from(s.accountPreferences)
      .where(eq(s.accountPreferences.userId, userId));
    const policy = this.policy();
    if (
      row?.acceptedPolicyVersion !== policy.version ||
      !row.adultConfirmedAt ||
      (row.confirmedMinimumAge ?? 0) < policy.minimumAge
    )
      throw new ConflictException('Backend.privacyConsentRequired');
  }
  async responsibilities(db: Db | Tx, userId: string) {
    const owners = await db
      .select({ id: s.organizationMembers.id })
      .from(s.organizationMembers)
      .where(
        and(
          eq(s.organizationMembers.userId, userId),
          eq(s.organizationMembers.role, 'owner'),
        ),
      )
      .limit(1);
    const admins = await db
      .select()
      .from(s.platformAdmins)
      .where(eq(s.platformAdmins.userId, userId))
      .limit(1);
    const obligations = await db.execute(
      sql`SELECT 1 FROM sport_orders WHERE user_id=${userId} AND status IN ('partially_paid','review') UNION ALL SELECT 1 FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE r.user_id=${userId} AND r.status IN ('held','confirmed','pending_approval') AND o.end_at>now() UNION ALL SELECT 1 FROM sport_occurrences o JOIN sport_service_versions v ON v.id=o.version_id JOIN sport_reservations r ON r.occurrence_id=o.id WHERE v.coach_user_id=${userId} AND r.status IN('held','confirmed','pending_approval') AND o.end_at>now() UNION ALL SELECT 1 FROM sport_refunds f JOIN sport_orders o ON o.id=f.order_id WHERE o.user_id=${userId} AND f.state IN ('requested','unknown') LIMIT 1`,
    );
    return (
      owners.length > 0 || admins.length > 0 || obligations.rows.length > 0
    );
  }
  async get(userId: string) {
    const [preferences, requests, blocked, visibility] = await Promise.all([
      this.database.db
        .select()
        .from(s.accountPreferences)
        .where(eq(s.accountPreferences.userId, userId)),
      this.database.db
        .select()
        .from(s.accountDeletionRequests)
        .where(eq(s.accountDeletionRequests.userId, userId)),
      this.responsibilities(this.database.db, userId),
      this.database.db
        .select({ profilePublic: s.users.profilePublic })
        .from(s.users)
        .where(eq(s.users.id, userId)),
    ]);
    const row = preferences[0];
    const policy = this.policy();
    return {
      policy,
      marketingConsent: row?.marketingConsent ?? false,
      profilePublic: visibility[0]?.profilePublic ?? false,
      acceptedAt: row?.acceptedAt ?? null,
      acceptanceRequired:
        row?.acceptedPolicyVersion !== policy.version ||
        !row.adultConfirmedAt ||
        (row.confirmedMinimumAge ?? 0) < policy.minimumAge,
      deletion: requests[0]
        ? {
            status: requests[0].status,
            requestedAt: requests[0].requestedAt,
            eligibleAfter: requests[0].eligibleAfter,
            processedAt: requests[0].processedAt,
          }
        : null,
      canRequestDeletion: !blocked,
    };
  }
  async update(userId: string, input: z.infer<typeof preferencesSchema>) {
    const policy = this.policy();
    if (input.acceptPolicy && input.policyVersion !== policy.version)
      throw new ConflictException('Backend.confirmCurrentPolicyAndAge');
    if (input.acceptPolicy && !input.confirmMinimumAge)
      throw new BadRequestException('Backend.confirmCurrentPolicyAndAge');
    if (!input.acceptPolicy && (input.policyVersion || input.confirmMinimumAge))
      throw new BadRequestException('Backend.confirmCurrentPolicyAndAge');
    await this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(s.users)
        .where(eq(s.users.id, userId))
        .for('update');
      if (!user || user.deletedAt || user.status !== 'active')
        throw new UnauthorizedException('Backend.signInFirst');
      const [current] = await tx
        .select()
        .from(s.accountPreferences)
        .where(eq(s.accountPreferences.userId, userId));
      if (
        input.marketingConsent === true &&
        !input.acceptPolicy &&
        (current?.acceptedPolicyVersion !== policy.version ||
          !current.adultConfirmedAt ||
          (current.confirmedMinimumAge ?? 0) < policy.minimumAge)
      )
        throw new ConflictException('Backend.privacyConsentRequired');
      if (user.deletionPending && input.marketingConsent === true)
        throw new ConflictException('Backend.accountDeletionPending');
      if (input.hidePublicProfile)
        await tx
          .update(s.users)
          .set({ profilePublic: false, updatedAt: new Date() })
          .where(eq(s.users.id, userId));
      const values = {
        updatedAt: new Date(),
        ...(input.marketingConsent === undefined
          ? {}
          : { marketingConsent: input.marketingConsent }),
        ...(input.acceptPolicy
          ? {
              acceptedPolicyVersion: policy.version,
              acceptedAt: new Date(),
              adultConfirmedAt: new Date(),
              confirmedMinimumAge: policy.minimumAge,
            }
          : {}),
      };
      await tx
        .insert(s.accountPreferences)
        .values({ userId, ...values })
        .onConflictDoUpdate({
          target: s.accountPreferences.userId,
          set: values,
        });
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        action: input.acceptPolicy
          ? 'privacy.accepted'
          : 'privacy.preferences_changed',
        targetId: userId,
        details: input.acceptPolicy ? { version: policy.version } : {},
      });
    });
    return this.get(userId);
  }
  async requestDeletion(p: Principal) {
    await this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(s.users)
        .where(eq(s.users.id, p.user.id))
        .for('update');
      if (!user || user.deletedAt || user.status !== 'active')
        throw new UnauthorizedException('Backend.signInFirst');
      const [session] = await tx
        .select()
        .from(s.authSessions)
        .where(
          and(
            eq(s.authSessions.id, p.session.id),
            eq(s.authSessions.userId, p.user.id),
            isNull(s.authSessions.revokedAt),
          ),
        )
        .for('share');
      if (
        !session ||
        session.expiresAt <= new Date() ||
        session.createdAt.getTime() < Date.now() - 10 * 60 * 1000
      )
        throw new ConflictException('Backend.signInAgainToDeleteAccount');
      if (await this.responsibilities(tx, p.user.id))
        throw new ConflictException('Backend.resolveAccountResponsibilities');
      const [request] = await tx
        .select()
        .from(s.accountDeletionRequests)
        .where(eq(s.accountDeletionRequests.userId, p.user.id));
      if (request?.status === 'pending') return;
      const requestedAt = new Date();
      const eligibleAfter = new Date(
        requestedAt.getTime() + this.policy().deletionGraceDays * 86400000,
      );
      const values = {
        status: 'pending' as const,
        requestedAt,
        eligibleAfter,
        processedAt: null,
      };
      await tx
        .insert(s.accountDeletionRequests)
        .values({ userId: p.user.id, ...values })
        .onConflictDoUpdate({
          target: s.accountDeletionRequests.userId,
          set: values,
        });
      await tx
        .update(s.users)
        .set({
          deletionPending: true,
          profilePublic: false,
          updatedAt: requestedAt,
        })
        .where(eq(s.users.id, p.user.id));
      await tx.insert(s.auditEvents).values({
        actorId: p.user.id,
        action: 'account.deletion_requested',
        targetId: p.user.id,
      });
    });
    return this.get(p.user.id);
  }
  async cancelDeletion(userId: string) {
    await this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(s.users)
        .where(eq(s.users.id, userId))
        .for('update');
      if (!user || user.deletedAt || user.status !== 'active')
        throw new UnauthorizedException('Backend.signInFirst');
      const rows = await tx
        .update(s.accountDeletionRequests)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(s.accountDeletionRequests.userId, userId),
            eq(s.accountDeletionRequests.status, 'pending'),
          ),
        )
        .returning();
      await tx
        .update(s.users)
        .set({ deletionPending: false, updatedAt: new Date() })
        .where(eq(s.users.id, userId));
      if (rows.length)
        await tx.insert(s.auditEvents).values({
          actorId: userId,
          action: 'account.deletion_cancelled',
          targetId: userId,
        });
    });
    return this.get(userId);
  }
  async export(userId: string) {
    return this.database.db.transaction(
      async (tx) => {
        const [account] = await tx
          .select({
            id: s.users.id,
            phone: s.users.phone,
            displayName: s.users.displayName,
            profilePublic: s.users.profilePublic,
            createdAt: s.users.createdAt,
          })
          .from(s.users)
          .where(
            and(
              eq(s.users.id, userId),
              eq(s.users.status, 'active'),
              isNull(s.users.deletedAt),
            ),
          )
          .for('share');
        if (!account) throw new UnauthorizedException('Backend.signInFirst');
        const preferences = await tx
          .select()
          .from(s.accountPreferences)
          .where(eq(s.accountPreferences.userId, userId));
        const favorites = await tx
          .select({
            clubId: s.favoriteClubs.clubId,
            createdAt: s.favoriteClubs.createdAt,
          })
          .from(s.favoriteClubs)
          .where(eq(s.favoriteClubs.userId, userId));
        const memberships = await tx
          .select({
            id: s.organizationMembers.id,
            organizationId: s.organizationMembers.organizationId,
            role: s.organizationMembers.role,
            allBranches: s.organizationMembers.allBranches,
            createdAt: s.organizationMembers.createdAt,
          })
          .from(s.organizationMembers)
          .where(eq(s.organizationMembers.userId, userId));
        const memberBranches = memberships.length
          ? await tx
              .select({
                memberId: s.organizationMemberBranches.memberId,
                branchId: s.organizationMemberBranches.branchId,
              })
              .from(s.organizationMemberBranches)
              .where(
                inArray(
                  s.organizationMemberBranches.memberId,
                  memberships.map((m) => m.id),
                ),
              )
          : [];
        const reviews = await tx
          .select({
            id: s.clubReviews.id,
            branchId: s.clubReviews.branchId,
            rating: s.clubReviews.rating,
            body: s.clubReviews.body,
            status: s.clubReviews.status,
            createdAt: s.clubReviews.createdAt,
          })
          .from(s.clubReviews)
          .where(eq(s.clubReviews.authorId, userId));
        const replies = await tx
          .select({
            reviewId: s.clubReviews.id,
            reply: s.clubReviews.reply,
            repliedAt: s.clubReviews.repliedAt,
          })
          .from(s.clubReviews)
          .where(eq(s.clubReviews.repliedBy, userId));
        const coach = await tx
          .select()
          .from(s.coachProfiles)
          .where(eq(s.coachProfiles.userId, userId));
        const affiliations = await tx
          .select()
          .from(s.branchCoaches)
          .where(eq(s.branchCoaches.coachId, userId));
        const sessions = await tx
          .select({
            client: s.authSessions.client,
            transport: s.authSessions.transport,
            device: s.authSessions.device,
            createdAt: s.authSessions.createdAt,
            expiresAt: s.authSessions.expiresAt,
            revokedAt: s.authSessions.revokedAt,
          })
          .from(s.authSessions)
          .where(eq(s.authSessions.userId, userId));
        await tx.insert(s.auditEvents).values({
          actorId: userId,
          action: 'account.exported',
          targetId: userId,
        });
        return {
          formatVersion: 2,
          exportedAt: new Date(),
          coachingPractice: (
            await tx.execute(
              sql`SELECT * FROM coaching_practices WHERE user_id=${userId}`,
            )
          ).rows,
          coachingCredentials: (
            await tx.execute(
              sql`SELECT id,title,issuer,expires_at,created_at FROM coaching_credentials WHERE coach_id=${userId}`,
            )
          ).rows,
          coachingAssessments: (
            await tx.execute(
              sql`SELECT a.* FROM coaching_assessments a JOIN coaching_relationships r ON r.id=a.relationship_id WHERE r.student_id=${userId}`,
            )
          ).rows,
          coachingNotes: (
            await tx.execute(
              sql`SELECT n.* FROM coaching_session_notes n WHERE (n.coach_id=${userId} AND EXISTS(SELECT 1 FROM coaching_relationships r WHERE r.coach_id=n.coach_id AND r.student_id=n.student_id AND r.status='active')) OR (n.student_id=${userId} AND n.shared)`,
            )
          ).rows,
          coachingContracts: (
            await tx.execute(
              sql`SELECT * FROM coaching_contracts WHERE coach_id=${userId} OR created_by=${userId}`,
            )
          ).rows,
          coachingLedger: (
            await tx.execute(
              sql`SELECT l.* FROM coaching_ledger l JOIN coaching_contracts c ON c.id=l.contract_id WHERE c.coach_id=${userId} OR l.actor_id=${userId}`,
            )
          ).rows,
          training: {
            plans: (
              await tx.execute(
                sql`SELECT p.id,p.title,p.draft,p.is_template,p.created_at FROM training_plans p WHERE p.athlete_id=${userId} OR (p.owner_id=${userId} AND p.relationship_id IS NULL)`,
              )
            ).rows,
            versions: (
              await tx.execute(
                sql`SELECT v.* FROM training_versions v JOIN training_plans p ON p.id=v.plan_id WHERE p.athlete_id=${userId}`,
              )
            ).rows,
            sessions: (
              await tx.execute(
                sql`SELECT * FROM training_sessions WHERE athlete_id=${userId}`,
              )
            ).rows,
            measurements: (
              await tx.execute(
                sql`SELECT * FROM training_measurements WHERE athlete_id=${userId}`,
              )
            ).rows,
            checkins: (
              await tx.execute(
                sql`SELECT c.* FROM training_checkins c JOIN coaching_relationships r ON r.id=c.relationship_id WHERE r.student_id=${userId}`,
              )
            ).rows,
            messages: (
              await tx.execute(
                sql`SELECT m.id,m.body,m.sender_id,m.created_at,(m.image_key IS NOT NULL) AS has_image FROM training_messages m JOIN coaching_relationships r ON r.id=m.relationship_id WHERE r.student_id=${userId} OR (r.coach_id=${userId} AND r.status='active')`,
              )
            ).rows,
          },
          coachingReviewReports: (
            await tx.execute(
              sql`SELECT * FROM coaching_review_reports WHERE reporter_id=${userId}`,
            )
          ).rows,
          coachingReviews: (
            await tx.execute(
              sql`SELECT * FROM coaching_reviews WHERE student_id=${userId}`,
            )
          ).rows,
          coaching: (
            await tx.execute(sql`
            SELECT id,coach_id,student_id,status,expires_at,created_at,updated_at
            FROM coaching_relationships WHERE coach_id=${userId} OR student_id=${userId}
          `)
          ).rows,
          sports: {
            orders: (
              await tx.execute(
                sql`SELECT id,service_id,amount_minor::text,refunded_minor::text,status,snapshot,created_at FROM sport_orders WHERE user_id=${userId}`,
              )
            ).rows,
            reservations: (
              await tx.execute(
                sql`SELECT * FROM sport_reservations WHERE user_id=${userId}`,
              )
            ).rows,
            memberships: (
              await tx.execute(
                sql`SELECT * FROM sport_memberships WHERE user_id=${userId}`,
              )
            ).rows,
            documents: (
              await tx.execute(
                sql`SELECT id,service_id,name,status,expires_at,reason,created_at FROM sport_documents WHERE user_id=${userId}`,
              )
            ).rows,
            messages: (
              await tx.execute(
                sql`SELECT id,conversation_id,body,created_at FROM sport_messages WHERE sender_id=${userId} AND deleted_at IS NULL`,
              )
            ).rows,
            follows: (
              await tx.execute(
                sql`SELECT * FROM sport_calendar_follows WHERE user_id=${userId}`,
              )
            ).rows,
            invitations: (
              await tx.execute(
                sql`SELECT * FROM sport_invitations WHERE user_id=${userId} OR invited_by=${userId}`,
              )
            ).rows,
            notifications: (
              await tx.execute(
                sql`SELECT * FROM sport_notifications WHERE user_id=${userId}`,
              )
            ).rows,
            support: (
              await tx.execute(
                sql`SELECT m.id,m.ticket_id,m.body,m.created_at FROM sport_ticket_messages m JOIN sport_tickets t ON t.id=m.ticket_id WHERE t.user_id=${userId}`,
              )
            ).rows,
          },
          account,
          preferences: preferences[0] ?? null,
          favorites,
          memberships,
          memberBranches,
          reviews,
          replies,
          coach: coach[0] ?? null,
          affiliations,
          sessions,
        };
      },
      { isolationLevel: 'repeatable read' },
    );
  }
}
