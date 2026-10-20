import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq, inArray } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import request, { type Response } from 'supertest';
import sharp from 'sharp';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import { MediaRetentionService } from '../src/modules/clubs/media-retention.service';
import { StorageService } from '../src/modules/clubs/storage.service';
import { ClubService } from '../src/modules/clubs/club.service';
import { PrivacyService } from '../src/modules/profile/privacy.service';
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
let storage: StorageService;
let objects: S3Client;
let mediaBucketCreated = false;
const mediaBucket = `gym4me-catalog-${randomUUID()}`;
const uploadedKeys: string[] = [];
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
  const person = { id: u.id, client, cookie: `gym4me_${client}=${token}` };
  await call('post', 'profile/account/privacy/preferences', person)
    .send({
      acceptPolicy: true,
      confirmMinimumAge: true,
      policyVersion: app.get(PrivacyService).policy().version,
    })
    .expect(201);
  await call('patch', 'profile/account', person)
    .send({ profilePublic: true })
    .expect(200);
  return person;
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
              S3_ENDPOINT:
                process.env.TEST_S3_ENDPOINT ?? 'http://127.0.0.1:8333',
              S3_ACCESS_KEY_ID:
                process.env.TEST_S3_ACCESS_KEY_ID ?? 'gym4me_local',
              S3_SECRET_ACCESS_KEY:
                process.env.TEST_S3_SECRET_ACCESS_KEY ?? 'gym4me_local_storage',
              S3_BUCKET: mediaBucket,
            }),
        ],
      }),
      AuthModule,
      WorkspacesModule,
    ],
  }).compile();
  app = module.createNestApplication();
  db = module.get(DatabaseService).db;
  storage = module.get(StorageService);
  objects = new S3Client({
    endpoint: process.env.TEST_S3_ENDPOINT ?? 'http://127.0.0.1:8333',
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID ?? 'gym4me_local',
      secretAccessKey:
        process.env.TEST_S3_SECRET_ACCESS_KEY ?? 'gym4me_local_storage',
    },
  });
  await objects.send(new CreateBucketCommand({ Bucket: mediaBucket }));
  mediaBucketCreated = true;
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
  await app.listen(0, '127.0.0.1');
  owner = await identity('business');
  stranger = await identity('business');
  admin = await identity('admin');
  athlete = await identity('application');
  coach = await identity('application');
  await db.insert(s.platformAdmins).values({ userId: admin.id });
}, 30000);
afterAll(async () => {
  if (!db) return;
  if (mediaBucketCreated) {
    for (const key of uploadedKeys) await storage.delete(key);
    for await (const object of storage.objects(''))
      await storage.delete(object.key);
    await objects.send(new DeleteBucketCommand({ Bucket: mediaBucket }));
  }
  objects?.destroy();
  for (const id of clubIds) {
    await db.delete(s.auditEvents).where(eq(s.auditEvents.organizationId, id));
    await db.delete(s.tariffGroups).where(eq(s.tariffGroups.clubId, id));
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
test('branch freshness advances for name, timezone and child-only edits; invalid edits preserve it', async () => {
  const path = `business/clubs/${clubId}/branches/${branchId}`;
  const original = body<{
    name: string;
    timezone: string;
    openingHours: object;
  }>(await call('get', path, owner).expect(200));
  const old = new Date('2020-01-01T00:00:00Z');
  for (const change of [
    { name: original.name },
    { timezone: original.timezone },
    { openingHours: original.openingHours },
    { sportIds: [sportId] },
  ]) {
    await db
      .update(s.branchProfiles)
      .set({ updatedAt: old })
      .where(eq(s.branchProfiles.branchId, branchId));
    const edited = body<{ updatedAt: string }>(
      await call('patch', path, owner).send(change).expect(200),
    );
    expect(new Date(edited.updatedAt).getTime()).toBeGreaterThan(old.getTime());
    const [stored] = await db
      .select({ updatedAt: s.branchProfiles.updatedAt })
      .from(s.branchProfiles)
      .where(eq(s.branchProfiles.branchId, branchId));
    expect(edited.updatedAt).toBe(stored.updatedAt.toISOString());
  }
  const before = body<{ updatedAt: string }>(
    await call('get', path, owner).expect(200),
  );
  await call('patch', path, owner)
    .send({
      openingHours: {
        weekly: [{ dayOfWeek: 8, startMinute: 0, endMinute: 1 }],
      },
    })
    .expect(400);
  expect(
    body<{ updatedAt: string }>(await call('get', path, owner).expect(200))
      .updatedAt,
  ).toBe(before.updatedAt);
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
test('public discovery returns real cover, geography and taxonomy with scoped filters', async () => {
  await app
    .get(ClubService)
    .listPublic({ page: 1, search: '', sort: 'recent' });
  const list = body<
    {
      id: string;
      cover: { url: string };
      categories: { id: string }[];
      mainBranch: { address: string; latitude: number; longitude: number };
    }[]
  >(
    await call(
      'get',
      `catalog/clubs?categoryId=${categoryId}&sportId=${sportId}&cityId=${cityId}`,
    ).expect(200),
  );
  const result = list.find((item) => item.id === clubId);
  expect(result).toMatchObject({
    cover: { url: 'https://example.com/club.jpg' },
    mainBranch: { address: 'نشانی شعبه اصلی', latitude: 35.7, longitude: 51.4 },
  });
  expect(result?.categories.some((item) => item.id === categoryId)).toBe(true);
  expect(list.some((item) => item.id === otherClubId)).toBe(false);
  for (const query of [
    `countryId=${countryId}`,
    `provinceId=${provinceId}`,
    `countryId=${countryId}&provinceId=${provinceId}`,
  ]) {
    const scoped = body<{ id: string }[]>(
      await call('get', `catalog/clubs?${query}`).expect(200),
    );
    expect(scoped.some((item) => item.id === clubId)).toBe(true);
  }
  for (const query of [
    `countryId=${randomUUID()}`,
    `provinceId=${randomUUID()}`,
    `countryId=${randomUUID()}&cityId=${cityId}`,
  ])
    expect(
      body<unknown[]>(await call('get', `catalog/clubs?${query}`).expect(200)),
    ).toEqual([]);
  const wrong = body<{ id: string }[]>(
    await call('get', `catalog/clubs?cityId=${randomUUID()}`).expect(200),
  );
  expect(wrong.some((item) => item.id === clubId)).toBe(false);
  const normalized = body<{ id: string }[]>(
    await call(
      'get',
      `catalog/clubs?search=${encodeURIComponent('آزمايشي')}`,
    ).expect(200),
  );
  expect(normalized.some((item) => item.id === clubId)).toBe(true);
  const address = body<{ id: string }[]>(
    await call(
      'get',
      `catalog/clubs?search=${encodeURIComponent('شعبه اصلی')}`,
    ).expect(200),
  );
  expect(address.some((item) => item.id === clubId)).toBe(true);
  for (const query of [
    'categoryId=invalid',
    'page=0',
    'cityId=invalid',
    'countryId=invalid',
    'provinceId=invalid',
    'unknown=true',
  ])
    await call('get', `catalog/clubs?${query}`).expect(400);
});
test('secondary branch location and tariff match together, stay private until complete, and never duplicate clubs', async () => {
  const [secondaryProvince] = await db
    .insert(s.provinces)
    .values({ countryId, name: `استان فرعی ${prefix}` })
    .returning();
  const [city] = await db
    .insert(s.cities)
    .values({ provinceId: secondaryProvince.id, name: `فرعی ${prefix}` })
    .returning();
  const [secondary] = await db
    .insert(s.branches)
    .values({
      organizationId: clubId,
      name: 'شعبه دوم',
      slug: `secondary-${prefix}`,
    })
    .returning();
  const [main] = await db
    .select()
    .from(s.branchProfiles)
    .where(eq(s.branchProfiles.branchId, branchId));
  await db.insert(s.branchProfiles).values({
    ...main,
    branchId: secondary.id,
    isMain: false,
    provinceId: secondaryProvince.id,
    cityId: city.id,
    address: 'نشانی فرعی یکتا',
  });
  const [group] = await db
    .insert(s.tariffGroups)
    .values({ clubId, branchId: secondary.id })
    .returning();
  await db.insert(s.tariffVersions).values({
    groupId: group.id,
    version: 1,
    name: 'تک مراجعه',
    serviceType: 'visit',
    unit: 'visit',
    priceToman: 123456,
    conditions: 'فقط شعبه دوم',
    createdBy: owner.id,
  });
  const rows = async (query: string) =>
    body<
      {
        id: string;
        mainBranch: { id: string };
        startingTariff: { priceToman: number } | null;
      }[]
    >(await call('get', `catalog/clubs?${query}`).expect(200));
  try {
    expect(await rows(`cityId=${city.id}`)).toEqual([]);
    await db.insert(s.branchSports).values({ branchId: secondary.id, sportId });
    await db.insert(s.weeklyHours).values({
      branchId: secondary.id,
      dayOfWeek: 0,
      audience: 'all',
      startMinute: 480,
      endMinute: 900,
    });
    const found = await rows(
      `cityId=${city.id}&maxPrice=123456&serviceType=visit`,
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      id: clubId,
      mainBranch: { id: secondary.id },
      startingTariff: { priceToman: 123456 },
    });
    expect(
      (
        await rows(`countryId=${countryId}&provinceId=${secondaryProvince.id}`)
      )[0]?.mainBranch.id,
    ).toBe(secondary.id);
    expect(await rows(`provinceId=${provinceId}&cityId=${city.id}`)).toEqual(
      [],
    );
    expect(
      await rows(`provinceId=${secondaryProvince.id}&cityId=${cityId}`),
    ).toEqual([]);
    expect(
      await rows(`cityId=${cityId}&maxPrice=123456&serviceType=visit`),
    ).toEqual([]);
    expect(await rows(`cityId=${city.id}&maxPrice=123455`)).toEqual([]);
    expect(
      (await rows(`search=${encodeURIComponent('فرعی یکتا')}`))[0]?.mainBranch
        .id,
    ).toBe(secondary.id);
    const unfiltered = (await rows(`categoryId=${categoryId}`)).filter(
      (row) => row.id === clubId,
    );
    expect(unfiltered).toHaveLength(1);
    expect(unfiltered[0].mainBranch.id).toBe(branchId);
    expect(
      (await rows(`categoryId=${categoryId}&sort=priceLow`))[0]?.mainBranch.id,
    ).toBe(secondary.id);
    await db
      .update(s.branchProfiles)
      .set({ archivedAt: new Date() })
      .where(eq(s.branchProfiles.branchId, secondary.id));
    expect(await rows(`cityId=${city.id}`)).toEqual([]);
  } finally {
    await db.delete(s.tariffGroups).where(eq(s.tariffGroups.id, group.id));
    await db.delete(s.branches).where(eq(s.branches.id, secondary.id));
    await db.delete(s.cities).where(eq(s.cities.id, city.id));
    await db
      .delete(s.provinces)
      .where(eq(s.provinces.id, secondaryProvince.id));
  }
});
test('account favorites merge idempotently, ignore unpublished clubs and isolate users before pagination', async () => {
  await call('get', 'profile/favorites')
    .set('x-gym-client', 'application')
    .set('Origin', 'http://localhost:7081')
    .expect(401);
  await call('get', 'catalog/clubs/saved')
    .set('x-gym-client', 'application')
    .set('Origin', 'http://localhost:7081')
    .expect(401);
  const merge = () =>
    call('post', 'profile/favorites/merge', athlete)
      .send({ ids: [clubId, clubId, otherClubId, randomUUID()] })
      .expect(201);
  const results = await Promise.all([merge(), merge()]);
  results.forEach((result) => expect(body<string[]>(result)).toEqual([clubId]));
  expect(
    body<string[]>(await call('get', 'profile/favorites', coach).expect(200)),
  ).toEqual([]);
  const saved = body<{ id: string }[]>(
    await call('get', 'catalog/clubs/saved?page=1', athlete).expect(200),
  );
  expect(saved.map((club) => club.id)).toEqual([clubId]);
  expect(
    body<unknown[]>(
      await call('get', 'catalog/clubs/saved?page=2', athlete).expect(200),
    ),
  ).toEqual([]);
  expect(
    body<unknown[]>(
      await call('get', 'catalog/clubs/saved', coach).expect(200),
    ),
  ).toEqual([]);
  await call('get', `catalog/clubs/saved?userId=${athlete.id}`, coach).expect(
    400,
  );
  await call('post', 'profile/favorites/merge', athlete)
    .send({ ids: ['not-a-uuid'] })
    .expect(400);
  await call('post', `profile/favorites/${clubId}`, coach)
    .send({ saved: true })
    .expect(201);
  await call('post', `profile/favorites/${clubId}`, athlete)
    .send({ saved: false })
    .expect(201);
  expect(
    body<string[]>(await call('get', 'profile/favorites', athlete).expect(200)),
  ).toEqual([]);
  expect(
    body<string[]>(await call('get', 'profile/favorites', coach).expect(200)),
  ).toEqual([clubId]);
});

test('tariffs keep immutable price and terms versions, publish effective prices and honor filters', async () => {
  const input = {
    name: 'ورودی تک جلسه',
    serviceType: 'visit',
    priceToman: 250000,
    unit: 'visit',
    includedServices: ['رختکن'],
    conditions: 'برای یک مراجعه به شعبهٔ اصلی',
    branchId,
  };
  await call('post', `business/clubs/${clubId}/tariffs`, stranger)
    .send(input)
    .expect(403);
  await call('post', `business/clubs/${clubId}/tariffs`, owner)
    .send({ ...input, branchId: otherBranchId })
    .expect(404);
  const tariff = body<{ id: string; version: number; priceToman: number }>(
    await call('post', `business/clubs/${clubId}/tariffs`, owner)
      .send(input)
      .expect(201),
  );
  expect(tariff).toMatchObject({ version: 1, priceToman: 250000 });
  await call('get', `catalog/clubs/${clubId}`).expect(404);
  const { branchId: _scope, ...terms } = input;
  void _scope;
  const updates = await Promise.all(
    [300000, 350000].map((priceToman) =>
      call(
        'post',
        `business/clubs/${clubId}/tariffs/${tariff.id}/versions`,
        owner,
      )
        .send({ ...{ ...terms, priceToman }, reason: 'تغییر آزمایشی ثبت‌شده' })
        .expect(201),
    ),
  );
  expect(
    updates
      .map((response) => body<{ version: number }>(response).version)
      .sort(),
  ).toEqual([2, 3]);
  const history = body<
    { version: number; priceToman: number; conditions: string }[]
  >(
    await call(
      'get',
      `business/clubs/${clubId}/tariffs/${tariff.id}/versions`,
      owner,
    ).expect(200),
  );
  expect(history.map((version) => version.version)).toEqual([3, 2, 1]);
  expect(history[2]).toMatchObject({
    priceToman: 250000,
    conditions: input.conditions,
  });
  await call(
    'post',
    `business/clubs/${clubId}/tariffs/${tariff.id}/versions`,
    owner,
  )
    .send({ ...{ ...terms, priceToman: -1 }, reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(400);
  await call(
    'post',
    `business/clubs/${otherClubId}/tariffs/${tariff.id}/versions`,
    stranger,
  )
    .send({ ...terms, reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(404);
  const future = body<{ id: string }>(
    await call('post', `business/clubs/${clubId}/tariffs`, owner)
      .send({
        ...input,
        name: 'قیمت آینده',
        priceToman: 1,
        effectiveFrom: '2099-01-01T00:00:00Z',
      })
      .expect(201),
  );
  await call(
    'post',
    `business/clubs/${clubId}/publication/submit`,
    owner,
  ).expect(201);
  await call('post', `admin/clubs/${clubId}/review`, admin)
    .send({ status: 'approved', reason: 'بررسی تعرفهٔ آزمایشی' })
    .expect(201);
  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(201);
  const actual = body<{ tariffs: { id: string; version: number }[] }>(
    await call('get', `catalog/clubs/${clubId}`).expect(200),
  );
  expect(
    actual.tariffs.some((row) => row.id === tariff.id && row.version === 3),
  ).toBe(true);
  expect(actual.tariffs.some((row) => row.id === future.id)).toBe(false);
  const found = body<
    { id: string; startingTariff: { priceToman: number; unit: string } }[]
  >(
    await call(
      'get',
      'catalog/clubs?serviceType=visit&unit=visit&minPrice=250000&maxPrice=400000',
    ).expect(200),
  );
  expect(found.find((row) => row.id === clubId)?.startingTariff).toMatchObject({
    unit: 'visit',
  });
  const excluded = body<{ id: string }[]>(
    await call('get', 'catalog/clubs?serviceType=membership').expect(200),
  );
  expect(excluded.some((row) => row.id === clubId)).toBe(false);
  await call('get', 'catalog/clubs?minPrice=5&maxPrice=1').expect(400);
  await call(
    'post',
    `business/clubs/${clubId}/tariffs/${tariff.id}/status`,
    owner,
  )
    .send({ ...{ isActive: false }, reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(201);
  const disabled = body<{ isActive: boolean }[]>(
    await call('get', `business/clubs/${clubId}/tariffs`, owner).expect(200),
  );
  expect(disabled.some((row) => !row.isActive)).toBe(true);
  await call(
    'post',
    `business/clubs/${clubId}/tariffs/${tariff.id}/status`,
    owner,
  )
    .send({ ...{ isActive: true }, reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(201);
  await call(
    'post',
    `business/clubs/${clubId}/publication/submit`,
    owner,
  ).expect(201);
  await call('post', `admin/clubs/${clubId}/review`, admin)
    .send({ status: 'approved', reason: 'بررسی نهایی تعرفه' })
    .expect(201);
  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(201);
});
test('real S3 images remain private until publication, reject invalid files and delete only unused media', async () => {
  const pixels = await sharp({
    create: { width: 80, height: 60, channels: 3, background: '#22c55e' },
  })
    .png()
    .toBuffer();
  const path = `business/clubs/${clubId}/media/upload`;
  await call('post', path, stranger)
    .attach('file', pixels, { filename: 'image.png', contentType: 'image/png' })
    .expect(403);
  await call('post', path, owner)
    .attach('file', Buffer.from('<svg>invalid</svg>'), {
      filename: 'image.svg',
      contentType: 'image/svg+xml',
    })
    .expect(400);
  await call('post', path, owner)
    .attach('file', Buffer.from('not an image'), {
      filename: 'image.png',
      contentType: 'image/png',
    })
    .expect(400);
  await call('post', path, owner)
    .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), {
      filename: 'oversized.png',
      contentType: 'image/png',
    })
    .expect(413)
    .expect((response) =>
      expect(body<{ code: string }>(response).code).toBe(
        'Backend.payloadTooLarge',
      ),
    );
  await call('post', path, owner).expect(400);
  const media = body<{
    id: string;
    objectKey: string;
    width: number;
    height: number;
    contentType: string;
    sizeBytes: number;
  }>(
    await call('post', path, owner)
      .attach('file', pixels, {
        filename: 'image.png',
        contentType: 'image/png',
      })
      .field('alt', 'تصویر واقعی آزمایشی')
      .expect(201),
  );
  uploadedKeys.push(media.objectKey);
  expect(media).toMatchObject({
    organizationId: clubId,
    uploadedBy: owner.id,
    type: 'image',
    alt: 'تصویر واقعی آزمایشی',
    width: 80,
    height: 60,
    contentType: 'image/webp',
  });
  expect(media.objectKey).toBe(`clubs/${clubId}/${media.id}.webp`);
  expect(media.sizeBytes).toBe((await storage.get(media.objectKey)).length);
  expect(
    (await sharp(await storage.get(media.objectKey)).metadata()).format,
  ).toBe('webp');
  await call('get', `catalog/media/${media.id}`).expect(404);
  await call(
    'get',
    `business/clubs/${clubId}/media/${media.id}/preview`,
    stranger,
  ).expect(403);
  const preview = body<{ url: string; expiresIn: number }>(
    await call(
      'get',
      `business/clubs/${clubId}/media/${media.id}/preview`,
      owner,
    ).expect(200),
  );
  expect(preview.expiresIn).toBe(60);
  const signed = await fetch(preview.url);
  expect(signed.status).toBe(200);
  expect(Buffer.from(await signed.arrayBuffer())).toEqual(
    await storage.get(media.objectKey),
  );
  const unsigned = new URL(preview.url);
  unsigned.search = '';
  const anonymous = await fetch(unsigned);
  expect(anonymous.status).toBe(403);
  await anonymous.body?.cancel();
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ coverId: media.id })
    .expect(200);
  await call(
    'post',
    `business/clubs/${clubId}/publication/submit`,
    owner,
  ).expect(201);
  await call('post', `admin/clubs/${clubId}/review`, admin)
    .send({ status: 'approved', reason: 'بررسی تصویر' })
    .expect(201);
  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(201);
  await call('get', `catalog/media/${media.id}`)
    .expect('Content-Type', /image\/webp/)
    .expect(200);
  await call(
    'post',
    `business/clubs/${clubId}/media/${media.id}/delete`,
    owner,
  ).expect(409);
  await call('patch', `business/clubs/${clubId}`, owner)
    .send({ coverId: mediaId })
    .expect(200);
  await call('get', `catalog/media/${media.id}`).expect(404);
  const unavailable = jest
    .spyOn(storage, 'delete')
    .mockRejectedValueOnce(
      new ServiceUnavailableException('Backend.storageUnavailable'),
    );
  try {
    await call(
      'post',
      `business/clubs/${clubId}/media/${media.id}/delete`,
      owner,
    ).expect(503);
    expect(
      await db.select().from(s.clubMedia).where(eq(s.clubMedia.id, media.id)),
    ).toHaveLength(1);
    expect((await storage.get(media.objectKey)).length).toBe(media.sizeBytes);
  } finally {
    unavailable.mockRestore();
  }
  await call(
    'post',
    `business/clubs/${clubId}/media/${media.id}/delete`,
    owner,
  ).expect(201);
  await expect(storage.get(media.objectKey)).rejects.toThrow(
    'Backend.storageUnavailable',
  );
  await call(
    'get',
    `business/clubs/${clubId}/media/${media.id}/preview`,
    owner,
  ).expect(404);
  await call(
    'post',
    `business/clubs/${clubId}/publication/submit`,
    owner,
  ).expect(201);
  await call('post', `admin/clubs/${clubId}/review`, admin)
    .send({ status: 'approved', reason: 'بررسی نهایی' })
    .expect(201);
  await call(
    'post',
    `business/clubs/${clubId}/publication/publish`,
    owner,
  ).expect(201);
});
test('uploaded images strip camera metadata and scoped previews follow current branch grants', async () => {
  const club = body<{ id: string }>(
    await call('post', 'business/clubs', owner)
      .send({ name: 'مجموعهٔ آزمون رسانهٔ خصوصی' })
      .expect(201),
  );
  clubIds.push(club.id);
  const first = body<{ branches: { id: string }[] }>(
    await call('get', `business/clubs/${club.id}`, owner).expect(200),
  ).branches[0].id;
  const second = body<{ id: string }>(
    await call('post', `business/organizations/${club.id}/branches`, owner)
      .send({ name: 'شعبهٔ دوم رسانه' })
      .expect(201),
  ).id;
  const jpeg = await sharp({
    create: { width: 40, height: 30, channels: 3, background: '#123456' },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: 'qa-private-camera' } } })
    .toBuffer();
  expect((await sharp(jpeg).metadata()).exif).toBeDefined();
  const media: { id: string; objectKey: string }[] = [];
  for (let index = 0; index < 4; index++) {
    const item = body<{ id: string; objectKey: string }>(
      await call('post', `business/clubs/${club.id}/media/upload`, owner)
        .attach('file', jpeg, {
          filename: 'camera.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201),
    );
    uploadedKeys.push(item.objectKey);
    media.push(item);
    const metadata = await sharp(await storage.get(item.objectKey)).metadata();
    expect(metadata).toMatchObject({ width: 40, height: 30, format: 'webp' });
    expect(metadata.exif).toBeUndefined();
    expect(metadata.xmp).toBeUndefined();
    expect(metadata.iptc).toBeUndefined();
  }
  await call('patch', `business/clubs/${club.id}`, owner)
    .send({ gallery: [{ mediaId: media[0].id }] })
    .expect(200);
  await call('patch', `business/clubs/${club.id}/branches/${first}`, owner)
    .send({ gallery: [{ mediaId: media[1].id }] })
    .expect(200);
  await call('patch', `business/clubs/${club.id}/branches/${second}`, owner)
    .send({ gallery: [{ mediaId: media[2].id }] })
    .expect(200);
  const previewPath = (id: string) =>
    `business/clubs/${club.id}/media/${id}/preview`;
  for (const role of ['manager', 'receptionist', 'accountant'] as const) {
    const person = await identity('business');
    const [member] = await db
      .insert(s.organizationMembers)
      .values({
        organizationId: club.id,
        userId: person.id,
        role,
        allBranches: false,
      })
      .returning();
    await db.insert(s.organizationMemberBranches).values({
      organizationId: club.id,
      memberId: member.id,
      branchId: first,
    });
    for (const item of media.slice(0, 2))
      await call('get', previewPath(item.id), person).expect(200);
    for (const item of media.slice(2)) {
      await call('get', previewPath(item.id), person).expect(403);
      await call(
        'post',
        `business/clubs/${club.id}/media/${item.id}/delete`,
        person,
      ).expect(403);
    }
    await call('get', previewPath(mediaId), person).expect(404);
    await db
      .update(s.branchProfiles)
      .set({ archivedAt: new Date() })
      .where(eq(s.branchProfiles.branchId, first));
    await call('get', previewPath(media[1].id), person).expect(403);
    await db
      .update(s.branchProfiles)
      .set({ archivedAt: null })
      .where(eq(s.branchProfiles.branchId, first));
    for (const field of ['coverId', 'logoId']) {
      await call('patch', `business/clubs/${club.id}`, owner)
        .send({ [field]: media[3].id })
        .expect(200);
      await call('get', previewPath(media[3].id), person).expect(200);
      await call('patch', `business/clubs/${club.id}`, owner)
        .send({ [field]: null })
        .expect(200);
      await call('get', previewPath(media[3].id), person).expect(403);
    }
    await db
      .delete(s.organizationMemberBranches)
      .where(eq(s.organizationMemberBranches.memberId, member.id));
    await call('get', previewPath(media[1].id), person).expect(403);
    await call('get', previewPath(media[0].id), person).expect(200);
    await db
      .update(s.organizationMembers)
      .set({ allBranches: true })
      .where(eq(s.organizationMembers.id, member.id));
    for (const item of media)
      await call('get', previewPath(item.id), person).expect(200);
    await db
      .delete(s.organizationMembers)
      .where(eq(s.organizationMembers.id, member.id));
    await call('get', previewPath(media[0].id), person).expect(403);
  }
  await call('get', previewPath(media[3].id), owner).expect(200);
  await call(
    'get',
    `admin/clubs/${club.id}/media/${media[3].id}/preview`,
    admin,
  ).expect(200);
  await call('get', previewPath(media[3].id), stranger).expect(403);
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
    .send({
      status: 'published',
      reason: 'نظر مطابق قواعد است',
      expectedStatus: 'pending',
    })
    .expect(201);
  const moderated = body<
    {
      id: string;
      organizationName: string;
      authorName: string;
      status: string;
    }[]
  >(await call('get', 'admin/reviews?status=published', admin).expect(200));
  expect(moderated.find((r) => r.id === review.id)).toMatchObject({
    status: 'published',
    authorName: 'آزمایشی',
    organizationName: 'باشگاه آزمایشی',
  });
  await call('post', `admin/reviews/${review.id}/moderate`, admin)
    .send({
      status: 'rejected',
      reason: 'تصمیم قدیمی نباید اعمال شود',
      expectedStatus: 'pending',
    })
    .expect(409);
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
test('public names and coach biographies follow revocable privacy choices without changing private records', async () => {
  await call('post', 'profile/account/privacy/preferences', owner)
    .send({ hidePublicProfile: true })
    .expect(201);
  expect(
    body<{ owner: { displayName: string | null } }>(
      await call('get', `catalog/clubs/${clubId}`).expect(200),
    ).owner.displayName,
  ).toBeNull();
  expect(
    body<{ owner: { displayName: string | null } }>(
      await call('get', `business/clubs/${clubId}`, owner).expect(200),
    ).owner.displayName,
  ).toBe('آزمایشی');
  await call('post', 'profile/account/privacy/preferences', coach)
    .send({ hidePublicProfile: true })
    .expect(201);
  const branch = body<{
    coaches: { displayName: string | null; biography: string | null }[];
  }>(
    await call('get', `catalog/clubs/${clubId}/branches/${branchId}`).expect(
      200,
    ),
  );
  expect(branch.coaches[0]).toMatchObject({
    displayName: null,
    biography: null,
  });
  await call('post', 'profile/account/privacy/preferences', athlete)
    .send({ hidePublicProfile: true })
    .expect(201);
  const reviews = body<{ author: string | null }[]>(
    await call(
      'get',
      `catalog/clubs/${clubId}/branches/${branchId}/reviews`,
    ).expect(200),
  );
  expect(reviews[0].author).toBeNull();
  await call('patch', 'profile/account', coach)
    .send({ profilePublic: true })
    .expect(200);
  const restored = body<{
    coaches: { displayName: string | null; biography: string | null }[];
  }>(
    await call('get', `catalog/clubs/${clubId}/branches/${branchId}`).expect(
      200,
    ),
  );
  expect(restored.coaches[0]).toMatchObject({
    displayName: 'آزمایشی',
    biography: 'مربی شنا',
  });
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
  const invitation =
    document.paths[
      '/api/v1/business/organizations/{organizationId}/invitations'
    ].post!.requestBody!.content['application/json'].schema;
  expect(invitation.required).toEqual(['phone', 'role', 'reason']);
  expect(invitation.properties.reason).toMatchObject({
    type: 'string',
    minLength: 3,
    maxLength: 500,
  });
  expect(invitation.properties.branchIds).toMatchObject({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    minItems: 1,
    maxItems: 100,
    uniqueItems: true,
  });
});

test('admin read routes reject unauthenticated, business and unprivileged admin sessions', async () => {
  const unprivileged = await identity('admin');
  for (const path of [
    'admin/overview',
    `admin/users/${owner.id}`,
    `admin/organizations/${clubId}`,
    `admin/clubs/${clubId}/readiness`,
    `admin/clubs/${clubId}/branches/${branchId}`,
    'admin/locations/countries',
    'admin/taxonomies/sports',
    'admin/reviews',
    'admin/audit',
  ]) {
    await call('get', path)
      .set('x-gym-client', 'admin')
      .set('Origin', 'http://localhost:7082')
      .expect(401);
    await call('get', path, owner).expect(403);
    await call('get', path, unprivileged).expect(403);
  }
  await call('patch', `admin/locations/cities/${cityId}`, unprivileged)
    .send({ name: 'غیرمجاز' })
    .expect(403);
});

test('admin dossiers expose memberships and catalog content without session secrets', async () => {
  const user = body<{
    memberships: { organizationId: string }[];
    sessions: Record<string, unknown>[];
    isAdmin: boolean;
  }>(await call('get', `admin/users/${owner.id}`, admin).expect(200));
  expect(user.isAdmin).toBe(false);
  expect(user.memberships.some((m) => m.organizationId === clubId)).toBe(true);
  expect(user.sessions.length).toBeGreaterThan(0);
  for (const session of user.sessions)
    expect(session).not.toHaveProperty('tokenHash');
  const organization = body<{
    hasCatalog: boolean;
    members: { userId: string }[];
    branches: { id: string }[];
  }>(await call('get', `admin/organizations/${clubId}`, admin).expect(200));
  expect(organization.hasCatalog).toBe(true);
  expect(organization.members.some((m) => m.userId === owner.id)).toBe(true);
  expect(organization.branches.some((b) => b.id === branchId)).toBe(true);
  const branch = body<{ location: { coordinates: number[] } }>(
    await call(
      'get',
      `admin/clubs/${clubId}/branches/${branchId}`,
      admin,
    ).expect(200),
  );
  expect(branch.location.coordinates).toEqual([35.7, 51.4]);
  await call(
    'get',
    `admin/clubs/${clubId}/branches/${otherBranchId}`,
    admin,
  ).expect(404);
  expect(
    body<{ ready: boolean }>(
      await call('get', `admin/clubs/${clubId}/readiness`, admin).expect(200),
    ).ready,
  ).toBe(true);
  await call('get', `admin/users/${randomUUID()}`, admin).expect(404);
  await call('get', 'admin/organizations/not-a-uuid', admin).expect(400);
});

test('admin list filters escape wildcards and return actual publication and admin states', async () => {
  const result = body<{ id: string; publicationStatus: string }[]>(
    await call(
      'get',
      'admin/organizations?search=نام%20جدید&status=suspended&publicationStatus=draft',
      admin,
    ).expect(200),
  );
  expect(result.find((r) => r.id === clubId)?.publicationStatus).toBe('draft');
  expect(
    body<unknown[]>(
      await call('get', 'admin/organizations?search=%25', admin).expect(200),
    ),
  ).toHaveLength(0);
  expect(
    body<unknown[]>(
      await call('get', 'admin/users?search=%25', admin).expect(200),
    ),
  ).toHaveLength(0);
  const people = body<{ id: string; isAdmin: boolean }[]>(
    await call('get', 'admin/users?status=active', admin).expect(200),
  );
  expect(people.find((u) => u.id === admin.id)?.isAdmin).toBe(true);
  await call('get', 'admin/users?status=invalid', admin).expect(400);
  const overview = body<{
    pendingPublication: number;
    pendingReviews: number;
    recent: unknown[];
  }>(await call('get', 'admin/overview', admin).expect(200));
  expect(overview.pendingPublication).toEqual(expect.any(Number));
  expect(overview.pendingReviews).toEqual(expect.any(Number));
  expect(overview.recent.length).toBeLessThanOrEqual(5);
});

test('geography renames preserve hierarchy and record an audit event; invalid reassignment is rejected', async () => {
  const renamed = body<{ id: string; provinceId: string; name: string }>(
    await call('patch', `admin/locations/cities/${cityId}`, admin)
      .send({ name: 'شهر ویرایش‌شده' })
      .expect(200),
  );
  expect(renamed).toMatchObject({
    id: cityId,
    provinceId,
    name: 'شهر ویرایش‌شده',
  });
  const cities = body<{ id: string; name: string }[]>(
    await call(
      'get',
      `admin/locations/cities?parentId=${provinceId}`,
      admin,
    ).expect(200),
  );
  expect(cities.find((c) => c.id === cityId)?.name).toBe('شهر ویرایش‌شده');
  await call('patch', `admin/locations/cities/${cityId}`, admin)
    .send({ name: 'شهر', provinceId: randomUUID() })
    .expect(400);
  await call('patch', `admin/locations/cities/${randomUUID()}`, admin)
    .send({ name: 'شهر' })
    .expect(404);
  const events = body<{ targetId: string }[]>(
    await call(
      'get',
      `admin/audit?action=location.updated&actorId=${admin.id}`,
      admin,
    ).expect(200),
  );
  expect(events.some((e) => e.targetId === cityId)).toBe(true);
});

test('inactive taxonomy terms stay in admin but disappear from public choices', async () => {
  await call('patch', `admin/taxonomies/sports/${sportId}`, admin)
    .send({ name: 'رشته ویرایش‌شده', isActive: false })
    .expect(200);
  const adminTerms = body<{ id: string; isActive: boolean }[]>(
    await call(
      'get',
      'admin/taxonomies/sports?search=رشته%20ویرایش',
      admin,
    ).expect(200),
  );
  expect(adminTerms.find((t) => t.id === sportId)?.isActive).toBe(false);
  expect(
    body<{ id: string }[]>(
      await call('get', 'catalog/taxonomies/sports').expect(200),
    ).some((t) => t.id === sportId),
  ).toBe(false);
  await call('patch', `admin/taxonomies/sports/${sportId}`, admin)
    .send({ isActive: true })
    .expect(200);
});

test('audit date filters include Tehran end-of-day and reject invalid ranges', async () => {
  const [included, excluded] = await db
    .insert(s.auditEvents)
    .values([
      {
        actorId: admin.id,
        action: 'admin.test-window',
        createdAt: new Date('2026-06-01T20:29:59.999Z'),
      },
      {
        actorId: admin.id,
        action: 'admin.test-window',
        createdAt: new Date('2026-06-01T20:30:00Z'),
      },
    ])
    .returning();
  const events = body<{ id: string; actorName: string }[]>(
    await call(
      'get',
      `admin/audit?action=admin.test-window&actorId=${admin.id}&from=2026-06-01&to=2026-06-01`,
      admin,
    ).expect(200),
  );
  expect(events.map((e) => e.id)).toContain(included.id);
  expect(events.map((e) => e.id)).not.toContain(excluded.id);
  expect(events[0].actorName).toBe('آزمایشی');
  await call('get', 'admin/audit?from=2026-06-02&to=2026-06-01', admin).expect(
    400,
  );
  await call('get', 'admin/audit?from=invalid', admin).expect(400);
});

test('HTTP errors retain stable codes while messages and validation fields follow the locale', async () => {
  const en = body<{
    code: string;
    message: string;
    fields: { code: string; message: string }[];
  }>(
    await call('post', 'business/clubs', owner)
      .set('Accept-Language', 'en-US')
      .send({})
      .expect(400),
  );
  const fa = body<typeof en>(
    await call('post', 'business/clubs', owner)
      .set('Accept-Language', 'fa')
      .send({})
      .expect(400),
  );
  expect(en.code).toBe('Backend.invalidClubInformation');
  expect(fa.code).toBe(en.code);
  expect(en.message).not.toBe(fa.message);
  expect(en.fields[0].code).toBe('Backend.invalidField');
  expect(en.fields[0].message).not.toBe(fa.fields[0].message);
  const denied = await call('get', `business/clubs/${clubId}`, stranger)
    .set('Accept-Language', 'en')
    .expect(403);
  expect(body<{ code: string }>(denied).code).toMatch(/^Backend\./);
});
test('publication readiness exposes localized copy alongside its field codes', async () => {
  const en = body<{
    errors: { field: string; code: string; message: string }[];
  }>(
    await call('get', `business/clubs/${otherClubId}/readiness`, stranger)
      .set('Accept-Language', 'en')
      .expect(200),
  );
  const fa = body<typeof en>(
    await call('get', `business/clubs/${otherClubId}/readiness`, stranger)
      .set('Accept-Language', 'fa')
      .expect(200),
  );
  expect(en.errors.length).toBeGreaterThan(0);
  expect(en.errors.map((item) => item.code)).toEqual(
    fa.errors.map((item) => item.code),
  );
  expect(en.errors[0].message).not.toBe(fa.errors[0].message);
});

test('scoped invitation restricts the same account to its assigned branch in one of two organizations', async () => {
  const [person] = await db
    .select()
    .from(s.users)
    .where(eq(s.users.id, stranger.id));
  await call('post', `business/organizations/${clubId}/invitations`, owner)
    .send({
      ...{ phone: person.phone, role: 'manager', branchIds: [otherBranchId] },
      reason: 'تغییر آزمایشی ثبت‌شده',
    })
    .expect(400);
  await call('post', `business/organizations/${clubId}/invitations`, owner)
    .send({
      ...{ phone: person.phone, role: 'manager', branchIds: [] },
      reason: 'تغییر آزمایشی ثبت‌شده',
    })
    .expect(400);
  const invitation = body<{ id: string }>(
    await call('post', `business/organizations/${clubId}/invitations`, owner)
      .send({
        ...{ phone: person.phone, role: 'manager', branchIds: [branchId] },
        reason: 'تغییر آزمایشی ثبت‌شده',
      })
      .expect(201),
  );
  await call(
    'post',
    `profile/invitations/${invitation.id}/accept`,
    stranger,
  ).expect(201);
  const owned = body<{ branches: { id: string }[] }>(
    await call('get', `business/clubs/${clubId}`, owner).expect(200),
  );
  const restricted = owned.branches.find((branch) => branch.id !== branchId)!;
  const visible = body<{ branches: { id: string }[] }>(
    await call('get', `business/clubs/${clubId}`, stranger).expect(200),
  );
  expect(visible.branches.map((branch) => branch.id)).toEqual([branchId]);
  const list = body<{ id: string }[]>(
    await call(
      'get',
      `business/organizations/${clubId}/branches`,
      stranger,
    ).expect(200),
  );
  expect(list.map((branch) => branch.id)).toEqual([branchId]);
  await call(
    'get',
    `business/clubs/${clubId}/branches/${branchId}`,
    stranger,
  ).expect(200);
  await call(
    'get',
    `business/clubs/${clubId}/branches/${restricted.id}`,
    stranger,
  ).expect(403);
  await call(
    'patch',
    `business/clubs/${clubId}/branches/${restricted.id}`,
    stranger,
  )
    .send({ rules: 'forbidden' })
    .expect(403);
  await call('patch', `business/clubs/${clubId}`, stranger)
    .send({ name: 'forbidden' })
    .expect(403);
  await call('post', `business/organizations/${clubId}/branches`, stranger)
    .send({ name: 'forbidden' })
    .expect(403);
  await call(
    'get',
    `business/clubs/${otherClubId}/branches/${otherBranchId}`,
    stranger,
  ).expect(200);
  await call('patch', `business/clubs/${clubId}/branches/${branchId}`, stranger)
    .send({ rules: 'قانون شعبهٔ مجاز' })
    .expect(200);
  const [member] = await db
    .select()
    .from(s.organizationMembers)
    .where(eq(s.organizationMembers.userId, stranger.id));
  await expect(
    db.insert(s.organizationMemberBranches).values({
      organizationId: clubId,
      memberId: member.id,
      branchId: otherBranchId,
    }),
  ).rejects.toThrow();
  const team = body<{ members: { id: string; userId: string }[] }>(
    await call('get', `business/organizations/${clubId}/team`, owner).expect(
      200,
    ),
  );
  const target = team.members.find((member) => member.userId === stranger.id)!;
  await call(
    'post',
    `business/organizations/${clubId}/team/${target.id}/remove`,
    owner,
  )
    .send({ reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(201);
  await call(
    'get',
    `business/clubs/${clubId}/branches/${branchId}`,
    stranger,
  ).expect(403);
});

test('PH1 staff role matrix enforces branch grants, tenant boundaries and immediate revocation', async () => {
  const club = body<{ id: string }>(
    await call('post', 'business/clubs', owner)
      .send({ name: 'مجموعهٔ آزمون دسترسی' })
      .expect(201),
  );
  clubIds.push(club.id);
  const foreign = body<{ id: string }>(
    await call('post', 'business/clubs', stranger)
      .send({ name: 'مجموعهٔ مستقل آزمون' })
      .expect(201),
  );
  clubIds.push(foreign.id);
  const first = body<{ branches: { id: string }[] }>(
    await call('get', `business/clubs/${club.id}`, owner).expect(200),
  ).branches[0].id;
  const second = body<{ id: string }>(
    await call('post', `business/organizations/${club.id}/branches`, owner)
      .send({ name: 'شعبهٔ دوم آزمون' })
      .expect(201),
  ).id;
  for (const person of [athlete, coach, admin, stranger])
    await call('get', `business/clubs/${club.id}`, person).expect(403);
  for (const role of ['manager', 'receptionist', 'accountant'] as const) {
    for (const allBranches of [true, false]) {
      const person = await identity('business');
      const [user] = await db
        .select()
        .from(s.users)
        .where(eq(s.users.id, person.id));
      const invitation = body<{ id: string }>(
        await call(
          'post',
          `business/organizations/${club.id}/invitations`,
          owner,
        )
          .send({
            ...{
              phone: user.phone,
              role,
              ...(allBranches ? {} : { branchIds: [first] }),
            },
            reason: 'تغییر آزمایشی ثبت‌شده',
          })
          .expect(201),
      );
      const accepted = await Promise.all([
        call('post', `profile/invitations/${invitation.id}/accept`, person),
        call('post', `profile/invitations/${invitation.id}/accept`, person),
      ]);
      expect(accepted.map((response) => response.status).sort()).toEqual([
        201, 409,
      ]);
      const branches = body<{ id: string }[]>(
        await call(
          'get',
          `business/organizations/${club.id}/branches`,
          person,
        ).expect(200),
      );
      if (allBranches)
        expect(branches.map((branch) => branch.id)).toEqual(
          expect.arrayContaining([first, second]),
        );
      else expect(branches.map((branch) => branch.id)).toEqual([first]);
      await call(
        'get',
        `business/clubs/${club.id}/branches/${first}`,
        person,
      ).expect(200);
      await call(
        'get',
        `business/clubs/${club.id}/branches/${second}`,
        person,
      ).expect(allBranches ? 200 : 403);
      await call('get', `business/clubs/${foreign.id}`, person).expect(403);
      await call(
        'get',
        `business/organizations/${club.id}/team`,
        person,
      ).expect(403);
      await call(
        'post',
        `business/organizations/${club.id}/invitations`,
        person,
      )
        .send({
          ...{ phone: user.phone, role: 'manager' },
          reason: 'تغییر آزمایشی ثبت‌شده',
        })
        .expect(403);
      await call('patch', `business/clubs/${club.id}`, person)
        .send({ shortDescription: 'تغییر مجاز فقط برای مدیریت کل مجموعه' })
        .expect(role === 'manager' && allBranches ? 200 : 403);
      await call('patch', `business/clubs/${club.id}/branches/${first}`, person)
        .send({ rules: 'قانون شعبهٔ مجاز' })
        .expect(role === 'manager' ? 200 : 403);
      await call(
        'patch',
        `business/clubs/${club.id}/branches/${second}`,
        person,
      )
        .send({ rules: 'قانون شعبهٔ دیگر' })
        .expect(role === 'manager' && allBranches ? 200 : 403);
      await call('post', `business/clubs/${club.id}/tariffs`, person)
        .send({
          branchId: first,
          name: 'تعرفهٔ آزمون نقش',
          serviceType: 'visit',
          unit: 'visit',
          priceToman: 1000,
          conditions: 'فقط آزمون دسترسی',
        })
        .expect(role === 'manager' ? 201 : 403);
      const members = body<{ members: { id: string; userId: string }[] }>(
        await call(
          'get',
          `business/organizations/${club.id}/team`,
          owner,
        ).expect(200),
      );
      const member = members.members.find(
        (member) => member.userId === person.id,
      )!;
      await call(
        'post',
        `business/organizations/${club.id}/team/${member.id}/remove`,
        owner,
      )
        .send({ reason: 'تغییر آزمایشی ثبت‌شده' })
        .expect(201);
      await call(
        'get',
        `business/clubs/${club.id}/branches/${first}`,
        person,
      ).expect(403);
    }
  }
}, 30000);

test('expired and revoked scoped staff invitations cannot create membership or expose branch data', async () => {
  const person = await identity('business');
  const [user] = await db
    .select()
    .from(s.users)
    .where(eq(s.users.id, person.id));
  const invitation = async () =>
    body<{ id: string }>(
      await call('post', `business/organizations/${clubId}/invitations`, owner)
        .send({
          ...{
            phone: user.phone,
            role: 'receptionist',
            branchIds: [branchId],
          },
          reason: 'تغییر آزمایشی ثبت‌شده',
        })
        .expect(201),
    );
  const expired = await invitation();
  await db
    .update(s.organizationInvitations)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(s.organizationInvitations.id, expired.id));
  await call('post', `profile/invitations/${expired.id}/accept`, person).expect(
    409,
  );
  const pending = body<{ id: string }[]>(
    await call('get', 'profile/invitations', person).expect(200),
  );
  expect(pending.some((item) => item.id === expired.id)).toBe(false);
  const revoked = await invitation();
  await call(
    'post',
    `business/organizations/${clubId}/invitations/${revoked.id}/revoke`,
    owner,
  )
    .send({ reason: 'تغییر آزمایشی ثبت‌شده' })
    .expect(201);
  await call('post', `profile/invitations/${revoked.id}/accept`, person).expect(
    409,
  );
  await call(
    'get',
    `business/clubs/${clubId}/branches/${branchId}`,
    person,
  ).expect(403);
});

test('media retention preserves references and recent uploads, supports dry run, and removes abandoned S3 objects idempotently', async () => {
  const club = body<{ id: string }>(
    await call('post', 'business/clubs', owner)
      .send({ name: 'پاکسازی آزمایشی' })
      .expect(201),
  );
  clubIds.push(club.id);
  const bytes = await sharp({
    create: { width: 8, height: 8, channels: 3, background: '#123456' },
  })
    .png()
    .toBuffer();
  const mediaRows: { id: string; objectKey: string }[] = [];
  for (let i = 0; i < 2; i++) {
    const media = body<{ id: string; objectKey: string }>(
      await call('post', `business/clubs/${club.id}/media/upload`, owner)
        .attach('file', bytes, {
          filename: 'test.png',
          contentType: 'image/png',
        })
        .expect(201),
    );
    mediaRows.push(media);
    uploadedKeys.push(media.objectKey);
  }
  await db
    .update(s.clubs)
    .set({ coverId: mediaRows[0].id })
    .where(eq(s.clubs.id, club.id));
  const orphan = `clubs/${club.id}/${randomUUID()}.webp`;
  uploadedKeys.push(orphan);
  await storage.put(orphan, bytes, 'image/webp');
  const retention = app.get(MediaRetentionService);
  const fresh = await retention.run(false);
  expect(fresh.deletedMedia).toBe(0);
  expect(fresh.eligibleObjects).toBe(0);
  const later = new Date(Date.now() + 8 * 86400000);
  const dry = await retention.run(false, later);
  expect(dry.eligibleMedia).toBeGreaterThanOrEqual(1);
  expect(dry.eligibleObjects).toBeGreaterThanOrEqual(1);
  expect(await storage.get(orphan)).toEqual(bytes);
  const applied = await retention.run(true, later);
  expect(applied.deletedMedia).toBeGreaterThanOrEqual(1);
  expect(applied.deletedObjects).toBeGreaterThanOrEqual(1);
  expect(await storage.get(mediaRows[0].objectKey)).toBeInstanceOf(Buffer);
  expect(
    await db
      .select()
      .from(s.clubMedia)
      .where(eq(s.clubMedia.id, mediaRows[1].id)),
  ).toHaveLength(0);
  await expect(storage.get(orphan)).rejects.toThrow();
  const repeated = await retention.run(true, later);
  expect(repeated.deletedMedia).toBe(0);
  expect(repeated.deletedObjects).toBe(0);
});

test.each(['receptionist', 'accountant'] as const)(
  '%s reads only assigned branches and cannot mutate catalog or access another tenant',
  async (role) => {
    const person = await identity('business');
    const [member] = await db
      .insert(s.organizationMembers)
      .values({
        organizationId: clubId,
        userId: person.id,
        role,
        allBranches: false,
      })
      .returning();
    await db
      .insert(s.organizationMemberBranches)
      .values({ organizationId: clubId, memberId: member.id, branchId });
    const visible = body<{ branches: { id: string }[] }>(
      await call('get', `business/clubs/${clubId}`, person).expect(200),
    );
    expect(visible.branches.map((b) => b.id)).toEqual([branchId]);
    await call(
      'get',
      `business/clubs/${clubId}/branches/${branchId}`,
      person,
    ).expect(200);
    await call('get', `business/clubs/${otherClubId}`, person).expect(403);
    await call(
      'get',
      `business/clubs/${otherClubId}/branches/${otherBranchId}`,
      person,
    ).expect(403);
    await call('patch', `business/clubs/${clubId}/branches/${branchId}`, person)
      .send({ rules: 'forbidden' })
      .expect(403);
    await call('patch', `business/clubs/${clubId}`, person)
      .send({ name: 'forbidden' })
      .expect(403);
    await call('post', `business/clubs/${clubId}/branches`, person)
      .send({ name: 'forbidden' })
      .expect(403);
    await call('get', `business/organizations/${clubId}/team`, person).expect(
      403,
    );
  },
);

test('guest saved lookup validates bounded input, honors publication, filters and pagination', async () => {
  await call('post', 'catalog/clubs/guest-saved')
    .send({ ids: ['invalid'], filters: {} })
    .expect(400);
  await call('post', 'catalog/clubs/guest-saved')
    .send({ ids: Array(501).fill(clubId), filters: {} })
    .expect(400);
  const empty = await call('post', 'catalog/clubs/guest-saved')
    .send({ ids: [], filters: {} })
    .expect(201);
  expect(empty.body).toEqual([]);
  const publicList = body<{ id: string }[]>(
    await call('get', 'catalog/clubs').expect(200),
  );
  const expected = publicList.filter((club) =>
    [clubId, otherClubId].includes(club.id),
  );
  const saved = await call('post', 'catalog/clubs/guest-saved')
    .send({ ids: [clubId, otherClubId], filters: {} })
    .expect(201);
  expect(saved.body).toEqual(expected);
  const page = await call('post', 'catalog/clubs/guest-saved')
    .send({ ids: [clubId, otherClubId], filters: { page: 2 } })
    .expect(201);
  expect(page.body).toEqual([]);
});

test('sensitive team and price changes reject absent reasons atomically and retain private audit scope', async () => {
  const club = body<{ id: string }>(
    await call('post', 'business/clubs', owner)
      .send({ name: 'ممیزی عملیات حساس' })
      .expect(201),
  );
  clubIds.push(club.id);
  const [branch] = await db
    .select()
    .from(s.branches)
    .where(eq(s.branches.organizationId, club.id));
  const colleague = await identity('business');
  const [person] = await db
    .select()
    .from(s.users)
    .where(eq(s.users.id, colleague.id));
  const invitePath = `business/organizations/${club.id}/invitations`;
  const grant = {
    phone: person.phone,
    role: 'manager',
    branchIds: [branch.id],
  };
  for (const reason of [undefined, ' ', 'ab', 'x'.repeat(501)])
    await call('post', invitePath, owner)
      .send({ ...grant, reason })
      .expect(400);
  expect(
    await db
      .select()
      .from(s.organizationInvitations)
      .where(eq(s.organizationInvitations.organizationId, club.id)),
  ).toHaveLength(0);
  const reason = '  audit-private-reason-for-scope-and-price  ';
  const invitation = body<{ id: string }>(
    await call('post', invitePath, owner)
      .send({ ...grant, reason })
      .expect(201),
  );
  const revokePath = `${invitePath}/${invitation.id}/revoke`;
  await call('post', revokePath, owner).expect(400);
  await call('post', revokePath, owner).send({ reason }).expect(201);
  const second = body<{ id: string }>(
    await call('post', invitePath, owner)
      .send({ ...grant, reason })
      .expect(201),
  );
  await call(
    'post',
    `profile/invitations/${second.id}/accept`,
    colleague,
  ).expect(201);
  const [member] = await db
    .select()
    .from(s.organizationMembers)
    .where(eq(s.organizationMembers.userId, colleague.id));
  const removePath = `business/organizations/${club.id}/team/${member.id}/remove`;
  await call('post', removePath, owner).send({ reason: ' ' }).expect(400);
  await call(
    'get',
    `business/clubs/${club.id}/branches/${branch.id}`,
    colleague,
  ).expect(200);
  await call('post', removePath, owner).send({ reason }).expect(201);
  await call(
    'get',
    `business/clubs/${club.id}/branches/${branch.id}`,
    colleague,
  ).expect(403);
  const terms = {
    name: 'تعرفهٔ ممیزی',
    serviceType: 'visit',
    priceToman: 123000,
    unit: 'visit',
    conditions: 'شرایط آزمون',
  };
  const tariff = body<{ id: string; versionId: string }>(
    await call('post', `business/clubs/${club.id}/tariffs`, owner)
      .send({ ...terms, branchId: branch.id })
      .expect(201),
  );
  const revisionPath = `business/clubs/${club.id}/tariffs/${tariff.id}/versions`;
  const statusPath = `business/clubs/${club.id}/tariffs/${tariff.id}/status`;
  for (const reason of [undefined, ' ', 'ab', 'x'.repeat(501)]) {
    await call('post', revisionPath, owner)
      .send({ ...terms, priceToman: 456000, reason })
      .expect(400);
    await call('post', statusPath, owner)
      .send({ isActive: false, reason })
      .expect(400);
  }
  const before = body<{ version: number; priceToman: number }[]>(
    await call('get', revisionPath, owner).expect(200),
  );
  expect(before).toHaveLength(1);
  expect(before[0]).toMatchObject({ version: 1, priceToman: 123000 });
  const revised = body<{ versionId: string }>(
    await call('post', revisionPath, owner)
      .send({ ...terms, priceToman: 456000, reason })
      .expect(201),
  );
  await call('post', statusPath, owner)
    .send({ isActive: false, reason })
    .expect(201);
  const events = await db
    .select()
    .from(s.auditEvents)
    .where(eq(s.auditEvents.organizationId, club.id));
  const sensitive = events.filter((event) =>
    [
      'team.invited',
      'team.removed',
      'invitation.revoked',
      'tariff.revised',
      'tariff.status',
    ].includes(event.action),
  );
  expect(sensitive).toHaveLength(6);
  for (const event of sensitive) {
    expect(event.actorId).toBe(owner.id);
    expect(event.createdAt).toBeInstanceOf(Date);
    expect(event.targetId).toBeTruthy();
    expect(event.details.reason).toBe(reason.trim());
  }
  expect(
    sensitive.find((event) => event.action === 'team.invited')?.details,
  ).toMatchObject({ role: 'manager', scope: branch.id });
  for (const action of ['team.removed', 'invitation.revoked'])
    expect(
      sensitive.find((event) => event.action === action)?.details,
    ).toMatchObject({
      previousRole: 'manager',
      previousScope: branch.id,
      resultingAccess: 'none',
    });
  expect(
    sensitive.find((event) => event.action === 'tariff.revised')?.details,
  ).toMatchObject({
    previousVersionId: tariff.versionId,
    versionId: revised.versionId,
    previousPriceToman: '123000',
    priceToman: '456000',
    branchId: branch.id,
  });
  expect(
    sensitive.find((event) => event.action === 'tariff.status')?.details,
  ).toMatchObject({
    previousIsActive: 'true',
    isActive: 'false',
    branchId: branch.id,
  });
  // Reasons belong to the restricted audit trail, never the tariff/history DTO.
  for (const path of [revisionPath, `business/clubs/${club.id}/tariffs`]) {
    const response = await call('get', path, owner).expect(200);
    expect(JSON.stringify(response.body)).not.toContain(reason.trim());
  }
  await call('get', 'admin/audit', owner).expect(403);
});

test('PH1 geography pagination reaches records beyond every previous limit with deterministic ordering and parent isolation', async () => {
  const existing = await db
    .select({ code: s.countries.code })
    .from(s.countries);
  const used = new Set(existing.map((item) => item.code));
  const codes: string[] = [];
  for (let first = 65; first <= 90; first++)
    for (let second = 65; second <= 90; second++) {
      const code = String.fromCharCode(first, second);
      if (!used.has(code)) codes.push(code);
    }
  const countries = await db
    .insert(s.countries)
    .values(
      codes
        .slice(0, 301)
        .map((code) => ({ code, name: `qa-${prefix}-country` })),
    )
    .returning();
  const parentCountry = countries[0].id;
  let parentProvince: string | undefined;
  let parentCity: string | undefined;
  try {
    const provinces = await db
      .insert(s.provinces)
      .values(
        Array.from({ length: 1001 }, (_, index) => ({
          countryId: parentCountry,
          name: `qa-${String(index).padStart(4, '0')}`,
        })),
      )
      .returning();
    parentProvince = provinces[0].id;
    const cities = await db
      .insert(s.cities)
      .values(
        Array.from({ length: 1001 }, (_, index) => ({
          provinceId: parentProvince!,
          name: `qa-${String(index).padStart(4, '0')}`,
        })),
      )
      .returning();
    parentCity = cities[0].id;
    const districts = await db
      .insert(s.districts)
      .values(
        Array.from({ length: 1001 }, (_, index) => ({
          cityId: parentCity!,
          name: `qa-${String(index).padStart(4, '0')}`,
        })),
      )
      .returning();
    for (const domain of ['catalog', 'admin']) {
      const person = domain === 'admin' ? admin : undefined;
      for (const [kind, parentId, expected] of [
        ['countries', undefined, countries],
        ['provinces', parentCountry, provinces],
        ['cities', parentProvince, cities],
        ['districts', parentCity, districts],
      ] as const) {
        const suffix = parentId ? `parentId=${parentId}&` : '';
        const pageSize = kind === 'countries' ? 300 : 1000;
        const page1 = body<{ id: string; name: string }[]>(
          await call(
            'get',
            `${domain}/locations/${kind}?${suffix}page=1`,
            person,
          ).expect(200),
        );
        const page2 = body<{ id: string; name: string }[]>(
          await call(
            'get',
            `${domain}/locations/${kind}?${suffix}page=2`,
            person,
          ).expect(200),
        );
        expect(page1).toHaveLength(pageSize);
        expect(page2).toHaveLength(
          kind === 'countries' ? existing.length + 1 : 1,
        );
        const combined = [...page1, ...page2];
        expect(new Set(combined.map((item) => item.id)).size).toBe(
          combined.length,
        );
        const ids = new Set(expected.map((item: { id: string }) => item.id));
        const selected = combined.filter((item) => ids.has(item.id));
        expect(selected.map((item) => item.id)).toEqual(
          [...expected]
            .sort((a, b) =>
              a.name === b.name
                ? a.id.localeCompare(b.id)
                : a.name.localeCompare(b.name),
            )
            .map((item) => item.id),
        );
        await call(
          'get',
          `${domain}/locations/${kind}?${suffix}page=3`,
          person,
        ).expect(200, []);
        if (kind !== 'countries') {
          await call(
            'get',
            `${domain}/locations/${kind}?parentId=${randomUUID()}`,
            person,
          ).expect(200, []);
          await call('get', `${domain}/locations/${kind}`, person).expect(400);
        }
        for (const page of ['0', '-1', '1.5', '100001', 'invalid'])
          await call(
            'get',
            `${domain}/locations/${kind}?${suffix}page=${page}`,
            person,
          ).expect(400);
        await call(
          'get',
          `${domain}/locations/${kind}?parentId=not-a-uuid`,
          person,
        ).expect(400);
      }
    }
    await call('get', 'admin/locations/countries?page=2', owner).expect(403);
    const probe = await promisify(execFile)(
      process.execPath,
      [
        '--import',
        'tsx',
        resolve(
          __dirname,
          '../../../packages/api/test/location-client.probe.ts',
        ),
      ],
      {
        cwd: resolve(__dirname, '..'),
        timeout: 60000,
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=192',
          PH1_LOCATION_API_URL: `${await app.getUrl()}/api/v1`,
          PH1_LOCATION_PARENTS: JSON.stringify([
            parentCountry,
            parentProvince,
            parentCity,
          ]),
          PH1_LOCATION_COOKIE: admin.cookie,
        },
      },
    );
    expect(JSON.parse(probe.stdout)).toEqual({
      application: [existing.length + 301, 1001, 1001, 1001],
      admin: [existing.length + 301, 1001, 1001, 1001],
    });
    const docs = body<{
      paths: Record<
        string,
        {
          get: {
            parameters: {
              name: string;
              required?: boolean;
              schema: { maximum?: number };
            }[];
            responses: Record<
              string,
              { content: Record<string, { schema: { type: string } }> }
            >;
          };
        }
      >;
    }>(await call('get', 'system/docs/json').expect(200));
    for (const domain of ['catalog', 'admin']) {
      const operation = docs.paths[`/api/v1/${domain}/locations/{kind}`].get;
      expect(
        operation.parameters.find((parameter) => parameter.name === 'page'),
      ).toMatchObject({ required: false, schema: { maximum: 100000 } });
      expect(
        operation.responses['200'].content['application/json'].schema.type,
      ).toBe('array');
    }
  } finally {
    if (parentCity)
      await db.delete(s.districts).where(eq(s.districts.cityId, parentCity));
    if (parentProvince)
      await db.delete(s.cities).where(eq(s.cities.provinceId, parentProvince));
    await db
      .delete(s.provinces)
      .where(eq(s.provinces.countryId, parentCountry));
    await db.delete(s.countries).where(
      inArray(
        s.countries.id,
        countries.map((item) => item.id),
      ),
    );
  }
});

test('PH1 shared clients use real HTTP contracts and reach all 101 branches and coach affiliations', async () => {
  const club = body<{ id: string; branches: { id: string }[] }>(
    await call('post', 'business/clubs', owner)
      .send({ name: 'مجموعهٔ قرارداد کلاینت' })
      .expect(201),
  );
  clubIds.push(club.id);
  const extra = await db
    .insert(s.branches)
    .values(
      Array.from({ length: 100 }, (_, index) => ({
        organizationId: club.id,
        name: `شعبه ${index}`,
        slug: `contract-${index}`,
      })),
    )
    .returning();
  await db
    .insert(s.branchProfiles)
    .values(extra.map((branch) => ({ clubId: club.id, branchId: branch.id })));
  const person = await identity('application');
  await call('post', 'profile/coach', person)
    .send({ biography: 'مربی قرارداد' })
    .expect(201);
  const affiliations = await db
    .insert(s.branchCoaches)
    .values(
      [club.branches[0].id, ...extra.map((branch) => branch.id)].map(
        (branchId) => ({
          branchId,
          coachId: person.id,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }),
      ),
    )
    .returning();
  const path = 'profile/coach/affiliations';
  const page1 = body<{ id: string }[]>(
    await call('get', `${path}?page=1`, person).expect(200),
  );
  const page2 = body<{ id: string }[]>(
    await call('get', `${path}?page=2`, person).expect(200),
  );
  expect(page1).toHaveLength(100);
  expect(page2).toHaveLength(1);
  expect([...page1, ...page2].map((row) => row.id)).toEqual(
    affiliations.map((row) => row.id).sort(),
  );
  await call('get', `${path}?page=3`, person).expect(200, []);
  await call('get', path, athlete).expect(200, []);
  for (const page of ['0', '-1', '1.5', '100001', 'invalid'])
    await call('get', `${path}?page=${page}`, person).expect(400);
  const pixels = await sharp({
    create: { width: 4, height: 3, channels: 3, background: '#123456' },
  })
    .png()
    .toBuffer();
  const probe = await promisify(execFile)(
    process.execPath,
    [
      '--import',
      'tsx',
      resolve(__dirname, '../../../packages/api/test/ph1-contract.probe.ts'),
    ],
    {
      cwd: resolve(__dirname, '..'),
      timeout: 60000,
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=192',
        PH1_CONTRACT_API_URL: `${await app.getUrl()}/api/v1`,
        PH1_CONTRACT_INPUT: JSON.stringify({
          clubId: club.id,
          branchId: club.branches[0].id,
          coachId: person.id,
          ownerCookie: owner.cookie,
          coachCookie: person.cookie,
          adminCookie: admin.cookie,
          foreignClubId: otherClubId,
          image: pixels.toString('base64'),
        }),
      },
    },
  );
  expect(JSON.parse(probe.stdout)).toMatchObject({
    branches: 101,
    affiliations: 101,
    media: 'uploaded-previewed-deleted',
    tariffs: 'created-revised-status',
    errors: 'fa-en-validated',
    profile: 'privacy-phone-favorites',
    admin: 'authorized',
  });
});
