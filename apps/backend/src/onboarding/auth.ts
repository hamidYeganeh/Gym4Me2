import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  createHmac,
  randomInt,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import type { PoolClient } from 'pg';
import { AuthRateLimit } from './auth-rate-limit';
import { Database } from './database';

const deriveKey = promisify(scrypt);
export type Scope = 'admin' | 'business' | 'applicant';

export function scopeOf(value: string): Scope {
  if (value === 'admin' || value === 'business' || value === 'applicant')
    return value;
  throw new BadRequestException('Invalid sign-in scope.');
}

export function phoneOf(value: unknown) {
  if (typeof value !== 'string' || value.length > 40)
    throw new BadRequestException('Invalid mobile number.');
  const national = value
    .trim()
    .replace(/[۰-۹٠-٩]/g, (digit) => String(digit.charCodeAt(0) & 15))
    .replace(/[\s-]/g, '')
    .replace(/^(?:\+98|98|0)/, '');
  if (!/^9\d{9}$/.test(national))
    throw new BadRequestException('Invalid mobile number.');
  return '+98' + national;
}

@Injectable()
export class Auth {
  constructor(
    private readonly db: Database,
    private readonly jwt: JwtService,
  ) {}

  private get secret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32)
      throw new ServiceUnavailableException('Sign-in is unavailable.');
    return secret;
  }

  private digest(phone: string, scope: string, code: string) {
    return createHmac('sha256', this.secret)
      .update(JSON.stringify([phone, scope, code]))
      .digest('hex');
  }

  async limit(
    key: string,
    max: number,
    db: Pick<PoolClient, 'query'> = this.db.pool,
  ) {
    const { rows } = await db.query<{ attempts: number; retry_after: number }>(
      `INSERT INTO auth_limits VALUES ($1, now(), 1)
       ON CONFLICT (key) DO UPDATE SET
       attempts=CASE WHEN auth_limits.window_start <= now()-interval '15 minutes'
         THEN 1 ELSE LEAST(auth_limits.attempts, $2::int)+1 END,
       window_start=CASE WHEN auth_limits.window_start <= now()-interval '15 minutes'
         THEN now() ELSE auth_limits.window_start END
       RETURNING attempts, greatest(1, ceil(extract(epoch FROM
         window_start + interval '15 minutes' - now())))::int AS retry_after`,
      [key, max],
    );
    if (rows[0].attempts > max) throw new AuthRateLimit(rows[0].retry_after);
  }

  async send(phone: string, scope: string) {
    const local =
      process.env.NODE_ENV !== 'production' &&
      process.env.OTP_MODE === 'console';
    const apiKey = process.env.KAVENEGAR_API_KEY?.trim();
    const otpTemplate =
      process.env.KAVENEGAR_OTP_TEMPLATE?.trim() || 'gym4meotp';
    const template = scope.endsWith(':reset')
      ? process.env.KAVENEGAR_PASSWORD_RESET_TEMPLATE?.trim() || otpTemplate
      : otpTemplate;
    if (!local && !apiKey) {
      throw new ServiceUnavailableException('SMS is unavailable.');
    }
    const code = String(randomInt(100000, 1000000));
    const digest = this.digest(phone, scope, code);
    await this.db.transaction(async (db) => {
      const reservation = await db.query(
        `INSERT INTO otp(phone, scope, digest) VALUES ($1,$2,$3)
         ON CONFLICT (phone,scope) DO UPDATE SET digest=EXCLUDED.digest, sent_at=now(), attempts=0
         WHERE otp.sent_at <= now()-interval '60 seconds'`,
        [phone, scope, digest],
      );
      if (!reservation.rowCount) {
        const { rows } = await db.query<{ retry_after: number }>(
          `SELECT greatest(1, ceil(extract(epoch FROM
            sent_at + interval '60 seconds' - now())))::int AS retry_after
           FROM otp WHERE phone=$1 AND scope=$2`,
          [phone, scope],
        );
        throw new AuthRateLimit(rows[0].retry_after);
      }
      await this.limit('otp:' + phone, 5, db);
    });
    if (local) {
      console.info(`Development OTP for ${phone} (${scope}): ${code}`);
      return;
    }
    try {
      const url = new URL(
        `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey!)}/verify/lookup.json`,
      );
      url.search = new URLSearchParams({
        receptor: '0' + phone.slice(3),
        token: code,
        template,
        type: 'sms',
      }).toString();
      const response = await fetch(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(8000),
      });
      const result = (await response.json()) as {
        return?: { status?: number };
      };
      if (!response.ok || result.return?.status !== 200)
        throw new Error('SMS rejected');
    } catch {
      await this.db.pool.query(
        'DELETE FROM otp WHERE phone=$1 AND scope=$2 AND digest=$3',
        [phone, scope, digest],
      );
      throw new ServiceUnavailableException('SMS delivery failed.');
    }
  }

  async confirm(
    phone: string,
    scope: string,
    code: unknown,
    onVerified?: (db: PoolClient) => Promise<void>,
  ) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code))
      throw new UnauthorizedException('Invalid code.');
    const result = await this.db.transaction(async (db) => {
      const { rows } = await db.query<{
        digest: string;
        attempts: number;
        retry_after: number;
      }>(
        `SELECT digest, attempts, greatest(1, ceil(extract(epoch FROM
           sent_at + interval '5 minutes' - now())))::int AS retry_after
         FROM otp WHERE phone=$1 AND scope=$2 AND sent_at > now()-interval '5 minutes'
         FOR UPDATE`,
        [phone, scope],
      );
      const challenge = rows[0];
      if (!challenge || challenge.attempts < 0) return { valid: false };
      if (challenge.attempts >= 5)
        return { valid: false, retryAfter: challenge.retry_after };

      const valid = timingSafeEqual(
        Buffer.from(challenge.digest),
        Buffer.from(this.digest(phone, scope, code)),
      );
      // A negative count marks a used code so replay still returns 401.
      const attempts = valid ? -1 : challenge.attempts + 1;
      await db.query('UPDATE otp SET attempts=$3 WHERE phone=$1 AND scope=$2', [
        phone,
        scope,
        attempts,
      ]);
      if (valid) await onVerified?.(db);
      return {
        valid,
        retryAfter: attempts === 5 ? challenge.retry_after : undefined,
      };
    });
    if (result.retryAfter) throw new AuthRateLimit(result.retryAfter);
    if (!result.valid)
      throw new UnauthorizedException('Invalid or expired code.');
  }

  async allowed(id: string, scope: Scope) {
    const result = await this.db.pool.query(
      `SELECT 1 FROM accounts WHERE id=$1 AND ($2='applicant' OR EXISTS
       (SELECT 1 FROM account_roles WHERE account_id=$1 AND role=$2))`,
      [id, scope],
    );
    if (!result.rowCount)
      throw new ForbiddenException('This account cannot access this panel.');
  }

  async account(phone: string, scope: Scope) {
    const statement =
      scope === 'applicant'
        ? 'INSERT INTO accounts(phone) VALUES ($1) ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id'
        : 'SELECT id FROM accounts WHERE phone=$1';
    const { rows } = await this.db.pool.query<{ id: string }>(statement, [
      phone,
    ]);
    const id = rows[0]?.id;
    if (!id)
      throw new ForbiddenException('This account cannot access this panel.');
    await this.allowed(id, scope);
    return id;
  }

  async login(phone: string, scope: Scope, password: unknown) {
    if (typeof password !== 'string' || password.length > 256)
      throw new UnauthorizedException();
    await this.limit('password:' + phone, 12);
    const { rows } = await this.db.pool.query<{
      id: string;
      password_hash: string | null;
    }>('SELECT id, password_hash FROM accounts WHERE phone=$1', [phone]);
    const account = rows[0];
    const [salt, hash] = account?.password_hash?.split(':') ?? [
      'unregistered',
      '0'.repeat(128),
    ];
    const key = (await deriveKey(password, salt, 64)) as Buffer;
    const expected = Buffer.from(hash, 'hex');
    if (
      key.length !== expected.length ||
      !timingSafeEqual(key, expected) ||
      !account?.password_hash
    ) {
      throw new UnauthorizedException();
    }
    await this.allowed(account.id, scope);
    return { id: account.id, passwordHash: account.password_hash };
  }

  async requestReset(phone: string, scope: Scope) {
    if (scope === 'applicant') {
      const eligible = await this.db.pool.query(
        `SELECT 1 FROM accounts a WHERE a.phone=$1 AND NOT EXISTS
         (SELECT 1 FROM account_roles WHERE account_id=a.id)`,
        [phone],
      );
      if (!eligible.rowCount) return;
    } else {
      await this.account(phone, scope);
    }
    await this.send(phone, scope + ':reset');
  }

  async reset(phone: string, scope: Scope, code: unknown, password: unknown) {
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      password.length > 256
    ) {
      throw new BadRequestException('Use at least eight characters.');
    }
    const panelAccount =
      scope === 'applicant' ? null : await this.account(phone, scope);
    await this.confirm(phone, scope + ':reset', code, async (db) => {
      let id = panelAccount;
      if (scope === 'applicant') {
        // Serialize the reset with role grants, which reference the account row.
        const { rows } = await db.query<{ id: string }>(
          'SELECT id FROM accounts WHERE phone=$1 FOR UPDATE',
          [phone],
        );
        id = rows[0]?.id ?? null;
        const roles = await db.query(
          'SELECT 1 FROM account_roles WHERE account_id=$1',
          [id],
        );
        if (!id || roles.rowCount)
          throw new BadRequestException(
            'Use your panel to reset your password.',
          );
      }
      const hash = await this.passwordHash(password);
      await db.query('UPDATE accounts SET password_hash=$1 WHERE id=$2', [
        hash,
        id,
      ]);
      await db.query('DELETE FROM auth_sessions WHERE account_id=$1', [id]);
    });
  }

  private async passwordHash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = (await deriveKey(password, salt, 64)) as Buffer;
    return salt + ':' + key.toString('hex');
  }

  async accountStatus(id: string) {
    const { rows } = await this.db.pool.query<{
      accountComplete: boolean;
      hasPassword: boolean;
    }>(
      `SELECT profile IS NOT NULL AS "accountComplete",
       password_hash IS NOT NULL AS "hasPassword" FROM accounts WHERE id=$1`,
      [id],
    );
    return rows[0];
  }

  async complete(id: string, body: Record<string, unknown> | undefined) {
    const { name, username, age, interests, password } = body ?? {};
    const topics = [
      'strength',
      'cardio',
      'yoga',
      'pilates',
      'swimming',
      'functional',
    ];
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 100 ||
      typeof username !== 'string' ||
      !/^[\p{L}\p{N}_.-]{3,32}$/u.test(username) ||
      typeof age !== 'number' ||
      !Number.isInteger(age) ||
      age < 1 ||
      age > 120 ||
      !Array.isArray(interests) ||
      interests.length < 3 ||
      interests.length > topics.length ||
      new Set(interests).size !== interests.length ||
      !interests.every(
        (topic: unknown) => typeof topic === 'string' && topics.includes(topic),
      ) ||
      (password !== undefined &&
        (typeof password !== 'string' ||
          password.length < 8 ||
          password.length > 256))
    ) {
      throw new BadRequestException('Invalid account details.');
    }
    const hash =
      typeof password === 'string' ? await this.passwordHash(password) : null;
    const profile = JSON.stringify({
      name: name.trim(),
      username,
      age,
      interests,
    });
    try {
      const result = await this.db.pool.query(
        `UPDATE accounts SET profile=$2, password_hash=COALESCE(password_hash, $3)
         WHERE id=$1 AND profile IS NULL AND (password_hash IS NOT NULL OR $3::text IS NOT NULL)`,
        [id, profile, hash],
      );
      if (!result.rowCount && !(await this.accountStatus(id))?.accountComplete)
        throw new BadRequestException('A password is required.');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error &&
        'constraint' in error &&
        error.constraint === 'accounts_profile_username'
      )
        throw new ConflictException('Username is already in use.');
      throw error;
    }
  }

  async sign(id: string, scope: Scope, passwordHash?: string) {
    const sessionId = randomUUID();
    const token = this.jwt.sign(
      {},
      {
        secret: this.secret,
        algorithm: 'HS256',
        issuer: 'gym4me',
        subject: id,
        audience: scope,
        jwtid: sessionId,
        expiresIn: '1h',
      },
    );
    await this.db.transaction(async (db) => {
      const { rows } = await db.query<{ password_hash: string | null }>(
        'SELECT password_hash FROM accounts WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (
        !rows[0] ||
        (passwordHash !== undefined && rows[0].password_hash !== passwordHash)
      )
        throw new UnauthorizedException();
      await db.query('DELETE FROM auth_sessions WHERE expires_at <= now()');
      await db.query(
        'INSERT INTO auth_sessions (id, account_id, scope) VALUES ($1,$2,$3)',
        [sessionId, id, scope],
      );
    });
    return token;
  }

  private claims(token: string | undefined, scope: Scope) {
    if (!token) throw new UnauthorizedException();
    try {
      const claims = this.jwt.verify<{ sub: string; jti: string }>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
        issuer: 'gym4me',
        audience: scope,
      });
      if (!claims.sub || !claims.jti) throw new UnauthorizedException();
      return claims;
    } catch {
      throw new UnauthorizedException();
    }
  }

  async verify(token: string | undefined, scope: Scope) {
    const { sub, jti } = this.claims(token, scope);
    const session = await this.db.pool.query(
      'SELECT 1 FROM auth_sessions WHERE id=$1 AND account_id=$2 AND scope=$3 AND expires_at > now()',
      [jti, sub, scope],
    );
    if (!session.rowCount) throw new UnauthorizedException();
    await this.allowed(sub, scope);
    return sub;
  }

  async logout(token: string | undefined, scope: Scope) {
    let claims: ReturnType<Auth['claims']>;
    try {
      claims = this.claims(token, scope);
    } catch (error) {
      if (error instanceof UnauthorizedException) return;
      throw error;
    }
    await this.db.pool.query(
      'DELETE FROM auth_sessions WHERE id=$1 AND account_id=$2 AND scope=$3',
      [claims.jti, claims.sub, scope],
    );
  }
}
