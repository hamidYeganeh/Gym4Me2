import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNotNull, lt, lte, or, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import type { Tx } from '../clubs/club.repository';
import { MediaRetentionService } from '../clubs/media-retention.service';
import { PrivacyService } from './privacy.service';
import { deletionLedgerSchema, type DeletionLedger } from './deletion-ledger';
@Injectable()
export class RetentionService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(RetentionService.name);
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
    private readonly privacy: PrivacyService,
    private readonly media: MediaRetentionService,
  ) {}
  onModuleInit() {
    if (!this.config.get('RETENTION_ENABLED', { infer: true })) return;
    const tick = () => {
      if (this.running) return;
      this.running = true;
      void this.run(true)
        .then(async (accounts) => {
          this.logger.log(JSON.stringify(accounts));
          const media = await this.media.run(true);
          this.logger.log(JSON.stringify({ media }));
        })
        .catch(() =>
          this.logger.error(
            'Retention failed; completed media items may have been removed. Retry is safe.',
          ),
        )
        .finally(() => {
          this.running = false;
        });
    };
    this.timer = setInterval(
      tick,
      this.config.get('RETENTION_INTERVAL_MINUTES', { infer: true }) * 60000,
    );
    this.timer.unref();
    tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async run(apply = false, now = new Date()) {
    const policy = this.privacy.policy();
    return this.database.db.transaction(async (tx) => {
      const lock = await tx.execute<{ locked: boolean }>(
        sql`SELECT pg_try_advisory_xact_lock(7088, 24) AS locked`,
      );
      if (!lock.rows[0]?.locked)
        return {
          skipped: true,
          applied: false,
          deletedAccounts: 0,
          eligibleAccounts: 0,
          blockedAccounts: 0,
          expiredOtp: 0,
          expiredSessions: 0,
          expiredInvites: 0,
          expiredAudit: 0,
          expiredLimits: 0,
        };
      const due = await tx
        .select({ userId: s.accountDeletionRequests.userId })
        .from(s.accountDeletionRequests)
        .where(
          and(
            eq(s.accountDeletionRequests.status, 'pending'),
            lte(s.accountDeletionRequests.eligibleAfter, now),
          ),
        )
        .orderBy(s.accountDeletionRequests.eligibleAfter)
        .limit(100);
      let deletedAccounts = 0;
      let blockedAccounts = 0;
      for (const { userId } of due) {
        const [user] = await tx
          .select()
          .from(s.users)
          .where(eq(s.users.id, userId))
          .for('update');
        const [request] = await tx
          .select()
          .from(s.accountDeletionRequests)
          .where(eq(s.accountDeletionRequests.userId, userId))
          .for('update');
        if (
          !user ||
          user.deletedAt ||
          request?.status !== 'pending' ||
          request.eligibleAfter > now
        )
          continue;
        if (await this.privacy.responsibilities(tx, userId)) {
          blockedAccounts++;
          continue;
        }
        if (apply) await this.erase(tx, user, now);
        deletedAccounts++;
      }
      const cutoff = (days: number) =>
        new Date(now.getTime() - days * 86400000);
      const expiredOtp = lt(
        s.otpChallenges.expiresAt,
        cutoff(policy.otpRetentionDays),
      );
      const expiredSessions = or(
        lt(s.authSessions.expiresAt, cutoff(policy.sessionRetentionDays)),
        lt(s.authSessions.revokedAt, cutoff(policy.sessionRetentionDays)),
      );
      const expiredInvites = lt(
        s.organizationInvitations.expiresAt,
        cutoff(policy.invitationRetentionDays),
      );
      const expiredAudit = lt(
        s.auditEvents.createdAt,
        cutoff(policy.auditRetentionDays),
      );
      const expiredLimits = lt(s.authRateLimits.expiresAt, cutoff(1));
      if (!apply) {
        const count = async (
          table:
            | typeof s.otpChallenges
            | typeof s.authSessions
            | typeof s.organizationInvitations
            | typeof s.auditEvents
            | typeof s.authRateLimits,
          where: typeof expiredOtp | undefined,
        ) =>
          Number(
            (
              await tx
                .select({ count: sql<number>`count(*)` })
                .from(table)
                .where(where)
            )[0]?.count ?? 0,
          );
        return {
          applied: false,
          deletedAccounts: 0,
          eligibleAccounts: deletedAccounts,
          blockedAccounts,
          expiredOtp: await count(s.otpChallenges, expiredOtp),
          expiredSessions: await count(s.authSessions, expiredSessions),
          expiredInvites: await count(
            s.organizationInvitations,
            expiredInvites,
          ),
          expiredAudit: await count(s.auditEvents, expiredAudit),
          expiredLimits: await count(s.authRateLimits, expiredLimits),
        };
      }
      const deleted = async (query: PromiseLike<{ rowCount: number | null }>) =>
        (await query).rowCount ?? 0;
      return {
        applied: true,
        deletedAccounts,
        eligibleAccounts: deletedAccounts,
        blockedAccounts,
        expiredOtp: await deleted(tx.delete(s.otpChallenges).where(expiredOtp)),
        expiredSessions: await deleted(
          tx.delete(s.authSessions).where(expiredSessions),
        ),
        expiredInvites: await deleted(
          tx.delete(s.organizationInvitations).where(expiredInvites),
        ),
        expiredAudit: await deleted(
          tx.delete(s.auditEvents).where(expiredAudit),
        ),
        expiredLimits: await deleted(
          tx.delete(s.authRateLimits).where(expiredLimits),
        ),
      };
    });
  }
  async exportDeletionLedger(): Promise<DeletionLedger> {
    // The watermark precedes the query, so concurrent newer deletions cannot be
    // misrepresented as included. Export again after quiescing account writes.
    const exportedAt = new Date();
    const rows = await this.database.db
      .select({
        userId: s.users.id,
        deletedAt: s.users.deletedAt,
      })
      .from(s.users)
      .where(
        and(isNotNull(s.users.deletedAt), lte(s.users.deletedAt, exportedAt)),
      );
    return deletionLedgerSchema.parse({
      version: 1,
      exportedAt: exportedAt.toISOString(),
      entries: rows.map((row) => ({
        userId: row.userId,
        deletedAt: row.deletedAt!.toISOString(),
      })),
    });
  }
  async replayDeletionLedger(input: unknown, snapshotAt: Date, apply = false) {
    const ledger = deletionLedgerSchema.parse(input);
    if (
      !Number.isFinite(snapshotAt.getTime()) ||
      Date.parse(ledger.exportedAt) < snapshotAt.getTime() ||
      Date.parse(ledger.exportedAt) > Date.now()
    )
      throw new Error('A current ledger newer than the snapshot is required.');
    return this.database.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(7088, 24)`);
      let eligible = 0;
      let absent = 0;
      let alreadyDeleted = 0;
      // Stable order keeps concurrent recovery operations from deadlocking.
      for (const entry of [...ledger.entries].sort((a, b) =>
        a.userId.localeCompare(b.userId),
      )) {
        const [user] = await tx
          .select()
          .from(s.users)
          .where(eq(s.users.id, entry.userId))
          .for('update');
        if (!user) {
          absent++;
          continue;
        }
        if (user.deletedAt) {
          alreadyDeleted++;
          continue;
        }
        // An old snapshot can contain ownership since transferred in live data.
        // Fail the whole recovery until the operator resolves it, never publish
        // a restored account or silently orphan its organization.
        if (await this.privacy.responsibilities(tx, user.id))
          throw new Error(
            'Restored ownership or administrator access must be resolved before replay.',
          );
        eligible++;
        if (apply) await this.erase(tx, user, new Date(entry.deletedAt));
      }
      return {
        applied: apply,
        eligible,
        erased: apply ? eligible : 0,
        absent,
        alreadyDeleted,
      };
    });
  }
  private async erase(tx: Tx, user: typeof s.users.$inferSelect, now: Date) {
    const userId = user.id;
    await tx
      .delete(s.passwordCredentials)
      .where(eq(s.passwordCredentials.userId, userId));
    await tx.delete(s.authSessions).where(eq(s.authSessions.userId, userId));
    await tx
      .delete(s.otpChallenges)
      .where(
        or(
          eq(s.otpChallenges.phone, user.phone),
          eq(s.otpChallenges.requestedBy, userId),
        ),
      );
    await tx
      .delete(s.organizationInvitations)
      .where(
        or(
          eq(s.organizationInvitations.phone, user.phone),
          eq(s.organizationInvitations.invitedBy, userId),
        ),
      );
    await tx.delete(s.favoriteClubs).where(eq(s.favoriteClubs.userId, userId));
    await tx
      .delete(s.accountPreferences)
      .where(eq(s.accountPreferences.userId, userId));
    await tx.delete(s.clubReviews).where(eq(s.clubReviews.authorId, userId));
    await tx
      .update(s.clubReviews)
      .set({ reply: null, repliedBy: null, repliedAt: null, updatedAt: now })
      .where(eq(s.clubReviews.repliedBy, userId));
    await tx.delete(s.branchCoaches).where(eq(s.branchCoaches.coachId, userId));
    await tx.delete(s.coachProfiles).where(eq(s.coachProfiles.userId, userId));
    await tx
      .delete(s.organizationMembers)
      .where(eq(s.organizationMembers.userId, userId));
    await tx
      .update(s.auditEvents)
      .set({ details: {} })
      .where(
        or(
          eq(s.auditEvents.actorId, userId),
          eq(s.auditEvents.targetId, userId),
        ),
      );
    await tx
      .update(s.users)
      .set({
        phone: `~${randomBytes(9).toString('hex')}`,
        displayName: null,
        profilePublic: false,
        phoneVerifiedAt: null,
        status: 'suspended',
        deletionPending: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(s.users.id, userId));
    await tx
      .update(s.accountDeletionRequests)
      .set({ status: 'processed', processedAt: now })
      .where(eq(s.accountDeletionRequests.userId, userId));
    await tx
      .insert(s.auditEvents)
      .values({ actorId: null, action: 'account.deleted', targetId: userId });
    // Keep only an opaque tombstone for operational foreign keys. OTP login on
    // the released phone creates a new identity and never restores this account.
  }
}
