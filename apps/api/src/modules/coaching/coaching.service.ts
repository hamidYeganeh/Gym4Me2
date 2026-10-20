import type { Tx } from '../clubs/club.repository';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import type { Environment } from '../../config/environment';
import { deliverSportsNotification } from '../commerce/notification-delivery';
import { approvedCoach } from './practice.service';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { lockWritableAccount } from '../auth/account-lock';
import type {
  CoachingRelationship,
  CoachingStatus,
} from './coaching.contracts';

const timestamp = (value: unknown) =>
  value instanceof Date ? value : new Date(String(value));

/** A relationship grants no medical, messaging or financial access implicitly. */
export function nextRelationshipStatus(
  row: CoachingRelationship,
  actorId: string,
  action: 'accept' | 'decline' | 'end',
  now: Date,
): CoachingStatus {
  if (actorId !== row.coachId && actorId !== row.studentId)
    throw new NotFoundException('Coaching.notFound');
  const recipient =
    row.initiatedBy === row.studentId ? row.coachId : row.studentId;
  if (action !== 'end' && actorId !== recipient)
    throw new ForbiddenException('Coaching.recipientOnly');
  const target =
    action === 'accept'
      ? 'active'
      : action === 'decline'
        ? 'declined'
        : 'ended';
  if (row.status === target) return target;
  if (
    (action === 'end' && !['pending', 'active'].includes(row.status)) ||
    (action !== 'end' && (row.status !== 'pending' || row.expiresAt <= now))
  )
    throw new ConflictException('Coaching.changed');
  return target;
}

@Injectable()
export class CoachingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private async limitInvitations(tx: Tx, actor: string) {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor},88))`,
    );
    const recent = await tx.execute(
      sql`SELECT count(*)::int AS count FROM coaching_invite_attempts WHERE coach_id=${actor} AND created_at>now()-interval '1 hour'`,
    );
    if (Number(recent.rows[0].count) >= 20)
      throw new HttpException('Practice.inviteLimit', 429);
    await tx.execute(
      sql`DELETE FROM coaching_invite_attempts WHERE coach_id=${actor} AND created_at<now()-interval '1 day'`,
    );
    await tx.execute(
      sql`INSERT INTO coaching_invite_attempts(coach_id) VALUES(${actor})`,
    );
  }
  async dashboard(userId: string, page: number) {
    const [profile] = await this.database.db
      .select()
      .from(s.coachProfiles)
      .where(eq(s.coachProfiles.userId, userId));
    // Names are the only counterpart account data exposed, never phone or files.
    const result = await this.database.db.execute<{
      id: string;
      coachId: string;
      studentId: string | null;
      initiatedBy: string;
      status: CoachingStatus;
      revision: number;
      counterpartName: string | null;
      expired: boolean;
      expiresAt: string;
      createdAt: string;
      updatedAt: string;
    }>(sql`
      SELECT r.id, r.coach_id AS "coachId", CASE WHEN r.student_id=${userId} OR r.status='active' OR r.initiated_by=r.student_id THEN r.student_id ELSE NULL END AS "studentId",
        coalesce(r.initiated_by,r.coach_id) AS "initiatedBy",r.revision,r.status, r.expires_at AS "expiresAt", r.created_at AS "createdAt",
        r.updated_at AS "updatedAt",
        CASE WHEN r.coach_id=${userId} THEN CASE WHEN (r.status='active' OR r.initiated_by=r.student_id) THEN student.display_name ELSE NULL END ELSE coach.display_name END AS "counterpartName",
        (r.status='pending' AND r.expires_at<=now()) AS expired
      FROM coaching_relationships r
      JOIN users coach ON coach.id=r.coach_id
      LEFT JOIN users student ON student.id=r.student_id
      WHERE (r.coach_id=${userId} OR r.student_id=${userId})
        AND coach.status='active' AND coach.deleted_at IS NULL AND NOT coach.deletion_pending
        AND (student.id IS NULL OR (student.status='active' AND student.deleted_at IS NULL AND NOT student.deletion_pending))
      ORDER BY r.created_at DESC, r.id DESC LIMIT 51 OFFSET ${(page - 1) * 50}`);
    return {
      profile: profile ?? null,
      items: result.rows.slice(0, 50).map((row) => ({
        ...row,
        expiresAt: timestamp(row.expiresAt).toISOString(),
        createdAt: timestamp(row.createdAt).toISOString(),
        updatedAt: timestamp(row.updatedAt).toISOString(),
      })),
      hasMore: result.rows.length > 50,
    };
  }

  async invite(userId: string, rawPhone: string) {
    const phone = rawPhone.startsWith('0')
      ? `+98${rawPhone.slice(1)}`
      : rawPhone;
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      await approvedCoach(tx, userId);
      await this.limitInvitations(tx, userId);
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId},84))`,
      );
      const recipientKey = createHmac(
        'sha256',
        this.config.get('AUTH_SECRET', { infer: true }),
      )
        .update(phone)
        .digest('hex');
      const [student] = await tx
        .select()
        .from(s.users)
        .where(eq(s.users.phone, phone));
      if (student?.id === userId)
        throw new ConflictException('Coaching.selfInvite');
      const studentId =
        student?.status === 'active' &&
        !student.deletedAt &&
        !student.deletionPending
          ? student.id
          : null;
      if (studentId) await lockWritableAccount(tx, studentId);
      const current = await tx.execute(sql`
        SELECT id,status,(expires_at>now()) AS valid FROM coaching_relationships
        WHERE coach_id=${userId} AND (recipient_key=${recipientKey} OR student_id=${studentId}::uuid) FOR UPDATE`);
      const prior = current.rows[0];
      if (
        prior &&
        (prior.status === 'active' ||
          (prior.status === 'pending' && prior.valid))
      )
        return { id: prior.id, status: prior.status };
      const result = await tx.execute(sql`
        INSERT INTO coaching_relationships(id,coach_id,student_id,recipient_key,initiated_by) VALUES(${prior?.id ?? randomUUID()},${userId},${studentId},${recipientKey},${userId})
        ON CONFLICT(id) DO UPDATE SET student_id=EXCLUDED.student_id,recipient_key=EXCLUDED.recipient_key,initiated_by=EXCLUDED.initiated_by,status='pending',expires_at=now()+interval '7 days',revision=coaching_relationships.revision+1,updated_at=now()
        RETURNING id,status`);
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        action: 'coaching.invited',
        targetId: result.rows[0].id as string,
      });
      if (studentId)
        await deliverSportsNotification(tx, {
          userId: studentId,
          title: 'دعوت همکاری با مربی',
          body: 'دعوت تازه در فضای مربی و شاگرد منتظر پاسخ توست.',
          href: '/coaching',
          sourceKey: `coaching-invite:${result.rows[0].id as string}:${Date.now()}`,
          preference: 'invitations',
        });
      return result.rows[0];
    });
  }

  async request(actor: string, coachId: string) {
    if (actor === coachId) throw new ConflictException('Coaching.selfInvite');
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, actor);
      await this.limitInvitations(tx, actor);
      await lockWritableAccount(tx, coachId);
      await approvedCoach(tx, coachId);
      const publicProfile = await tx.execute(
        sql`SELECT p.user_id FROM coaching_practices p JOIN users u ON u.id=p.user_id WHERE p.user_id=${coachId} AND p.published AND u.profile_public`,
      );
      if (!publicProfile.rows.length)
        throw new NotFoundException('Practice.unavailable');
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${coachId},84))`,
      );
      const current = await tx.execute(
        sql`SELECT id,status,(expires_at>now()) valid FROM coaching_relationships WHERE coach_id=${coachId} AND student_id=${actor} FOR UPDATE`,
      );
      const prior = current.rows[0];
      if (
        prior &&
        (prior.status === 'active' ||
          (prior.status === 'pending' && prior.valid))
      )
        return prior;
      const result = await tx.execute(
        sql`INSERT INTO coaching_relationships(coach_id,student_id,initiated_by) VALUES(${coachId},${actor},${actor}) ON CONFLICT(coach_id,student_id) DO UPDATE SET status='pending',initiated_by=EXCLUDED.initiated_by,expires_at=now()+interval '7 days',revision=coaching_relationships.revision+1,updated_at=now() RETURNING id,status`,
      );
      await deliverSportsNotification(tx, {
        userId: coachId,
        title: 'درخواست همکاری با مربی',
        body: 'درخواست تازه در فضای مربی و شاگرد منتظر پاسخ است.',
        href: '/coaching',
        sourceKey: `coaching-request:${result.rows[0].id as string}:${Date.now()}`,
        preference: 'invitations',
      });
      await tx.insert(s.auditEvents).values({
        actorId: actor,
        action: 'coaching.requested',
        targetId: result.rows[0].id as string,
      });
      return result.rows[0];
    });
  }
  async answer(
    userId: string,
    id: string,
    action: 'accept' | 'decline' | 'end',
    expectedRevision: number,
  ) {
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      // Lock accounts before the relationship, matching deletion's lock order.
      const found = await tx.execute(sql`
        SELECT coach_id AS "coachId", student_id AS "studentId" FROM coaching_relationships
        WHERE id=${id} AND (coach_id=${userId} OR student_id=${userId})`);
      const pair = found.rows[0];
      if (!pair) throw new NotFoundException('Coaching.notFound');
      const counterpart = (
        pair.coachId === userId ? pair.studentId : pair.coachId
      ) as string | null;
      if (counterpart) await lockWritableAccount(tx, counterpart);
      const result = await tx.execute(sql`
        SELECT id,coach_id AS "coachId",student_id AS "studentId",initiated_by AS "initiatedBy",revision,status,
          expires_at AS "expiresAt", updated_at AS "updatedAt", now() AS "now"
        FROM coaching_relationships WHERE id=${id} FOR UPDATE`);
      const raw = result.rows[0];
      if (!raw) throw new NotFoundException('Coaching.notFound');
      const row = {
        ...raw,
        expiresAt: timestamp(raw.expiresAt),
        updatedAt: timestamp(raw.updatedAt),
        now: timestamp(raw.now),
      } as CoachingRelationship & {
        updatedAt: Date;
        now: Date;
        revision: number;
      };
      const status = nextRelationshipStatus(row, userId, action, row.now);
      if (status !== row.status) {
        if (row.revision !== expectedRevision)
          throw new ConflictException('Coaching.changed');
        await tx.execute(
          sql`UPDATE coaching_relationships SET status=${status},revision=revision+1,updated_at=now() WHERE id=${id}`,
        );
        await tx.insert(s.auditEvents).values({
          actorId: userId,
          action: `coaching.${status}`,
          targetId: id,
        });
      }
      return { id, status };
    });
  }
}
