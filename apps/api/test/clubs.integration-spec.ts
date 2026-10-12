import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';
import { AuthModule } from '../src/modules/auth/auth.module';
import { tokenHash } from '../src/modules/auth/auth.service';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { configureApi } from '../src/platform/http/configure-api';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test';
if (!new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Requires dedicated _test database');
let app: INestApplication<App>;
let db: DatabaseService['db'];
type Identity = { id: string; client: string; cookie: string };
let owner: Identity;
let stranger: Identity;
let admin: Identity;
let athlete: Identity;
let coach: Identity;
const userIds: string[] = [];
const clubIds: string[] = [];
const terms: {
  table: typeof s.sports | typeof s.clubCategories;
  id: string;
}[] = [];
const prefix = randomUUID().slice(0, 8);
let sequence = 0;
const body = <T>(response: Response): T => response.body as T;
const call = (
  method: 'get' | 'post' | 'patch',
  path: string,
  person?: Identity,
) => {
  const req = request(app.getHttpServer())[method](`/api/v1/${path}`);
  if (person)
    req
      .set('x-gym-client', person.client)
      .set(
        'Origin',
        `http://localhost:${person.client === 'admin' ? 7082 : person.client === 'business' ? 7083 : 7081}`,
      )
      .set('Cookie', person.cookie);
  return req;
};
async function identity(client: string) {
  const [u] = await db
    .insert(s.users)
    .values({
      phone: `+989${String(Date.now()).slice(-7)}${String(sequence++).padStart(2, '0')}`,
      displayName: 'آزمایشی',
      phoneVerifiedAt: new Date(),
    })
    .returning();
  userIds.push(u.id);
  const token = randomBytes(32).toString('base64url');
  await db.insert(s.authSessions).values({
    userId: u.id,
    client,
    tokenHash: tokenHash(token),
    device: 'Catalog integration',
    expiresAt: new Date(Date.now() + 3600000),
  });
  return { id: u.id, client, cookie: `gym4me_${client}=${token}` };
}
let clubId: string;
let branchId: string;
let otherClubId: string;
let otherBranchId: string;
let categoryId: string;
let sportId: string;
let mediaId: string;
let countryId: string;
let provinceId: string;
let cityId: string;
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
  }).compile();
  app = module.createNestApplication();
  db = module.get(DatabaseService).db;
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  configureApi(app, {
    corsOrigins: ['http://localhost:7083'],
    docsEnabled: true,
  });
  await app.init();
  owner = await identity('business');
  stranger = await identity('business');
  admin = await identity('admin');
  athlete = await identity('application');
  coach = await identity('application');
  await db.insert(s.platformAdmins).values({ userId: admin.id });
}, 30000);
afterAll(async () => {
  if (!db) return;
  for (const id of clubIds) {
    await db.delete(s.auditEvents).where(eq(s.auditEvents.organizationId, id));
    await db.delete(s.branches).where(eq(s.branches.organizationId, id));
    await db.delete(s.clubs).where(eq(s.clubs.id, id));
    await db.delete(s.clubMedia).where(eq(s.clubMedia.organizationId, id));
    await db
      .delete(s.organizationMembers)
      .where(eq(s.organizationMembers.organizationId, id));
    await db.delete(s.organizations).where(eq(s.organizations.id, id));
  }
  for (const id of userIds) {
    await db.delete(s.auditEvents).where(eq(s.auditEvents.actorId, id));
    await db.delete(s.coachProfiles).where(eq(s.coachProfiles.userId, id));
    await db.delete(s.users).where(eq(s.users.id, id));
  }
  for (const term of terms)
    await db.delete(term.table).where(eq(term.table.id, term.id));
  if (cityId) await db.delete(s.cities).where(eq(s.cities.id, cityId));
  if (provinceId)
    await db.delete(s.provinces).where(eq(s.provinces.id, provinceId));
  if (countryId)
    await db.delete(s.countries).where(eq(s.countries.id, countryId));
  await app?.close();
});
test('only admin creates taxonomies; they are available to public clients', async () => {
  await call('post', 'admin/taxonomies/club-categories', owner)
    .send({ name: 'باشگاه', slug: `club-${prefix}` })
    .expect(403);
  const category = body<{ id: string }>(
    await call('post', 'admin/taxonomies/club-categories', admin)
      .send({ name: 'باشگاه', slug: `club-${prefix}` })
      .expect(201),
  );
  categoryId = category.id;
  terms.push({ table: s.clubCategories, id: categoryId });
  const sport = body<{ id: string }>(
    await call('post', 'admin/taxonomies/sports', admin)
      .send({ name: 'شنا', slug: `swim-${prefix}` })
      .expect(201),
  );
  sportId = sport.id;
  terms.push({ table: s.sports, id: sportId });
  const list = body<{ id: string }[]>(
    await call('get', 'catalog/taxonomies/club-categories').expect(200),
  );
  expect(list.some((v) => v.id === categoryId)).toBe(true);
});
test('creates a club, owner membership and main branch atomically from name alone', async () => {
  const club = body<{
    id: string;
    ownerId: string;
    owner: { id: string; phone?: string };
    branches: { id: string; isMain: boolean }[];
    publicationStatus: string;
  }>(
    await call('post', 'business/clubs', owner)
      .send({ name: 'باشگاه آزمایشی' })
      .expect(201),
  );
  clubId = club.id;
  clubIds.push(clubId);
  branchId = club.branches[0].id;
  expect(club.ownerId).toBe(owner.id);
  expect(club.owner).not.toHaveProperty('phone');
  expect(club.branches[0].isMain).toBe(true);
  expect(club.publicationStatus).toBe('draft');
  const other = body<{ id: string; branches: { id: string }[] }>(
    await call('post', 'business/clubs', stranger)
      .send({ name: 'باشگاه دوم' })
      .expect(201),
  );
  otherClubId = other.id;
  clubIds.push(otherClubId);
  otherBranchId = other.branches[0].id;
  await call('get', `catalog/clubs/${clubId}`).expect(404);
});
test('missing fields and removed or server-controlled fields are rejected', async () => {
  await call('post', 'business/clubs', owner).send({}).expect(400);
  for (const extra of [
    { ownerId: stranger.id },
    { serviceModes: ['onsite'] },
    { publicationStatus: 'published' },
  ])
    await call('patch', `business/clubs/${clubId}`, owner)
      .send(extra)
      .expect(400);
  for (const field of ['addressDetails', 'postalCode', 'directions'])
    await call('patch', `business/clubs/${clubId}/branches/${branchId}`, owner)
      .send({ location: { [field]: 'x' } })
      .expect(400);
});
test('enforces tenant scoping for club and branch reads and writes', async () => {
  await call('get', `business/clubs/${clubId}`, stranger).expect(403);
  await call('patch', `business/clubs/${clubId}`, stranger)
    .send({ name: 'attack' })
    .expect(403);
  await call(
    'patch',
    `business/clubs/${clubId}/branches/${otherBranchId}`,
    owner,
  )
    .send({ name: 'attack' })
    .expect(404);
});
test('invalid category references rollback club creation and edits', async () => {
  const count = (await db.select().from(s.clubs)).length;
  await call('post', 'business/clubs', owner)
    .send({ name: 'رد شود', categoryIds: [randomUUID()] })
    .expect(400);
  expect((await db.select().from(s.clubs)).length).toBe(count);
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ name: 'نباید ذخیره شود', categoryIds: [sportId] })
    .expect(400);
  expect(
    body<{ name: string }>(await call('get', `business/clubs/${clubId}`, owner))
      .name,
  ).toBe('باشگاه آزمایشی');
});
test('media is tenant-owned and video cannot be used as logo or cover', async () => {
  mediaId = body<{ id: string }>(
    await call('post', `business/clubs/${clubId}/media`, owner)
      .send({ type: 'image', url: 'https://example.com/club.jpg' })
      .expect(201),
  ).id;
  await call('patch', `business/clubs/${otherClubId}`, stranger)
    .send({ logoId: mediaId })
    .expect(400);
  const video = body<{ id: string }>(
    await call('post', `business/clubs/${clubId}/media`, owner)
      .send({ type: 'video', url: 'https://example.com/club.mp4' })
      .expect(201),
  );
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ logoId: video.id })
    .expect(400);
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({
      logoId: mediaId,
      coverId: mediaId,
      gallery: [{ mediaId }],
      categoryIds: [categoryId],
      sportIds: [sportId],
      description: 'معرفی کامل مجموعه ورزشی',
      shortDescription: null,
      phones: [{ number: '02112345678', isPrimary: true }],
      socials: [
        { platform: 'instagram', link: 'https://instagram.com/example' },
      ],
    })
    .expect(200);
});
test('PostgreSQL rejects cross-club media references and inconsistent owners', async () => {
  await expect(
    db
      .update(s.clubs)
      .set({ logoId: mediaId })
      .where(eq(s.clubs.id, otherClubId)),
  ).rejects.toThrow();
  await expect(
    db
      .update(s.clubs)
      .set({ ownerId: stranger.id })
      .where(eq(s.clubs.id, clubId)),
  ).rejects.toThrow();
  await expect(
    db.insert(s.organizationMembers).values({
      organizationId: clubId,
      userId: stranger.id,
      role: 'owner',
    }),
  ).rejects.toThrow();
});
test('space updates preserve omitted fields and cannot cross branch boundaries', async () => {
  const path = `business/clubs/${clubId}/branches/${branchId}/spaces`;
  const space = body<{ id: string }>(
    await call('post', path, owner)
      .send({
        name: 'سالن اصلی',
        capacity: 20,
        operatingStatus: 'temporarily_closed',
      })
      .expect(201),
  );
  const updated = body<{
    name: string;
    capacity: number | null;
    operatingStatus: string;
  }>(
    await call('patch', `${path}/${space.id}`, owner)
      .send({ capacity: null })
      .expect(200),
  );
  expect(updated).toMatchObject({
    name: 'سالن اصلی',
    capacity: null,
    operatingStatus: 'temporarily_closed',
  });
  await call(
    'patch',
    `business/clubs/${otherClubId}/branches/${otherBranchId}/spaces/${space.id}`,
    stranger,
  )
    .send({ name: 'دسترسی غیرمجاز' })
    .expect(404);
});
test('required publication fields produce structured errors; approval alone does not publish', async () => {
  const readiness = body<{ ready: boolean; errors: { field: string }[] }>(
    await call('get', `business/clubs/${clubId}/readiness`, owner).expect(200),
  );
  expect(readiness.ready).toBe(false);
  expect(readiness.errors.some((e) => e.field.includes('location'))).toBe(true);
  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(400);
});
test('geographic references enforce the country/province/city chain in PostgreSQL', async () => {
  countryId = body<{ id: string }>(
    await call('post', 'admin/locations', admin)
      .send({ kind: 'countries', name: 'کشور آزمایشی', code: 'XZ' })
      .expect(201),
  ).id;
  provinceId = body<{ id: string }>(
    await call('post', 'admin/locations', admin)
      .send({ kind: 'provinces', name: 'استان آزمایشی', parentId: countryId })
      .expect(201),
  ).id;
  cityId = body<{ id: string }>(
    await call('post', 'admin/locations', admin)
      .send({ kind: 'cities', name: 'شهر آزمایشی', parentId: provinceId })
      .expect(201),
  ).id;
  await call('patch', `business/clubs/${clubId}/branches/${branchId}`, owner)
    .send({ location: { countryId, provinceId: randomUUID(), cityId } })
    .expect(400);
  await expect(
    db
      .update(s.branchProfiles)
      .set({ latitude: 120, longitude: 20 })
      .where(eq(s.branchProfiles.branchId, branchId)),
  ).rejects.toThrow();
  await expect(
    db
      .update(s.branchProfiles)
      .set({ clubId: otherClubId })
      .where(eq(s.branchProfiles.branchId, branchId)),
  ).rejects.toThrow();
});
test('persists complete branch profile and overnight hours; rejects overlaps', async () => {
  const path = `business/clubs/${clubId}/branches/${branchId}`;
  await call('patch', path, owner)
    .send({
      location: {
        address: 'نشانی شعبه اصلی',
        coordinates: [35.7, 51.4],
        countryId,
        provinceId,
        cityId,
        cityZone: 'northwest',
      },
      sportIds: [sportId],
      openingHours: {
        weekly: [
          { dayOfWeek: 0, audience: 'women', startMinute: 480, endMinute: 900 },
          { dayOfWeek: 0, audience: 'men', startMinute: 1320, endMinute: 1560 },
        ],
        exceptions: [{ date: '2026-12-01', isClosed: true }],
      },
      audiencePolicies: { audiences: ['women', 'men'], minimumAge: 16 },
      rules: 'رعایت قوانین مجموعه',
      visitInstructions: 'کفش مناسب همراه داشته باشید.',
    })
    .expect(200);
  const result = body<{
    location: { coordinates: [number, number] };
    openingHours: { weekly: { endMinute: number }[] };
  }>(await call('get', path, owner));
  expect(result.location.coordinates[0]).toBe(35.7);
  expect(result.openingHours.weekly.some((w) => w.endMinute === 1560)).toBe(
    true,
  );
  await call('patch', path, owner)
    .send({
      openingHours: {
        weekly: [
          { dayOfWeek: 0, startMinute: 1320, endMinute: 1560 },
          { dayOfWeek: 1, startMinute: 60, endMinute: 180 },
        ],
      },
    })
    .expect(400);
  await call('patch', path, owner)
    .send({
      openingHours: {
        weekly: [
          { dayOfWeek: 0, startMinute: 0, endMinute: 1440, spaceId: null },
        ],
      },
    })
    .expect(400);
});
test('publication requires complete content and admin approval; public owner data stays minimal', async () => {
  const incompleteBranch = body<{ id: string }>(
    await call('post', `business/clubs/${clubId}/branches`, owner)
      .send({ name: 'شعبه در حال تکمیل' })
      .expect(201),
  );
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ logoId: null })
    .expect(200);

  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(403);
  await call(
    'post',
    `business/clubs/${clubId}/publication/submit`,
    owner,
  ).expect(201);
  await call('post', `admin/clubs/${clubId}/review`, admin)
    .send({ status: 'approved', reason: 'اطلاعات برای تست بررسی شد' })
    .expect(201);
  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(201);
  const club = body<{
    owner: object;
    branches: { id: string }[];
    rating: { average: number | null; count: number };
  }>(await call('get', `catalog/clubs/${clubId}`).expect(200));
  expect(club.owner).not.toHaveProperty('phone');
  expect(club.branches.some((b) => b.id === incompleteBranch.id)).toBe(false);
  await call(
    'get',
    `catalog/clubs/${clubId}/branches/${incompleteBranch.id}`,
  ).expect(404);
  expect(club.rating).toEqual({ average: null, count: 0 });
});
test('coach affiliation is visible only after the coach accepts it', async () => {
  await call('post', 'profile/coach', coach)
    .send({ biography: 'مربی شنا' })
    .expect(201);
  const affiliation = body<{ id: string }>(
    await call(
      'post',
      `business/clubs/${clubId}/branches/${branchId}/coaches`,
      owner,
    )
      .send({ coachId: coach.id, sportId })
      .expect(201),
  );
  expect(
    body<{ coaches: unknown[] }>(
      await call('get', `catalog/clubs/${clubId}/branches/${branchId}`),
    ).coaches,
  ).toHaveLength(0);
  await call(
    'post',
    `profile/coach/affiliations/${affiliation.id}/accept`,
    athlete,
  ).expect(404);
  await call(
    'post',
    `profile/coach/affiliations/${affiliation.id}/accept`,
    coach,
  ).expect(201);
  expect(
    body<{ coaches: unknown[] }>(
      await call('get', `catalog/clubs/${clubId}/branches/${branchId}`),
    ).coaches,
  ).toHaveLength(1);
  await call(
    'post',
    `catalog/clubs/${clubId}/branches/${branchId}/reviews`,
    coach,
  )
    .send({ rating: 5 })
    .expect(403);
});
test('reviews are paginated and moderated before affecting ratings; owners can reply', async () => {
  const review = body<{ id: string }>(
    await call(
      'post',
      `catalog/clubs/${clubId}/branches/${branchId}/reviews`,
      athlete,
    )
      .send({ rating: 4, body: 'تجربه خوب' })
      .expect(201),
  );
  expect(
    body<unknown[]>(
      await call('get', `catalog/clubs/${clubId}/branches/${branchId}/reviews`),
    ),
  ).toHaveLength(0);
  await call('post', `admin/reviews/${review.id}/moderate`, admin)
    .send({ status: 'published', reason: 'نظر مطابق قواعد است' })
    .expect(201);
  expect(
    body<{ rating: { average: number; count: number } }>(
      await call('get', `catalog/clubs/${clubId}`),
    ).rating,
  ).toEqual({ average: 4, count: 1 });
  await call(
    'post',
    `business/clubs/${otherClubId}/branches/${otherBranchId}/reviews/${review.id}/reply`,
    stranger,
  )
    .send({ reply: 'غیرمجاز' })
    .expect(404);
  await call(
    'post',
    `business/clubs/${clubId}/branches/${branchId}/reviews/${review.id}/reply`,
    owner,
  )
    .send({ reply: 'از بازخورد شما متشکریم' })
    .expect(201);
});
test('editing published content hides it until it is checked again; optional fields can be cleared', async () => {
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ shortDescription: null, tags: [] })
    .expect(400);
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ shortDescription: null, tagIds: [], gallery: [] })
    .expect(200);
  await call('get', `catalog/clubs/${clubId}`).expect(404);
  expect(
    body<{ gallery: unknown[] }>(
      await call('get', `business/clubs/${clubId}`, owner),
    ).gallery,
  ).toHaveLength(0);
});
test('suspension cannot be lifted by editing or resubmitting content', async () => {
  await call('post', `admin/clubs/${clubId}/review`, admin)
    .send({ status: 'suspended', reason: 'تعلیق آزمایشی' })
    .expect(201);
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ name: 'نام جدید' })
    .expect(200);
  await call(
    'post',
    `business/clubs/${clubId}/publication/submit`,
    owner,
  ).expect(403);
});
test('OpenAPI describes the required name and excludes removed fields', async () => {
  const document = body<{
    paths: Record<
      string,
      {
        post?: {
          requestBody?: {
            content: Record<
              string,
              {
                schema: {
                  required?: string[];
                  properties: Record<string, unknown>;
                };
              }
            >;
          };
        };
      }
    >;
  }>(await call('get', 'system/docs/json').expect(200));
  const schema =
    document.paths['/api/v1/business/clubs'].post!.requestBody!.content[
      'application/json'
    ].schema;
  expect(schema.required).toContain('name');
  expect(schema).not.toHaveProperty('$schema');
  expect(schema.properties.shortDescription).toMatchObject({ nullable: true });
  expect(schema.properties).not.toHaveProperty('ownerId');
  expect(schema.properties).not.toHaveProperty('serviceModes');
});
