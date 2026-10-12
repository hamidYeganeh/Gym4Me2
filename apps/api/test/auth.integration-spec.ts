import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { and, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';
import { z } from 'zod';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import {
  auditEvents,
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
async function login(client = 'business') {
  const number = phone();
  const id = await challenge(number, client);
  const result = await call('post', 'auth/otp/verify', client)
    .send({ challengeId: id, code: delivered.get(number) })
    .expect(201);
  userIds.push(payload(result).user!.id);
  expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
  expect(result.headers['set-cookie'][0]).toContain('SameSite=Strict');
  expect(result.body).not.toHaveProperty('token');
  return {
    cookie: result.headers['set-cookie'][0].split(';')[0],
    userId: payload(result).user!.id,
    phone: number,
  };
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
    await db.delete(auditEvents).where(eq(auditEvents.actorId, id));
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
    .send({ phone: other.phone, role: 'manager' })
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
    .send({ phone: phone(), role: 'manager' })
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
  ).expect(201);
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
  ).expect(403);
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
