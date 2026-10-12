import {
  ForbiddenException,
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
} from '../../database/schema';
import type { Client } from './auth.contracts';
import { KavenegarService } from './kavenegar.service';

export type Principal = {
  user: typeof users.$inferSelect;
  session: typeof authSessions.$inferSelect;
};
export const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
const invalidCode = () =>
  new UnauthorizedException('کد نادرست یا منقضی شده است.');

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
      throw new ServiceUnavailableException('سرویس ورود هنوز فعال نشده است.');
    return createHmac('sha256', secret).update(value).digest('hex');
  }
  async requestOtp(phone: string, client: Client, ip: string) {
    const id = randomUUID();
    const code = String(randomInt(10000, 100000));
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
          throw new HttpException(
            'درخواست‌های زیادی ارسال شده؛ یک ساعت دیگر تلاش کنید.',
            429,
          );
      }
      const [latest] = await tx
        .select()
        .from(otpChallenges)
        .where(eq(otpChallenges.phone, phone))
        .orderBy(desc(otpChallenges.createdAt))
        .limit(1);
      if (latest && now.getTime() - latest.createdAt.getTime() < 60000)
        throw new HttpException('برای ارسال مجدد یک دقیقه صبر کنید.', 429);
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
        codeHash,
        expiresAt: new Date(now.getTime() + 120000),
      });
    });
    try {
      await this.sms.sendOtp(phone, code);
      await this.database.db
        .update(otpChallenges)
        .set({ sentAt: new Date() })
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
  async verifyOtp(id: string, code: string, client: Client, device: string) {
    const result = await this.database.db.transaction(async (tx) => {
      const [challenge] = await tx
        .select()
        .from(otpChallenges)
        .where(eq(otpChallenges.id, id))
        .for('update');
      if (
        !challenge ||
        challenge.client !== client ||
        !challenge.sentAt ||
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
      if (user.status !== 'active') return null;
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(
        Date.now() + (client === 'admin' ? 8 * 3600000 : 30 * 86400000),
      );
      const [session] = await tx
        .insert(authSessions)
        .values({
          userId: user.id,
          client,
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
  ): Promise<Principal> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException('ابتدا وارد حساب شوید.');
    const [result] = await this.database.db
      .select({ user: users, session: authSessions })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .where(
        and(
          eq(authSessions.tokenHash, tokenHash(token)),
          eq(authSessions.client, client),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, new Date()),
        ),
      );
    if (!result || result.user.status !== 'active')
      throw new UnauthorizedException(
        'نشست پایان یافته است. دوباره وارد شوید.',
      );
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
    if (!rows.length) throw new ForbiddenException('این نشست در دسترس نیست.');
    return { success: true };
  }
}
