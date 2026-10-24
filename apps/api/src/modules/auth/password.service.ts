import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import {
  authRateLimits,
  authSessions,
  passwordCredentials,
  users,
  auditEvents,
  otpChallenges,
} from '../../database/schema';
import type { Client, SessionTransport } from './auth.contracts';
import { tokenHash, type Principal } from './auth.service';
import { hashPassword, verifyPassword } from './password-hash';
import { lockWritableAccount } from './account-lock';
const invalid = () => new UnauthorizedException('Backend.invalidCredentials');
@Injectable()
export class PasswordService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private async limit(phone: string, ip: string) {
    const now = new Date();
    const until = new Date(now.getTime() + 15 * 60000);
    const secret = this.config.get('AUTH_SECRET', { infer: true });
    if (!secret)
      throw new ForbiddenException('Backend.signInIsNotConfiguredYet');
    const exceeded = await this.database.db.transaction(async (tx) => {
      let denied = false;
      for (const [value, maximum] of [
        [`password:ip:${ip}`, 30],
        [`password:phone:${phone}`, 10],
      ] as const) {
        const key = createHmac('sha256', secret).update(value).digest('hex');
        const [rate] = await tx
          .insert(authRateLimits)
          .values({ key, count: 1, expiresAt: until })
          .onConflictDoUpdate({
            target: authRateLimits.key,
            set: {
              count: sql`case when ${authRateLimits.expiresAt} <= ${now} then 1 else ${authRateLimits.count} + 1 end`,
              expiresAt: sql`case when ${authRateLimits.expiresAt} <= ${now} then ${until} else ${authRateLimits.expiresAt} end`,
            },
          })
          .returning();
        denied ||= rate.count > maximum;
      }
      return denied;
    });
    if (exceeded) throw new HttpException('Backend.passwordRateLimited', 429);
  }
  async login(
    phone: string,
    password: string,
    client: Client,
    transport: SessionTransport,
    ip: string,
    device: string,
  ) {
    await this.limit(phone, ip);
    const [candidate] = await this.database.db
      .select({ user: users, credential: passwordCredentials })
      .from(users)
      .leftJoin(passwordCredentials, eq(passwordCredentials.userId, users.id))
      .where(eq(users.phone, phone));
    const valid = await verifyPassword(
      password,
      candidate?.credential?.passwordHash,
    );
    if (!valid || !candidate?.credential) throw invalid();
    return this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, candidate.user.id))
        .for('update');
      const [credential] = await tx
        .select()
        .from(passwordCredentials)
        .where(eq(passwordCredentials.userId, candidate.user.id));
      if (
        !user ||
        user.status !== 'active' ||
        user.deletedAt ||
        user.phone !== phone ||
        credential?.passwordHash !== candidate.credential?.passwordHash
      )
        throw invalid();
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
          authMethod: 'password',
          tokenHash: tokenHash(
            token,
            this.config.get('SMS_PROVIDER', { infer: true }) === 'kavenegar',
          ),
          device: device.slice(0, 240),
          expiresAt,
        })
        .returning();
      await tx.insert(auditEvents).values({
        actorId: user.id,
        targetId: user.id,
        action: 'account.password_login',
      });
      return { user, token, expiresAt, sessionId: session.id };
    });
  }
  async status(principal: Principal) {
    const [credential] = await this.database.db
      .select({ userId: passwordCredentials.userId })
      .from(passwordCredentials)
      .where(eq(passwordCredentials.userId, principal.user.id));
    return {
      hasPassword: Boolean(credential),
      canSetPassword:
        principal.session.authMethod === 'otp' &&
        Date.now() - principal.session.createdAt.getTime() <= 10 * 60000,
    };
  }
  async set(principal: Principal, password: string) {
    if (
      principal.session.authMethod !== 'otp' ||
      Date.now() - principal.session.createdAt.getTime() > 10 * 60000
    )
      throw new ForbiddenException('Backend.passwordOtpRequired');
    const passwordHash = await hashPassword(password);
    await this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, principal.user.id, 'update');
      const [session] = await tx
        .select()
        .from(authSessions)
        .where(
          and(
            eq(authSessions.id, principal.session.id),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, new Date()),
          ),
        )
        .for('update');
      if (
        !session ||
        session.authMethod !== 'otp' ||
        Date.now() - session.createdAt.getTime() > 10 * 60000
      )
        throw new ForbiddenException('Backend.passwordOtpRequired');
      const now = new Date();
      await tx
        .insert(passwordCredentials)
        .values({ userId: principal.user.id, passwordHash, updatedAt: now })
        .onConflictDoUpdate({
          target: passwordCredentials.userId,
          set: { passwordHash, updatedAt: now },
        });
      await tx
        .update(authSessions)
        .set({ revokedAt: now })
        .where(eq(authSessions.userId, principal.user.id));
      await tx
        .update(otpChallenges)
        .set({ consumedAt: now })
        .where(
          and(
            eq(otpChallenges.phone, principal.user.phone),
            isNull(otpChallenges.consumedAt),
          ),
        );
      await tx.insert(auditEvents).values({
        actorId: principal.user.id,
        targetId: principal.user.id,
        action: 'account.password_changed',
      });
    });
    return { success: true as const };
  }
}
