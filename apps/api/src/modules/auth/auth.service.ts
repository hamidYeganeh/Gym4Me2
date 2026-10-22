import {
  ForbiddenException,
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import {
  authRateLimits,
  authSessions,
  otpChallenges,
  users,
  auditEvents,
  organizationInvitations,
} from '../../database/schema';
import type { Client, SessionTransport } from './auth.contracts';
import { KavenegarService } from './kavenegar.service';

export type Principal = {
  user: typeof users.$inferSelect;
  session: typeof authSessions.$inferSelect;
};
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const invalidCode = () =>
  new UnauthorizedException('Backend.theCodeIsIncorrectOrExpired');

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
    private readonly sms: KavenegarService,
  ) {}
  private hash(value: string) {
    const secret = this.config.get('AUTH_SECRET', { infer: true });
    if (!secret)
      throw new ServiceUnavailableException('Backend.signInIsNotConfiguredYet');
    return createHmac('sha256', secret).update(value).digest('hex');
  }
  async requestOtp(
    phone: string,
    client: Client,
    ip: string,
    transport: SessionTransport = 'web',
    requestedBy?: string,
    requestedSessionId?: string,
  ) {
    const demo = this.config.get('DEMO_MODE', { infer: true }) === true;
    if (demo) {
      const allowed = await this.database.db.execute(
        sql`select user_id from gym4me_demo_accounts where phone = ${phone}`,
      );
      if (!allowed.rows.length || requestedBy)
        throw new ForbiddenException(
          'Backend.signInIsNotConfiguredYet',
        );
    }
    const id = randomUUID();
    const code = demo ? '11111' : String(randomInt(10000, 100000));
    const codeHash = this.hash(`${id}:${code}`);
    const now = new Date();
    await this.database.db.transaction(async (tx) => {
      // Serialize requests across API instances; IPs are hashed and are never trusted from forwarded headers.
      const ipKey = this.hash(`ip:${ip}`);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${ipKey}, 0))`,
      );
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${phone}, 1))`,
      );
      for (const [key, max] of [
        [ipKey, 30],
        [this.hash(`phone:${phone}`), 5],
      ] as const) {
        const [rate] = await tx
          .insert(authRateLimits)
          .values({
            key,
            count: 1,
            expiresAt: new Date(now.getTime() + 3600000),
          })
          .onConflictDoUpdate({
            target: authRateLimits.key,
            set: {
              count: sql`case when ${authRateLimits.expiresAt} <= ${now} then 1 else ${authRateLimits.count} + 1 end`,
              expiresAt: sql`case when ${authRateLimits.expiresAt} <= ${now} then ${new Date(now.getTime() + 3600000)} else ${authRateLimits.expiresAt} end`,
            },
          })
          .returning();
        if (rate.count > max)
          throw new HttpException('Backend.tooManyRequestsTryAgainInAn', 429);
      }
      const [latest] = await tx
        .select()
        .from(otpChallenges)
        .where(eq(otpChallenges.phone, phone))
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1);
      if (latest && now.getTime() - latest.createdAt.getTime() < 60000)
        throw new HttpException('Backend.waitOneMinuteBeforeResending', 429);
      await tx
        .update(otpChallenges)
        .set({ consumedAt: now })
        .where(
          and(eq(otpChallenges.phone, phone), isNull(otpChallenges.consumedAt)),
        );
      await tx.insert(otpChallenges).values({
        id,
        phone,
        client,
        transport,
        purpose: requestedBy ? 'phone-change' : 'sign-in',
        requestedBy,
        requestedSessionId,
        codeHash,
        expiresAt: new Date(now.getTime() + 120000),
      });
    });
    try {
      let demoDelay = false;
      if (demo) {
        const result = await this.database.db.execute<{ outcome: string }>(
          sql`DELETE FROM demo_delivery_modes WHERE user_id=(SELECT user_id FROM gym4me_demo_accounts WHERE phone=${phone}) AND channel='sms' RETURNING outcome`,
        );
        const outcome = result.rows[0]?.outcome ?? 'success';
        demoDelay = outcome === 'delay';
        await this.database.db.execute(
          sql`INSERT INTO demo_deliveries(user_id,channel,outcome,state,due_at) SELECT user_id,'sms',${outcome},${outcome === 'failure' ? 'failed' : demoDelay ? 'pending' : 'delivered'},now()+${demoDelay ? 30 : 0}*interval '1 second' FROM gym4me_demo_accounts WHERE phone=${phone}`,
        );
        if (outcome === 'failure')
          throw new ServiceUnavailableException('Training.demoSmsFailed');
      } else await this.sms.sendOtp(phone, code);
      await this.database.db
        .update(otpChallenges)
        .set({ sentAt: new Date(Date.now() + (demoDelay ? 30000 : 0)) })
        .where(eq(otpChallenges.id, id));
    } catch (error) {
      await this.database.db
        .update(otpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(otpChallenges.id, id));
      throw error;
    }
    return { challengeId: id, expiresIn: 120, retryAfter: 60 };
  }
  async verifyOtp(
    id: string,
    code: string,
    client: Client,
    device: string,
    transport: SessionTransport = 'web',
  ) {
    const result = await this.database.db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(otpChallenges)
        .where(eq(otpChallenges.id, id))
        .for('update');
      if (
        !challenge ||
        challenge.client !== client ||
        challenge.transport !== transport ||
        challenge.purpose !== 'sign-in' ||
        !challenge.sentAt ||
        challenge.sentAt > new Date() ||
        challenge.consumedAt ||
        challenge.expiresAt <= new Date() ||
        challenge.attempts >= 5
      )
        return null;
      await tx
        .update(otpChallenges)
        .set({ attempts: challenge.attempts + 1 })
        .where(eq(otpChallenges.id, id));
      const expected = Buffer.from(challenge.codeHash, 'hex');
      const actual = Buffer.from(this.hash(`${id}:${code}`), 'hex');
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        return null;
      await tx
        .update(otpChallenges)
        .set({ consumedAt: new Date() })
        .where(eq(otpChallenges.id, id));
      const [user] = await tx
        .insert(users)
        .values({ phone: challenge.phone, phoneVerifiedAt: new Date() })
        .onConflictDoUpdate({
          target: users.phone,
          set: { phoneVerifiedAt: new Date() },
        })
        .returning();
      if (user.status !== 'active' || user.deletedAt) return null;
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(
        Date.now() + (client === 'admin' ? 8 * 3600000 : 30 * 86400000),
      );
      const [session] = await tx
        .insert(authSessions)
        .values({
          userId: user.id,
          client,
          transport,
          tokenHash: tokenHash(token),
          device: device.slice(0, 240),
          expiresAt,
        })
        .returning();
      return { token, expiresAt, user: user, sessionId: session.id };
    });
    if (!result) throw invalidCode();
    return result;
  }
  async authenticate(
    token: string | undefined,
    client: Client,
    transport: SessionTransport = 'web',
  ): Promise<Principal> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException('Backend.signInFirst');
    const [result] = await this.database.db
      .select({ user: users, session: authSessions })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash(token)),
          eq(authSessions.client, client),
          eq(authSessions.transport, transport),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
    if (!result || result.user.status !== 'active' || result.user.deletedAt)
      throw new UnauthorizedException('Backend.theSessionHasEndedSignInAgain');
    return result;
  }
  async sessions(principal: Principal) {
    const rows = await this.database.db
      .select({
        id: authSessions.id,
        client: authSessions.client,
        device: authSessions.device,
        createdAt: authSessions.createdAt,
        expiresAt: authSessions.expiresAt,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, principal.user.id),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(authSessions.createdAt));
    return rows.map((row) => ({
      ...row,
      current: row.id === principal.session.id,
    }));
  }
  async requestPhoneChange(principal: Principal, phone: string, ip: string) {
    if (Date.now() - principal.session.createdAt.getTime() > 10 * 60000)
      throw new ForbiddenException('Backend.freshSignInRequired');
    if (phone === principal.user.phone)
      throw new ConflictException('Backend.phoneUnchanged');
    return this.requestOtp(
      phone,
      principal.session.client as Client,
      ip,
      principal.session.transport,
      principal.user.id,
      principal.session.id,
    );
  }
  async verifyPhoneChange(principal: Principal, id: string, code: string) {
    const result = await this.database.db
      .transaction(async (tx) => {
        const [challenge] = await tx
          .select()
          .from(otpChallenges)
          .where(eq(otpChallenges.id, id))
          .for('update');
        if (
          !challenge ||
          challenge.purpose !== 'phone-change' ||
          challenge.requestedBy !== principal.user.id ||
          challenge.requestedSessionId !== principal.session.id ||
          challenge.transport !== principal.session.transport ||
          challenge.client !== principal.session.client ||
          !challenge.sentAt ||
          challenge.sentAt > new Date() ||
          challenge.consumedAt ||
          challenge.expiresAt <= new Date() ||
          challenge.attempts >= 5
        )
          return 'invalid';
        await tx
          .update(otpChallenges)
          .set({ attempts: challenge.attempts + 1 })
          .where(eq(otpChallenges.id, id));
        const expected = Buffer.from(challenge.codeHash, 'hex');
        const actual = Buffer.from(this.hash(`${id}:${code}`), 'hex');
        if (
          actual.length !== expected.length ||
          !timingSafeEqual(actual, expected)
        )
          return 'invalid';
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, principal.user.id))
          .for('update');
        if (!user || user.status !== 'active') return 'invalid';
        const [current] = await tx
          .select()
          .from(authSessions)
          .where(eq(authSessions.id, principal.session.id))
          .for('update');
        if (
          !current ||
          current.revokedAt ||
          current.expiresAt <= new Date() ||
          Date.now() - current.createdAt.getTime() > 10 * 60000
        )
          return 'invalid';
        const [existing] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.phone, challenge.phone));
        if (existing) return 'conflict';
        const now = new Date();
        await tx
          .update(users)
          .set({ phone: challenge.phone, phoneVerifiedAt: now, updatedAt: now })
          .where(eq(users.id, user.id));
        await tx
          .update(otpChallenges)
          .set({ consumedAt: now })
          .where(eq(otpChallenges.id, id));
        await tx
          .update(otpChallenges)
          .set({ consumedAt: now })
          .where(
            and(
              eq(otpChallenges.phone, user.phone),
              isNull(otpChallenges.consumedAt),
            ),
          );
        await tx
          .update(authSessions)
          .set({ revokedAt: now })
          .where(eq(authSessions.userId, user.id));
        await tx
          .update(organizationInvitations)
          .set({ revokedAt: now })
          .where(
            and(
              eq(organizationInvitations.phone, user.phone),
              isNull(organizationInvitations.acceptedAt),
              isNull(organizationInvitations.revokedAt),
            ),
          );
        await tx.insert(auditEvents).values({
          actorId: user.id,
          action: 'account.phone_changed',
          targetId: user.id,
        });
        return 'success';
      })
      .catch((error: unknown) => {
        const failure = error as { code?: string; cause?: { code?: string } };
        if ((failure.code ?? failure.cause?.code) === '23505')
          return 'conflict';
        throw error;
      });
    if (result === 'invalid') throw invalidCode();
    if (result === 'conflict')
      throw new ConflictException('Backend.phoneAlreadyInUse');
    return { success: true };
  }
  async revoke(principal: Principal, id: string) {
    const rows = await this.database.db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(authSessions.id, id),
          eq(authSessions.userId, principal.user.id),
        ),
      )
      .returning({ id: authSessions.id });
    if (!rows.length)
      throw new ForbiddenException('Backend.thisSessionIsUnavailable');
    return { success: true };
  }
}
