import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq, or, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';
import { z } from 'zod';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import {
  auditEvents,
  passwordCredentials,
  accountPreferences,
  accountDeletionRequests,
  favoriteClubs,
  coachProfiles,
  branchProfiles,
  branchCoaches,
  clubReviews,
  authSessions,
  clubs,
  branches,
  organizationInvitations,
  organizationMembers,
  organizations,
  otpChallenges,
  platformAdmins,
  users,
} from '../src/database/schema';
import { AuthModule } from '../src/modules/auth/auth.module';
import { KavenegarService } from '../src/modules/auth/kavenegar.service';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { PrivacyService } from '../src/modules/profile/privacy.service';
import { RetentionService } from '../src/modules/profile/retention.service';
import { ClubService } from '../src/modules/clubs/club.service';
import { tokenHash } from '../src/modules/auth/auth.service';
import { configureApi } from '../src/platform/http/configure-api';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test';
if (!new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Requires an isolated _test database');
const payload = (response: Response) =>
  z
    .object({
      challengeId: z.string().optional(),
      id: z.string().optional(),
      displayName: z.string().optional(),
      user: z.object({ id: z.string() }).optional(),
    })
    .parse(response.body);
const prefix = `+989${String(Date.now()).slice(-7)}`;
let sequence = 0;
const phone = () => `${prefix}${String(sequence++).padStart(2, '0')}`;
const delivered = new Map<string, string>();
const sendOtp = jest.fn((number: string, code: string) => {
  delivered.set(number, code);
  return Promise.resolve();
});
let app: INestApplication<App>;
let db: DatabaseService['db'];
let business: { cookie: string; userId: string; phone: string };
let other: typeof business;
let admin: typeof business;
let organizationId: string;
const orgIds: string[] = [];
const userIds: string[] = [];
const challengeIds: string[] = [];
const call = (
  method: 'get' | 'post' | 'patch',
  path: string,
  client = 'business',
  cookie?: string,
) => {
  const req = request(app.getHttpServer())
    [method](`/api/v1/${path}`)
    .set('x-gym-client', client)
    .set(
      'Origin',
      `http://localhost:${client === 'admin' ? '7082' : client === 'application' ? '7081' : '7083'}`,
    );
  return cookie ? req.set('Cookie', cookie) : req;
};
async function challenge(number: string, client = 'business') {
  const result = await call('post', 'auth/otp/request', client)
    .send({ phone: number })
    .expect(201);
  challengeIds.push(payload(result).challengeId!);
  expect(result.body).not.toHaveProperty('code');
  expect(delivered.get(number)).toMatch(/^\d{5}$/);
  return payload(result).challengeId!;
}
async function login(client = 'business', acceptPolicy = true) {
  const number = phone();
  const id = await challenge(number, client);
  const result = await call('post', 'auth/otp/verify', client)
    .send({ challengeId: id, code: delivered.get(number) })
    .expect(201);
  userIds.push(payload(result).user!.id);
  expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(result.headers['set-cookie'][0]).toContain('SameSite=Strict');
  expect(result.body).not.toHaveProperty('token');
  if (acceptPolicy)
    await call(
      'post',
      'profile/account/privacy/preferences',
      client,
      result.headers['set-cookie'][0].split(';')[0],
    )
      .send({
        acceptPolicy: true,
        confirmMinimumAge: true,
        policyVersion: app.get(PrivacyService).policy().version,
      })
      .expect(201);
  return {
    cookie: result.headers['set-cookie'][0].split(';')[0],
    userId: payload(result).user!.id,
    phone: number,
  };
}
// Privacy tests need verified sessions, not extra OTP traffic from one test IP.
// Keep the production limiter intact; OTP behavior is tested by login() above.
async function privacyIdentity(client = 'application') {
  const number = phone();
  const [user] = await db
    .insert(users)
    .values({ phone: number, phoneVerifiedAt: new Date() })
    .returning();
  userIds.push(user.id);
  const token = randomBytes(32).toString('base64url');
  await db.insert(authSessions).values({
    userId: user.id,
    client,
    tokenHash: tokenHash(token),
    device: 'Privacy fixture',
    expiresAt: new Date(Date.now() + 3600000),
  });
  const cookie = `gym4me_${client}=${token}`;
  await call('post', 'profile/account/privacy/preferences', client, cookie)
    .send({
      acceptPolicy: true,
      confirmMinimumAge: true,
      policyVersion: app.get(PrivacyService).policy().version,
    })
    .expect(201);
  return { cookie, userId: user.id, phone: number };
}
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () =>
            validateEnvironment({
              DATABASE_URL: databaseUrl,
              NODE_ENV: 'test',
              AUTH_SECRET: randomUUID() + randomUUID(),
            }),
        ],
      }),
      AuthModule,
      WorkspacesModule,
    ],
  })
    .overrideProvider(KavenegarService)
    .useValue({ sendOtp })
    .compile();
  app = module.createNestApplication();
  db = module.get(DatabaseService).db;
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  configureApi(app, {
    corsOrigins: ['http://localhost:7083'],
    docsEnabled: false,
  });
  await app.init();
  business = await login();
  other = await login();
  admin = await login('admin');
  await db.insert(platformAdmins).values({ userId: admin.userId });
}, 30000);
afterAll(async () => {
  if (!db) return;
  // This suite uses the dedicated test database. Remove only its own identities and organizations.
  for (const id of orgIds) {
    await db.delete(auditEvents).where(eq(auditEvents.organizationId, id));
    await db
      .delete(organizationInvitations)
      .where(eq(organizationInvitations.organizationId, id));
    await db.delete(clubs).where(eq(clubs.id, id));
    await db
      .delete(organizationMembers)
      .where(eq(organizationMembers.organizationId, id));
    await db.delete(branches).where(eq(branches.organizationId, id));
    await db.delete(organizations).where(eq(organizations.id, id));
  }
  for (const id of userIds) {
    await db
      .delete(auditEvents)
      .where(or(eq(auditEvents.actorId, id), eq(auditEvents.targetId, id)));
    await db.delete(branchCoaches).where(eq(branchCoaches.coachId, id));
    await db.delete(coachProfiles).where(eq(coachProfiles.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  for (const id of challengeIds)
    await db.delete(otpChallenges).where(eq(otpChallenges.id, id));
  // A fresh AUTH_SECRET makes rate-limit keys unique to each run; expiry cleanup is independent.
  await app?.close();
});
test('normalizes Iranian numbers and rejects role injection and missing client headers', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/auth/otp/request')
    .send({ phone: '09123456789' })
    .expect(400);
  await call('post', 'auth/otp/request')
    .send({ phone: phone(), role: 'admin' })
    .expect(400);
  await call('get', 'profile/account').expect(401);
  await call('patch', 'profile/account', 'business', business.cookie)
    .send({ displayName: 'Test', status: 'active', role: 'admin' })
    .expect(400);
});
test('blocks foreign origins and prevents cross-surface cookies', async () => {
  await call('get', 'profile/account', 'business', business.cookie)
    .set('Origin', 'https://evil.example')
    .expect(403);
  await call('get', 'profile/account', 'admin', business.cookie).expect(401);
  await call('post', 'auth/otp/request', 'admin')
    .set('Origin', 'http://localhost:7083')
    .send({ phone: phone() })
    .expect(403);
});
test('GET cookie requests require an origin or matching referer', async () => {
  await call('get', 'profile/account', 'business', business.cookie)
    .unset('Origin')
    .expect(403);
  await call('get', 'profile/account', 'business', business.cookie)
    .unset('Origin')
    .set('Referer', 'http://localhost:7082/')
    .expect(403);
  await call('get', 'profile/account', 'business', business.cookie)
    .unset('Origin')
    .set('Referer', 'http://localhost:7083/profile')
    .expect(200);
});
test('an OTP is single-use even with concurrent verification', async () => {
  const number = phone();
  const id = await challenge(number);
  const results = await Promise.all(
    [1, 2].map(() =>
      call('post', 'auth/otp/verify').send({
        challengeId: id,
        code: delivered.get(number),
      }),
    ),
  );
  expect(results.map((r) => r.status).sort()).toEqual([201, 401]);
  userIds.push(payload(results.find((r) => r.status === 201)!).user!.id);
});
test('five wrong attempts persist and lock the challenge', async () => {
  const number = phone();
  const id = await challenge(number);
  const wrong = delivered.get(number) === '11111' ? '22222' : '11111';
  for (let i = 0; i < 5; i++)
    await call('post', 'auth/otp/verify')
      .send({ challengeId: id, code: wrong })
      .expect(401);
  await call('post', 'auth/otp/verify')
    .send({ challengeId: id, code: delivered.get(number) })
    .expect(401);
  expect(
    (await db.select().from(otpChallenges).where(eq(otpChallenges.id, id)))[0]
      .attempts,
  ).toBe(5);
});
test('expired and unsent challenges cannot log in', async () => {
  const number = phone();
  const id = await challenge(number);
  await db
    .update(otpChallenges)
    .set({ expiresAt: new Date(0) })
    .where(eq(otpChallenges.id, id));
  await call('post', 'auth/otp/verify')
    .send({ challengeId: id, code: delivered.get(number) })
    .expect(401);
  await db
    .update(otpChallenges)
    .set({ expiresAt: new Date(Date.now() + 120000), sentAt: null })
    .where(eq(otpChallenges.id, id));
  await call('post', 'auth/otp/verify')
    .send({ challengeId: id, code: delivered.get(number) })
    .expect(401);
});
test('resend cooldown is shared across client surfaces', async () => {
  const number = phone();
  await challenge(number);
  await call('post', 'auth/otp/request', 'admin')
    .send({ phone: number })
    .expect(429);
});
test('resending invalidates the previous code', async () => {
  const number = phone();
  const first = await challenge(number);
  const oldCode = delivered.get(number);
  await db
    .update(otpChallenges)
    .set({ createdAt: new Date(Date.now() - 61000) })
    .where(eq(otpChallenges.id, first));
  const second = await challenge(number);
  await call('post', 'auth/otp/verify')
    .send({ challengeId: first, code: oldCode })
    .expect(401);
  const result = await call('post', 'auth/otp/verify')
    .send({ challengeId: second, code: delivered.get(number) })
    .expect(201);
  userIds.push(payload(result).user!.id);
});
test('profile changes are persisted and sessions can only be revoked by their owner', async () => {
  await call('patch', 'profile/account', 'business', business.cookie)
    .send({ displayName: 'مالک آزمایشی' })
    .expect(200);
  expect(
    payload(await call('get', 'profile/account', 'business', business.cookie))
      .displayName,
  ).toBe('مالک آزمایشی');
  const sessions = await call(
    'get',
    'auth/sessions',
    'business',
    business.cookie,
  ).expect(200);
  expect(z.array(z.unknown()).parse(sessions.body)[0]).not.toHaveProperty(
    'tokenHash',
  );
  await call(
    'post',
    `auth/sessions/${z.array(z.object({ id: z.string() })).parse(sessions.body)[0].id}/revoke`,
    'business',
    other.cookie,
  ).expect(403);
});
test('organization creation atomically grants ownership; another tenant cannot access it', async () => {
  const result = await call(
    'post',
    'business/organizations',
    'business',
    business.cookie,
  )
    .send({ name: 'باشگاه تست' })
    .expect(201);
  organizationId = payload(result).id!;
  orgIds.push(organizationId);
  await call(
    'post',
    `business/organizations/${organizationId}/branches`,
    'business',
    business.cookie,
  )
    .send({ name: 'شعبه مرکزی' })
    .expect(409);
  // Basic includes the automatically created main branch. PH5 tests plan
  // transitions; these authorization scenarios explicitly need multiple branches.
  await db.execute(sql`UPDATE business_subscriptions SET plan_code='pro',
    terms_snapshot='{"branchLimit":20,"advancedFinance":true}'::jsonb
    WHERE organization_id=${organizationId}`);
  await call(
    'post',
    `business/organizations/${organizationId}/branches`,
    'business',
    business.cookie,
  )
    .send({ name: 'شعبه مرکزی' })
    .expect(201);
  await call(
    'get',
    `business/organizations/${organizationId}/branches`,
    'business',
    other.cookie,
  ).expect(403);
  await call(
    'post',
    `business/organizations/${organizationId}/branches`,
    'business',
    other.cookie,
  )
    .send({ name: 'غیرمجاز' })
    .expect(403);
  await call(
    'get',
    `business/organizations/${organizationId}/team`,
    'business',
    other.cookie,
  ).expect(403);
});
test('only invited phone can accept and revoking a member takes effect immediately', async () => {
  const invitation = await call(
    'post',
    `business/organizations/${organizationId}/invitations`,
    'business',
    business.cookie,
  )
    .send({
      ...{ phone: other.phone, role: 'manager' },
      reason: 'تغییر آزمایشی ثبت‌شده',
    })
    .expect(201);
  await call(
    'post',
    `profile/invitations/${payload(invitation).id}/accept`,
    'business',
    business.cookie,
  ).expect(404);
  await call(
    'post',
    `profile/invitations/${payload(invitation).id}/accept`,
    'business',
    other.cookie,
  ).expect(201);
  await call(
    'post',
    `profile/invitations/${payload(invitation).id}/accept`,
    'business',
    other.cookie,
  ).expect(409);
  await call(
    'post',
    `business/organizations/${organizationId}/branches`,
    'business',
    other.cookie,
  )
    .send({ name: 'شعبه مدیر' })
    .expect(201);
  await call(
    'post',
    `business/organizations/${organizationId}/invitations`,
    'business',
    other.cookie,
  )
    .send({
      ...{ phone: phone(), role: 'manager' },
      reason: 'تغییر آزمایشی ثبت‌شده',
    })
    .expect(403);
  const member = (
    await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, other.userId),
        ),
      )
  )[0];
  await call(
    'post',
    `business/organizations/${organizationId}/team/${member.id}/remove`,
    'business',
    business.cookie,
  )
    .send({ reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(201);
  await call(
    'get',
    `business/organizations/${organizationId}/branches`,
    'business',
    other.cookie,
  ).expect(403);
});
test('an owner cannot be removed', async () => {
  const member = (
    await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, business.userId),
        ),
      )
  )[0];
  await call(
    'post',
    `business/organizations/${organizationId}/team/${member.id}/remove`,
    'business',
    business.cookie,
  )
    .send({ reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(403);
});
test('admin permission is checked independently of login and review records an audit event', async () => {
  const plainAdmin = await login('admin');
  await call('get', 'admin/users', 'admin', plainAdmin.cookie).expect(403);
  await call('get', 'admin/users', 'admin', admin.cookie).expect(200);
  await call(
    'post',
    `admin/organizations/${organizationId}/review`,
    'admin',
    admin.cookie,
  )
    .send({ status: 'approved', reason: 'مدارک بررسی و تأیید شد' })
    .expect(201);
  expect(
    (
      await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
    )[0].status,
  ).toBe('approved');
  expect(
    (
      await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.organizationId, organizationId),
            eq(auditEvents.action, 'organization.reviewed'),
          ),
        )
    ).length,
  ).toBe(1);
  await call(
    'patch',
    `admin/users/${admin.userId}/status`,
    'admin',
    admin.cookie,
  )
    .send({ status: 'suspended', reason: 'تست ممنوعیت' })
    .expect(403);
});
test('suspension revokes existing sessions and does not resurrect them on reactivation', async () => {
  await call(
    'patch',
    `admin/users/${other.userId}/status`,
    'admin',
    admin.cookie,
  )
    .send({ status: 'suspended', reason: 'بررسی حساب آزمایشی' })
    .expect(200);
  await call('get', 'profile/account', 'business', other.cookie).expect(401);
  await call(
    'patch',
    `admin/users/${other.userId}/status`,
    'admin',
    admin.cookie,
  )
    .send({ status: 'active', reason: 'بررسی تکمیل شد' })
    .expect(200);
  await call('get', 'profile/account', 'business', other.cookie).expect(401);
});
test('logout invalidates the session server-side', async () => {
  await call(
    'post',
    'auth/sessions/logout',
    'business',
    business.cookie,
  ).expect(201);
  await call('get', 'profile/account', 'business', business.cookie).expect(401);
});

test('hourly phone quota survives cooldown expiration', async () => {
  const number = phone();
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = await challenge(number);
    await db
      .update(otpChallenges)
      .set({ createdAt: new Date(Date.now() - 61000) })
      .where(eq(otpChallenges.id, id));
  }
  await call('post', 'auth/otp/request').send({ phone: number }).expect(429);
});

test('concurrent sends produce only one SMS for a phone', async () => {
  const number = phone();
  const before = sendOtp.mock.calls.length;
  const results = await Promise.all(
    [1, 2].map(() => call('post', 'auth/otp/request').send({ phone: number })),
  );
  expect(results.map((r) => r.status).sort()).toEqual([201, 429]);
  challengeIds.push(
    payload(results.find((r) => r.status === 201)!).challengeId!,
  );
  expect(sendOtp.mock.calls.length - before).toBe(1);
});

test('failed SMS delivery cannot leave a usable challenge', async () => {
  const number = phone();
  sendOtp.mockImplementationOnce(() =>
    Promise.reject(new ServiceUnavailableException('ارسال پیامک انجام نشد.')),
  );
  await call('post', 'auth/otp/request').send({ phone: number }).expect(503);
  const [row] = await db
    .select()
    .from(otpChallenges)
    .where(eq(otpChallenges.phone, number));
  challengeIds.push(row.id);
  expect(row.sentAt).toBeNull();
  expect(row.consumedAt).not.toBeNull();
});

test('native OTP issues a bearer restricted to its native application session and never accepts web cookies', async () => {
  const number = phone();
  const native = (method: 'get' | 'post', path: string, bearer?: string) => {
    const query = request(app.getHttpServer())
      [method](`/api/v1/${path}`)
      .set('x-gym-client', 'application')
      .set('x-gym-platform', 'native')
      .set('Origin', 'capacitor://localhost');
    return bearer ? query.set('Authorization', `Bearer ${bearer}`) : query;
  };
  const sent = await native('post', 'auth/otp/request')
    .send({ phone: number })
    .expect(201);
  const challengeId = payload(sent).challengeId!;
  challengeIds.push(challengeId);
  await call('post', 'auth/otp/verify', 'application')
    .send({ challengeId, code: delivered.get(number) })
    .expect(401);
  const session = await native('post', 'auth/otp/verify')
    .send({ challengeId, code: delivered.get(number) })
    .expect(201);
  const data = session.body as {
    token: string;
    sessionId: string;
    user: { id: string };
  };
  userIds.push(data.user.id);
  expect(data.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(session.headers['set-cookie']).toBeUndefined();
  await native('get', 'profile/account', data.token).expect(200);
  await call(
    'get',
    'profile/account',
    'application',
    `gym4me_application=${data.token}`,
  ).expect(401);
  await native('get', 'profile/account')
    .set('Cookie', business.cookie)
    .expect(401);
  await native('get', 'profile/account', data.token)
    .set('x-gym-client', 'admin')
    .expect(403);
  await native('post', 'auth/sessions/logout', data.token).expect(201);
  await native('get', 'profile/account', data.token).expect(401);
});
test('phone changes require a recent session, bind challenges to that session and revoke every prior device', async () => {
  const person = await login('application');
  const otherTokens = [
    randomBytes(32).toString('base64url'),
    randomBytes(32).toString('base64url'),
    randomBytes(32).toString('base64url'),
  ];
  await db.insert(authSessions).values(
    otherTokens.map((token, index) => ({
      userId: person.userId,
      client: index === 0 ? 'business' : 'application',
      transport: index === 1 ? ('native' as const) : ('web' as const),
      tokenHash: tokenHash(token),
      device: 'Phone change other device',
      expiresAt: new Date(Date.now() + 3600000),
    })),
  );
  const newNumber = phone();
  const sent = await call(
    'post',
    'profile/account/phone/request',
    'application',
    person.cookie,
  )
    .send({ phone: newNumber })
    .expect(201);
  const challengeId = payload(sent).challengeId!;
  challengeIds.push(challengeId);
  await call('post', 'auth/otp/verify', 'application')
    .send({ challengeId, code: delivered.get(newNumber) })
    .expect(401);
  await call(
    'post',
    'profile/account/phone/verify',
    'application',
    person.cookie,
  )
    .send({
      challengeId,
      code: delivered.get(newNumber) === '00000' ? '11111' : '00000',
    })
    .expect(401)
    .expect((response) => {
      expect(response.body).toMatchObject({
        code: 'Backend.theCodeIsIncorrectOrExpired',
      });
    });
  await call('get', 'profile/account', 'application', person.cookie).expect(
    200,
  );
  await call(
    'post',
    'profile/account/phone/verify',
    'application',
    `gym4me_application=${otherTokens[2]}`,
  )
    .send({ challengeId, code: delivered.get(newNumber) })
    .expect(401);
  const finished = await call(
    'post',
    'profile/account/phone/verify',
    'application',
    person.cookie,
  )
    .send({ challengeId, code: delivered.get(newNumber) })
    .expect(201);
  expect(finished.body).toEqual({ success: true });
  await call('get', 'profile/account', 'application', person.cookie).expect(
    401,
  );
  const [changed] = await db
    .select()
    .from(users)
    .where(eq(users.id, person.userId));
  expect(changed.phone).toBe(newNumber);
  const devices = await db
    .select()
    .from(authSessions)
    .where(eq(authSessions.userId, person.userId));
  expect(devices).toHaveLength(4);
  expect(devices.every((device) => device.revokedAt !== null)).toBe(true);
  await call(
    'get',
    'profile/account',
    'business',
    `gym4me_business=${otherTokens[0]}`,
  ).expect(401);
  await call(
    'get',
    'profile/account',
    'application',
    `gym4me_application=${otherTokens[2]}`,
  ).expect(401);
  await request(app.getHttpServer())
    .get('/api/v1/profile/account')
    .set('x-gym-client', 'application')
    .set('x-gym-platform', 'native')
    .set('Origin', 'capacitor://localhost')
    .set('Authorization', `Bearer ${otherTokens[1]}`)
    .expect(401);
  // Model the elapsed resend cooldown on this consumed test-only challenge.
  await db
    .update(otpChallenges)
    .set({ createdAt: new Date(Date.now() - 61000) })
    .where(eq(otpChallenges.id, challengeId));
  const newLoginChallenge = await challenge(newNumber, 'application');
  const signedInAgain = await call('post', 'auth/otp/verify', 'application')
    .send({ challengeId: newLoginChallenge, code: delivered.get(newNumber) })
    .expect(201);
  expect(payload(signedInAgain).user!.id).toBe(person.userId);

  const [event] = await db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.actorId, person.userId),
        eq(auditEvents.action, 'account.phone_changed'),
      ),
    );
  expect(event.action).toBe('account.phone_changed');
  expect(JSON.stringify(event.details)).not.toContain(newNumber);
  const staleSession: typeof business = await login('application');
  await db
    .update(authSessions)
    .set({ createdAt: new Date(Date.now() - 11 * 60000) })
    .where(eq(authSessions.userId, staleSession.userId));
  await call(
    'post',
    'profile/account/phone/request',
    'application',
    staleSession.cookie,
  )
    .send({ phone: phone() })
    .expect(403);
});

test('privacy defaults require current policy and age, leave marketing optional and allow clearing optional profile', async () => {
  const person = await login('application', false);
  const policy = app.get(PrivacyService).policy();
  const initial = await call(
    'get',
    'profile/account/privacy',
    'application',
    person.cookie,
  ).expect(200);
  expect(initial.body).toMatchObject({
    acceptanceRequired: true,
    marketingConsent: false,
    canRequestDeletion: true,
  });
  const profile = await call(
    'get',
    'profile/account',
    'application',
    person.cookie,
  ).expect(200);
  expect(profile.body).toMatchObject({
    displayName: null,
    profilePublic: false,
  });
  await call('patch', 'profile/account', 'application', person.cookie)
    .send({ displayName: 'نام تازه' })
    .expect(409);
  await call(
    'post',
    'profile/account/privacy/preferences',
    'application',
    person.cookie,
  )
    .send({ acceptPolicy: true, policyVersion: policy.version })
    .expect(400);
  await call(
    'post',
    'profile/account/privacy/preferences',
    'application',
    person.cookie,
  )
    .send({
      acceptPolicy: true,
      confirmMinimumAge: true,
      policyVersion: 'old-policy',
    })
    .expect(409);
  const accepted = await call(
    'post',
    'profile/account/privacy/preferences',
    'application',
    person.cookie,
  )
    .send({
      acceptPolicy: true,
      confirmMinimumAge: true,
      policyVersion: policy.version,
    })
    .expect(201);
  expect(accepted.body).toMatchObject({
    acceptanceRequired: false,
    marketingConsent: false,
  });
  await call('patch', 'profile/account', 'application', person.cookie)
    .send({ displayName: 'نام اختیاری', profilePublic: true })
    .expect(200);
  const cleared = await call(
    'patch',
    'profile/account',
    'application',
    person.cookie,
  )
    .send({ displayName: null, profilePublic: false })
    .expect(200);
  expect(cleared.body).toMatchObject({
    displayName: null,
    profilePublic: false,
  });
  await call(
    'post',
    'profile/account/privacy/preferences',
    'application',
    person.cookie,
  )
    .send({ marketingConsent: true })
    .expect(201);
  const withdrawn = await call(
    'post',
    'profile/account/privacy/preferences',
    'application',
    person.cookie,
  )
    .send({ marketingConsent: false })
    .expect(201);
  expect(
    (withdrawn.body as { marketingConsent: boolean }).marketingConsent,
  ).toBe(false);
  const config = app.get(ConfigService);
  try {
    await call(
      'post',
      'profile/account/privacy/preferences',
      'application',
      person.cookie,
    )
      .send({ marketingConsent: true })
      .expect(201);
    await call('patch', 'profile/account', 'application', person.cookie)
      .send({ profilePublic: true })
      .expect(200);
    config.set('ACCOUNT_MINIMUM_AGE', 21);
    expect(app.get(PrivacyService).policy().version).not.toBe(policy.version);
    const staleAcceptance = await call(
      'post',
      'profile/account/privacy/preferences',
      'application',
      person.cookie,
    )
      .send({
        acceptPolicy: true,
        confirmMinimumAge: true,
        policyVersion: policy.version,
      })
      .expect(409);
    expect(staleAcceptance.body).toBeDefined();
    const refreshed = await call(
      'get',
      'profile/account/privacy',
      'application',
      person.cookie,
    ).expect(200);
    expect(refreshed.body).toMatchObject({
      acceptanceRequired: true,
      policy: {
        minimumAge: 21,
        version: app.get(PrivacyService).policy().version,
      },
    });
    const [unchangedConsent] = await db
      .select()
      .from(accountPreferences)
      .where(eq(accountPreferences.userId, person.userId));
    expect(unchangedConsent.acceptedPolicyVersion).toBe(policy.version);
    expect(unchangedConsent.confirmedMinimumAge).toBe(18);

    await call('patch', 'profile/account', 'application', person.cookie)
      .send({ displayName: 'نام' })
      .expect(409);
    const withdrawal = await call(
      'post',
      'profile/account/privacy/preferences',
      'application',
      person.cookie,
    )
      .send({ marketingConsent: false, hidePublicProfile: true })
      .expect(201);
    expect(withdrawal.body).toMatchObject({
      marketingConsent: false,
      profilePublic: false,
      acceptanceRequired: true,
    });
  } finally {
    config.set('ACCOUNT_MINIMUM_AGE', 18);
  }
});

test('account export is private, rejects user selectors and contains no OTP or session credential', async () => {
  const person = await privacyIdentity('application');
  await db
    .insert(favoriteClubs)
    .values({ userId: person.userId, clubId: organizationId });
  const result = await call(
    'get',
    'profile/account/privacy/export',
    'application',
    person.cookie,
  ).expect(200);
  const exported = result.body as {
    account: { id: string; phone: string };
    favorites: { clubId: string }[];
    memberships: unknown[];
  };
  expect(exported.account).toMatchObject({
    id: person.userId,
    phone: person.phone,
  });
  expect(exported.favorites).toEqual([
    expect.objectContaining({ clubId: organizationId }),
  ]);
  expect(exported.memberships).toEqual([]);
  expect(result.headers['cache-control']).toBe('no-store');
  expect(result.headers['content-disposition']).toContain(
    'gym4me-account.json',
  );
  const serialized = JSON.stringify(exported);
  for (const forbidden of [
    'tokenHash',
    'codeHash',
    'requestedSessionId',
    other.phone,
    business.phone,
  ])
    expect(serialized).not.toContain(forbidden);
  await call(
    'get',
    `profile/account/privacy/export?userId=${other.userId}`,
    'application',
    person.cookie,
  ).expect(400);
  const second = await privacyIdentity('business');
  const otherExport = await call(
    'get',
    'profile/account/privacy/export',
    'business',
    second.cookie,
  ).expect(200);
  expect((otherExport.body as { account: { id: string } }).account.id).toBe(
    second.userId,
  );
  await call('get', 'profile/account/privacy/export', 'application').expect(
    401,
  );
});

test('deletion cannot abandon owner or admin responsibilities and requires recent authentication', async () => {
  const responsible = await privacyIdentity('business');
  const created = await call(
    'post',
    'business/organizations',
    'business',
    responsible.cookie,
  )
    .send({ name: 'مالکیت برای آزمون حذف' })
    .expect(201);
  orgIds.push(payload(created).id!);
  await call(
    'post',
    'profile/account/privacy/deletion',
    'business',
    responsible.cookie,
  )
    .send({ confirm: true })
    .expect(409);
  const activeAdmin = await privacyIdentity('admin');
  await db.insert(platformAdmins).values({ userId: activeAdmin.userId });
  await call(
    'post',
    'profile/account/privacy/deletion',
    'admin',
    activeAdmin.cookie,
  )
    .send({ confirm: true })
    .expect(409);
  const stale = await privacyIdentity('application');
  await db
    .update(authSessions)
    .set({ createdAt: new Date(Date.now() - 11 * 60000) })
    .where(eq(authSessions.userId, stale.userId));
  await call(
    'post',
    'profile/account/privacy/deletion',
    'application',
    stale.cookie,
  )
    .send({ confirm: true })
    .expect(409);
  expect(
    await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, stale.userId)),
  ).toHaveLength(0);
});

test('deletion requests are idempotent and cancellable, dry-run is safe, processing erases own data and blocks stale writers', async () => {
  const person = await privacyIdentity('application');
  const [branch] = await db
    .select({ id: branchProfiles.branchId })
    .from(branchProfiles)
    .where(eq(branchProfiles.clubId, organizationId));
  await db
    .insert(favoriteClubs)
    .values({ userId: person.userId, clubId: organizationId });
  await db
    .insert(coachProfiles)
    .values({ userId: person.userId, biography: 'اطلاعات شخصی آزمایشی' });
  await db
    .insert(branchCoaches)
    .values({ branchId: branch.id, coachId: person.userId, status: 'active' });
  await db
    .insert(organizationMembers)
    .values({ organizationId, userId: person.userId, role: 'receptionist' });
  await db.insert(clubReviews).values({
    branchId: branch.id,
    authorId: person.userId,
    rating: 5,
    body: 'متن حساب حذف‌شونده',
  });
  const [unrelated] = await db
    .insert(clubReviews)
    .values({
      branchId: branch.id,
      authorId: other.userId,
      rating: 4,
      body: 'متن حساب دیگر',
    })
    .returning();
  const first = await call(
    'post',
    'profile/account/privacy/deletion',
    'application',
    person.cookie,
  )
    .send({ confirm: true })
    .expect(201);
  const repeated = await call(
    'post',
    'profile/account/privacy/deletion',
    'application',
    person.cookie,
  )
    .send({ confirm: true })
    .expect(201);
  expect((repeated.body as { deletion: unknown }).deletion).toEqual(
    (first.body as { deletion: unknown }).deletion,
  );
  await call('patch', 'profile/account', 'application', person.cookie)
    .send({ displayName: 'تغییر بعد از درخواست' })
    .expect(409);
  expect((await app.get(RetentionService).run(true)).deletedAccounts).toBe(0);
  await db
    .update(accountDeletionRequests)
    .set({ eligibleAfter: new Date(0) })
    .where(eq(accountDeletionRequests.userId, person.userId));
  const dryRun = await app.get(RetentionService).run();
  expect(dryRun).toMatchObject({
    applied: false,
    eligibleAccounts: 1,
    deletedAccounts: 0,
  });
  expect(
    (await db.select().from(users).where(eq(users.id, person.userId)))[0].phone,
  ).toBe(person.phone);
  await call(
    'post',
    'profile/account/privacy/deletion/cancel',
    'application',
    person.cookie,
  ).expect(201);
  expect((await app.get(RetentionService).run(true)).deletedAccounts).toBe(0);
  await call('patch', 'profile/account', 'application', person.cookie)
    .send({ displayName: 'درخواست لغوشده' })
    .expect(200);
  await call(
    'post',
    'profile/account/privacy/deletion',
    'application',
    person.cookie,
  )
    .send({ confirm: true })
    .expect(201);
  await db
    .update(accountDeletionRequests)
    .set({ eligibleAfter: new Date(0) })
    .where(eq(accountDeletionRequests.userId, person.userId));
  expect(await app.get(RetentionService).run(true)).toMatchObject({
    applied: true,
    deletedAccounts: 1,
  });
  const [tombstone] = await db
    .select()
    .from(users)
    .where(eq(users.id, person.userId));
  expect(tombstone).toMatchObject({
    displayName: null,
    profilePublic: false,
    phoneVerifiedAt: null,
    status: 'suspended',
    deletionPending: false,
  });
  expect(tombstone.phone).not.toBe(person.phone);
  expect(tombstone.deletedAt).toBeInstanceOf(Date);
  const moderator = await privacyIdentity('admin');
  await db.insert(platformAdmins).values({ userId: moderator.userId });
  await call(
    'patch',
    `admin/users/${person.userId}/status`,
    'admin',
    moderator.cookie,
  )
    .send({ status: 'active', reason: 'تلاش بازیابی حساب حذف‌شده' })
    .expect(409);
  for (const [table, column] of [
    [favoriteClubs, favoriteClubs.userId],
    [accountPreferences, accountPreferences.userId],
    [authSessions, authSessions.userId],
    [organizationMembers, organizationMembers.userId],
    [coachProfiles, coachProfiles.userId],
  ] as const)
    expect(
      await db.select().from(table).where(eq(column, person.userId)),
    ).toHaveLength(0);
  expect(
    await db
      .select()
      .from(clubReviews)
      .where(eq(clubReviews.authorId, person.userId)),
  ).toHaveLength(0);
  expect(
    (
      await db
        .select()
        .from(clubReviews)
        .where(eq(clubReviews.id, unrelated.id))
    )[0].body,
  ).toBe('متن حساب دیگر');
  await call('get', 'profile/account', 'application', person.cookie).expect(
    401,
  );
  await expect(
    app.get(ClubService).create(person.userId, { name: 'درخواست قدیمی' }),
  ).rejects.toThrow();
  const newChallenge = await challenge(person.phone, 'application');
  const newLogin = await call('post', 'auth/otp/verify', 'application')
    .send({ challengeId: newChallenge, code: delivered.get(person.phone) })
    .expect(201);
  const newId = payload(newLogin).user!.id;
  userIds.push(newId);
  expect(newId).not.toBe(person.userId);
});

test('retention preserves active and recent records while purging expired records past their retention window', async () => {
  const person = await privacyIdentity('application');
  const policy = app.get(PrivacyService).policy();
  const now = new Date();
  const older = (days: number) =>
    new Date(now.getTime() - (days + 1) * 86400000);
  const recent = new Date(now.getTime() - 86400000);
  const [oldOtp] = await db
    .insert(otpChallenges)
    .values({
      phone: person.phone,
      client: 'application',
      codeHash: 'a'.repeat(64),
      expiresAt: older(policy.otpRetentionDays),
    })
    .returning();
  const [recentOtp] = await db
    .insert(otpChallenges)
    .values({
      phone: person.phone,
      client: 'application',
      codeHash: 'b'.repeat(64),
      expiresAt: recent,
    })
    .returning();
  challengeIds.push(oldOtp.id, recentOtp.id);
  const [oldSession] = await db
    .insert(authSessions)
    .values({
      userId: person.userId,
      client: 'application',
      tokenHash: randomUUID(),
      device: 'Expired fixture',
      expiresAt: older(policy.sessionRetentionDays),
    })
    .returning();
  const [recentSession] = await db
    .insert(authSessions)
    .values({
      userId: person.userId,
      client: 'application',
      tokenHash: randomUUID(),
      device: 'Recent fixture',
      expiresAt: recent,
    })
    .returning();
  const [oldInvite] = await db
    .insert(organizationInvitations)
    .values({
      organizationId,
      phone: person.phone,
      invitedBy: business.userId,
      role: 'receptionist',
      expiresAt: older(policy.invitationRetentionDays),
    })
    .returning();
  const [recentInvite] = await db
    .insert(organizationInvitations)
    .values({
      organizationId,
      phone: person.phone,
      invitedBy: business.userId,
      role: 'receptionist',
      expiresAt: recent,
    })
    .returning();
  const [oldAudit] = await db
    .insert(auditEvents)
    .values({
      actorId: person.userId,
      action: 'fixture.retention',
      createdAt: older(policy.auditRetentionDays),
    })
    .returning();
  const dryRun = await app.get(RetentionService).run(false, now);
  expect(dryRun).toMatchObject({
    applied: false,
    expiredOtp: 1,
    expiredSessions: 1,
    expiredInvites: 1,
    expiredAudit: 1,
  });
  expect(
    await db
      .select()
      .from(otpChallenges)
      .where(eq(otpChallenges.id, oldOtp.id)),
  ).toHaveLength(1);
  await app.get(RetentionService).run(true, now);
  for (const [table, column, id] of [
    [otpChallenges, otpChallenges.id, oldOtp.id],
    [authSessions, authSessions.id, oldSession.id],
    [organizationInvitations, organizationInvitations.id, oldInvite.id],
    [auditEvents, auditEvents.id, oldAudit.id],
  ] as const)
    expect(await db.select().from(table).where(eq(column, id))).toHaveLength(0);
  for (const [table, column, id] of [
    [otpChallenges, otpChallenges.id, recentOtp.id],
    [authSessions, authSessions.id, recentSession.id],
    [organizationInvitations, organizationInvitations.id, recentInvite.id],
  ] as const)
    expect(await db.select().from(table).where(eq(column, id))).toHaveLength(1);
  await call('get', 'profile/account', 'application', person.cookie).expect(
    200,
  );
});

test('newer deletion ledger erases restored identities and sessions, preserves others and replays idempotently', async () => {
  const person = await privacyIdentity('application');
  const survivor = await privacyIdentity('application');
  const retention = app.get(RetentionService);
  const snapshotAt = new Date(Date.now() - 10000);
  const deletedAt = new Date(Date.now() - 5000);
  await db
    .update(users)
    .set({ deletedAt, status: 'suspended' })
    .where(eq(users.id, person.userId));
  const ledger = await retention.exportDeletionLedger();
  expect(ledger.entries).toContainEqual({
    userId: person.userId,
    deletedAt: deletedAt.toISOString(),
  });
  await db
    .update(users)
    .set({
      deletedAt: null,
      status: 'active',
      displayName: 'restored private name',
      profilePublic: true,
    })
    .where(eq(users.id, person.userId));
  expect(
    await retention.replayDeletionLedger(ledger, snapshotAt),
  ).toMatchObject({ applied: false, eligible: 1, erased: 0 });
  expect(
    (await db.select().from(users).where(eq(users.id, person.userId)))[0]
      .displayName,
  ).toBe('restored private name');
  await expect(
    retention.replayDeletionLedger(ledger, new Date(Date.now() + 10000), true),
  ).rejects.toThrow();
  expect(
    await retention.replayDeletionLedger(ledger, snapshotAt, true),
  ).toMatchObject({ erased: 1 });
  const [erased] = await db
    .select()
    .from(users)
    .where(eq(users.id, person.userId));
  expect(erased).toMatchObject({
    status: 'suspended',
    displayName: null,
    profilePublic: false,
    deletedAt,
  });
  expect(erased.phone).not.toBe(person.phone);
  await call('get', 'profile/account', 'application', person.cookie).expect(
    401,
  );
  expect(
    (await db.select().from(users).where(eq(users.id, survivor.userId)))[0]
      .deletedAt,
  ).toBeNull();
  expect(
    await retention.replayDeletionLedger(ledger, snapshotAt, true),
  ).toMatchObject({ eligible: 0, erased: 0 });
});

test('ledger replay refuses restored administrator responsibilities without changing the account', async () => {
  const person = await privacyIdentity('admin');
  await db.insert(platformAdmins).values({ userId: person.userId });
  const ledger = {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: [
      {
        userId: person.userId,
        deletedAt: new Date(Date.now() - 5000).toISOString(),
      },
    ],
  };
  await expect(
    app
      .get(RetentionService)
      .replayDeletionLedger(ledger, new Date(Date.now() - 10000), true),
  ).rejects.toThrow('must be resolved');
  expect(
    (await db.select().from(users).where(eq(users.id, person.userId)))[0]
      .deletedAt,
  ).toBeNull();
});

describe('password authentication', () => {
  const secret = 'Ab1234';
  test('requires fresh OTP, hashes passwords separately, revokes sessions and keeps web/native transports separate', async () => {
    const identity = await privacyIdentity();
    await call('post', 'auth/password', 'application', identity.cookie)
      .send({ password: '12345' })
      .expect(400);
    await call('post', 'auth/password', 'application', identity.cookie)
      .send({ password: '1234567890123456' })
      .expect(400);
    const initial = await call(
      'get',
      'auth/password',
      'application',
      identity.cookie,
    ).expect(200);
    expect(initial.body).toEqual({ hasPassword: false, canSetPassword: true });
    await call('post', 'auth/password', 'application', identity.cookie)
      .send({ password: secret })
      .expect(201);
    await call('get', 'auth/password', 'application', identity.cookie).expect(
      401,
    );
    const [credential] = await db
      .select()
      .from(passwordCredentials)
      .where(eq(passwordCredentials.userId, identity.userId));
    expect(credential.passwordHash).toMatch(/^scrypt-v1\$/);
    expect(credential.passwordHash).not.toContain(secret);
    const success = await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: secret })
      .expect(201);
    expect(success.body).not.toHaveProperty('token');
    expect((success.body as { user: unknown }).user).not.toHaveProperty(
      'passwordHash',
    );
    const cookie = success.headers['set-cookie'][0].split(';')[0];
    expect(success.headers['set-cookie'][0]).toContain('HttpOnly');
    const status = await call(
      'get',
      'auth/password',
      'application',
      cookie,
    ).expect(200);
    expect(status.body).toEqual({ hasPassword: true, canSetPassword: false });
    await call('post', 'auth/password', 'application', cookie)
      .send({ password: 'Ab1234567890123' })
      .expect(403);
    const bad = await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: 'wrong' })
      .expect(401);
    const unknown = await call('post', 'auth/password/login', 'application')
      .send({ phone: phone(), password: 'wrong' })
      .expect(401);
    expect((bad.body as { message: unknown }).message).toEqual(
      (unknown.body as { message: unknown }).message,
    );
    const native = await request(app.getHttpServer())
      .post('/api/v1/auth/password/login')
      .set('x-gym-client', 'application')
      .set('x-gym-platform', 'native')
      .set('Origin', 'https://localhost')
      .send({ phone: identity.phone, password: secret })
      .expect(201);
    expect(native.headers['set-cookie']).toBeUndefined();
    expect((native.body as { token: string }).token).toMatch(
      /^[a-zA-Z0-9_-]{43}$/,
    );
  });
  test('fresh OTP reset invalidates every old session and old password', async () => {
    const identity = await privacyIdentity();
    await call('post', 'auth/password', 'application', identity.cookie)
      .send({ password: secret })
      .expect(201);
    const previous = await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: secret })
      .expect(201);
    const token = randomBytes(32).toString('base64url');
    await db.insert(authSessions).values({
      userId: identity.userId,
      client: 'application',
      tokenHash: tokenHash(token),
      device: 'OTP reset fixture',
      expiresAt: new Date(Date.now() + 3600000),
    });
    const resetCookie = `gym4me_application=${token}`;
    await call('post', 'auth/password', 'application', resetCookie)
      .send({ password: 'Ab1234567890123' })
      .expect(201);
    await call(
      'get',
      'auth/password',
      'application',
      previous.headers['set-cookie'][0].split(';')[0],
    ).expect(401);
    await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: secret })
      .expect(401);
    await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: 'Ab1234567890123' })
      .expect(201);
    await db
      .update(users)
      .set({ status: 'suspended' })
      .where(eq(users.id, identity.userId));
    await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: 'Ab1234567890123' })
      .expect(401);
  });
  test('rejects expired OTP authorization and limits password guessing', async () => {
    const identity = await privacyIdentity();
    await db
      .update(authSessions)
      .set({ createdAt: new Date(Date.now() - 11 * 60000) })
      .where(eq(authSessions.userId, identity.userId));
    await call('post', 'auth/password', 'application', identity.cookie)
      .send({ password: secret })
      .expect(403);
    for (let attempt = 0; attempt < 10; attempt++)
      await call('post', 'auth/password/login', 'application')
        .send({ phone: identity.phone, password: 'wrong' })
        .expect(401);
    await call('post', 'auth/password/login', 'application')
      .send({ phone: identity.phone, password: 'wrong' })
      .expect(429);
  });
});

test('operator bootstrap requires a reason, records its OS actor and does not echo private data', async () => {
  const person = await privacyIdentity('admin');
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.id, person.userId));
  const run = promisify(execFile);
  const options = {
    cwd: resolve(__dirname, '..'),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_OPTIONS: '--max-old-space-size=192',
    },
    timeout: 15000,
  };
  await expect(
    run(
      process.execPath,
      ['--import', 'tsx', 'scripts/grant-admin.ts', account.phone],
      options,
    ),
  ).rejects.toMatchObject({ code: 1 });
  expect(
    await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, person.userId)),
  ).toHaveLength(0);
  const reason = 'private-bootstrap-approval-for-isolated-test';
  const result = await run(
    process.execPath,
    ['--import', 'tsx', 'scripts/grant-admin.ts', account.phone, reason],
    options,
  );
  expect(result.stdout + result.stderr).not.toContain(account.phone);
  expect(result.stdout + result.stderr).not.toContain(reason);
  expect(
    await db
      .select()
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, person.userId)),
  ).toHaveLength(1);
  await run(
    process.execPath,
    ['--import', 'tsx', 'scripts/grant-admin.ts', account.phone, reason],
    options,
  );
  const events = await db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.targetId, person.userId),
        eq(auditEvents.action, 'admin.granted-by-operator'),
      ),
    );
  expect(events).toHaveLength(1);
  expect(events[0].actorId).toBeNull();
  expect(events[0].createdAt).toBeInstanceOf(Date);
  expect(events[0].details).toMatchObject({
    actorKind: 'operator',
    operator: userInfo().username,
    reason,
    source: 'operator-cli',
  });
});

test('expired web and native sessions disappear from lists and cannot read or revoke an active device', async () => {
  const person = await privacyIdentity('business');
  const expiredTokens = [
    randomBytes(32).toString('base64url'),
    randomBytes(32).toString('base64url'),
  ];
  const expired = await db
    .insert(authSessions)
    .values(
      expiredTokens.map((token, index) => ({
        userId: person.userId,
        client: index === 0 ? 'business' : 'application',
        transport: index === 0 ? ('web' as const) : ('native' as const),
        tokenHash: tokenHash(token),
        device: 'Expired session QA',
        expiresAt: new Date(Date.now() - 1000),
      })),
    )
    .returning();
  const list = await call(
    'get',
    'auth/sessions',
    'business',
    person.cookie,
  ).expect(200);
  const sessions = z
    .array(z.object({ id: z.string(), current: z.boolean() }))
    .parse(list.body);
  expect(sessions).toHaveLength(1);
  const active = sessions[0];
  expect(active.current).toBe(true);
  for (const row of expired)
    expect(sessions.some((session) => session.id === row.id)).toBe(false);
  await call(
    'get',
    'profile/account',
    'business',
    `gym4me_business=${expiredTokens[0]}`,
  )
    .expect(401)
    .expect((response) => {
      expect(response.body).toMatchObject({
        code: 'Backend.theSessionHasEndedSignInAgain',
      });
    });
  await call(
    'post',
    `auth/sessions/${active.id}/revoke`,
    'business',
    `gym4me_business=${expiredTokens[0]}`,
  )
    .expect(401)
    .expect((response) => {
      expect(response.body).toMatchObject({
        code: 'Backend.theSessionHasEndedSignInAgain',
      });
    });
  await request(app.getHttpServer())
    .get('/api/v1/profile/account')
    .set('x-gym-client', 'application')
    .set('x-gym-platform', 'native')
    .set('Origin', 'capacitor://localhost')
    .set('Authorization', `Bearer ${expiredTokens[1]}`)
    .expect(401);
  await call('get', 'profile/account', 'business', person.cookie).expect(200);
});
