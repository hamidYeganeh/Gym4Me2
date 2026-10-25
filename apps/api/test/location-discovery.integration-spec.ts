import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { eq, inArray } from 'drizzle-orm';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import request, { type Response } from 'supertest';
import type { ClubService } from '../src/modules/clubs/club.service';
import type { DiscoveryLocation } from '../src/modules/clubs/location-discovery';
type CountedPlace = { id: string; name: string; clubCount: number };
type DiscoveryResponse = Awaited<ReturnType<ClubService['discoverLocations']>>;
const body = <T>(response: Response): T => response.body as T;
import type { App } from 'supertest/types';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';
import { AuthModule } from '../src/modules/auth/auth.module';
import { tokenHash } from '../src/modules/auth/auth.service';
import { PrivacyService } from '../src/modules/profile/privacy.service';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { configureApi } from '../src/platform/http/configure-api';
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Dedicated _test database required.');
let app: INestApplication<App>, db: DatabaseService['db'];
let country: string,
  province: string,
  otherProvince: string,
  city: string,
  otherCity: string,
  district: string,
  otherDistrict: string;
let user: string, otherUser: string, cookie: string, otherCookie: string;
let sportId: string;
const organizationIds: string[] = [];
const provinceIds: string[] = [];
const cityIds: string[] = [];
const districtIds: string[] = [];
const call = (
  method: 'get' | 'patch',
  path: string,
  auth = cookie,
  origin = 'http://localhost:7081',
) =>
  request(app.getHttpServer())
    [method](`/api/v1/${path}`)
    .set('x-gym-client', 'application')
    .set('Origin', origin)
    .set('Cookie', auth ?? '');
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () =>
            validateEnvironment({
              NODE_ENV: 'test',
              DATABASE_URL: databaseUrl,
              AUTH_SECRET: randomUUID() + randomUUID(),
              RETENTION_ENABLED: 'false',
              COMMERCE_WORKER_ENABLED: 'false',
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
  configureApi(app, { corsOrigins: [], docsEnabled: false });
  await app.init();
  const people = await db
    .insert(s.users)
    .values(
      [0, 1].map(() => ({
        phone: `+989${randomBytes(6).readUIntBE(0, 6).toString().slice(0, 9).padStart(9, '0')}`,
      })),
    )
    .returning();
  user = people[0].id;
  otherUser = people[1].id;
  for (const id of [user, otherUser]) {
    const token = randomBytes(32).toString('base64url');
    await db.insert(s.authSessions).values({
      userId: id,
      client: 'application',
      tokenHash: tokenHash(token),
      device: 'Location test',
      expiresAt: new Date(Date.now() + 3600000),
    });
    if (id === user) cookie = `gym4me_application=${token}`;
    else otherCookie = `gym4me_application=${token}`;
    const privacy = module.get(PrivacyService);
    await privacy.update(id, {
      acceptPolicy: true,
      confirmMinimumAge: true,
      policyVersion: privacy.policy().version,
    });
  }
  const usedCodes = new Set(
    (await db.select({ code: s.countries.code }).from(s.countries)).map(
      (row) => row.code,
    ),
  );
  const code = Array.from({ length: 676 }, (_, index) =>
    String.fromCharCode(65 + Math.floor(index / 26), 65 + (index % 26)),
  ).find((value) => !usedCodes.has(value));
  if (!code) throw new Error('No unused country code for location fixtures.');
  const [nation] = await db
    .insert(s.countries)
    .values({ name: 'ایران', code })
    .returning();
  country = nation.id;
  const p = await db
    .insert(s.provinces)
    .values([
      { name: 'تهران', countryId: country },
      { name: 'فارس', countryId: country },
      { name: 'اصفهان', countryId: country },
    ])
    .returning();
  province = p[0].id;
  provinceIds.push(...p.map((row) => row.id));
  otherProvince = p[1].id;
  const c = await db
    .insert(s.cities)
    .values([
      { name: 'تهران', provinceId: province },
      { name: 'ری', provinceId: province },
      { name: 'شیراز', provinceId: otherProvince },
      { name: 'اصفهان', provinceId: p[2].id },
    ])
    .returning();
  city = c[0].id;
  cityIds.push(...c.map((row) => row.id));
  otherCity = c[2].id;
  const d = await db
    .insert(s.districts)
    .values([
      { name: 'نیاوران', cityId: city },
      { name: 'تجریش', cityId: city },
      { name: 'ونک', cityId: city },
      { name: 'قصرالدشت', cityId: otherCity },
      { name: 'جلفا', cityId: c[3].id },
    ])
    .returning();
  district = d[0].id;
  districtIds.push(...d.map((row) => row.id));
  otherDistrict = d[1].id;
  const [sport] = await db
    .insert(s.sports)
    .values({ name: 'Training', slug: `location-training-${randomUUID()}` })
    .returning();
  sportId = sport.id;
  async function club(
    name: string,
    status: 'published' | 'hidden' = 'published',
    approved = true,
  ) {
    const [org] = await db
      .insert(s.organizations)
      .values({
        name,
        slug: randomUUID(),
        status: approved ? 'approved' : 'pending',
      })
      .returning();
    organizationIds.push(org.id);
    await db
      .insert(s.organizationMembers)
      .values({ organizationId: org.id, userId: user, role: 'owner' });
    await db.insert(s.clubs).values({
      id: org.id,
      ownerId: user,
      publicationStatus: status,
      shortDescription: 'Location test club',
    });
    await db.insert(s.clubSportLinks).values({ clubId: org.id, sportId });
    return org.id;
  }
  async function branch(
    clubId: string,
    districtId: string,
    incomplete = false,
    archived = false,
    fars = false,
  ) {
    const [b] = await db
      .insert(s.branches)
      .values({
        organizationId: clubId,
        name: 'Location branch',
        slug: randomUUID(),
      })
      .returning();
    await db.insert(s.branchProfiles).values({
      branchId: b.id,
      clubId,
      countryId: country,
      provinceId: fars ? otherProvince : province,
      cityId: fars ? otherCity : city,
      districtId,
      address: incomplete ? null : 'Test address',
      latitude: 35.7,
      longitude: 51.4,
      archivedAt: archived ? new Date() : null,
    });
    await db.insert(s.weeklyHours).values({
      branchId: b.id,
      dayOfWeek: 0,
      startMinute: 480,
      endMinute: 1080,
    });
    await db
      .insert(s.branchSports)
      .values({ branchId: b.id, sportId: sport.id });
    await db
      .insert(s.clubPhones)
      .values({ clubId, branchId: b.id, number: '02100000000' });
  }
  const first = await club('First public club');
  await branch(first, district);
  await branch(first, district);
  await branch(first, otherDistrict);
  await branch(first, d[3].id, false, false, true);
  await branch(await club('Second public club'), district);
  await branch(await club('Hidden club', 'hidden'), district);
  await branch(await club('Incomplete club'), district, true);
  await branch(await club('Archived branch'), district, false, true);
  await branch(
    await club('Pending organization', 'published', false),
    district,
  );
}, 30000);
afterAll(async () => {
  try {
    if (db) {
      if (organizationIds.length) {
        await db
          .delete(s.branches)
          .where(inArray(s.branches.organizationId, organizationIds));
        await db.delete(s.clubs).where(inArray(s.clubs.id, organizationIds));
        await db
          .delete(s.organizations)
          .where(inArray(s.organizations.id, organizationIds));
      }
      const userIds = [user, otherUser].filter(Boolean);
      if (userIds.length) {
        await db
          .delete(s.auditEvents)
          .where(inArray(s.auditEvents.actorId, userIds));
        await db.delete(s.users).where(inArray(s.users.id, userIds));
      }
      if (districtIds.length)
        await db
          .delete(s.districts)
          .where(inArray(s.districts.id, districtIds));
      if (cityIds.length)
        await db.delete(s.cities).where(inArray(s.cities.id, cityIds));
      if (provinceIds.length)
        await db
          .delete(s.provinces)
          .where(inArray(s.provinces.id, provinceIds));
      if (country)
        await db.delete(s.countries).where(eq(s.countries.id, country));
      if (sportId) await db.delete(s.sports).where(eq(s.sports.id, sportId));
    }
  } finally {
    await app?.close();
  }
});
test('counts deduplicate clubs and exclude hidden, incomplete, archived and unapproved branches', async () => {
  const nations = await call('get', 'catalog/locations/countries').expect(200);
  expect(
    body<CountedPlace[]>(nations).find((p: { id: string }) => p.id === country)
      ?.clubCount,
  ).toBe(2);
  const provinces = await call(
    'get',
    `catalog/locations/provinces?parentId=${country}`,
  ).expect(200);
  expect(
    body<CountedPlace[]>(provinces).find(
      (p: { id: string }) => p.id === province,
    )?.clubCount,
  ).toBe(2);
  expect(
    body<CountedPlace[]>(provinces).find(
      (p: { id: string }) => p.id === otherProvince,
    )?.clubCount,
  ).toBe(1);
  const places = await call(
    'get',
    `catalog/locations/districts?parentId=${city}`,
  ).expect(200);
  expect(
    body<CountedPlace[]>(places).find((p: { id: string }) => p.id === district)
      ?.clubCount,
  ).toBe(2);
  expect(
    body<CountedPlace[]>(places).find(
      (p: { id: string }) => p.id === otherDistrict,
    )?.clubCount,
  ).toBe(1);
  expect(
    body<CountedPlace[]>(places).find((p: { name: string }) => p.name === 'ونک')
      ?.clubCount,
  ).toBe(0);
  expect(
    (await call('get', `catalog/clubs?provinceId=${province}`).expect(200))
      .body,
  ).toHaveLength(2);
});
test('carousels honor the selected hierarchy and use a stable random guest seed', async () => {
  const result = await call(
    'get',
    `catalog/locations/discovery?provinceId=${province}&cityId=${city}&districtId=${district}`,
  ).expect(200);
  expect(body<DiscoveryResponse>(result).location).toEqual({
    countryId: country,
    provinceId: province,
    cityId: city,
    districtId: district,
  });
  expect(body<DiscoveryResponse>(result).provinces[0].id).toBe(province);
  expect(
    body<DiscoveryResponse>(result).cities.every(
      (p) => p.provinceId === province,
    ),
  ).toBe(true);
  expect(
    body<DiscoveryResponse>(result).districts.every((p) => p.cityId === city),
  ).toBe(true);
  const guest = await call(
    'get',
    'catalog/locations/discovery?randomize=true',
    '',
  ).expect(200);
  const same = await call(
    'get',
    `catalog/locations/discovery?randomize=true&seed=${body<DiscoveryResponse>(guest).seed}`,
    '',
  ).expect(200);
  expect(body<DiscoveryResponse>(same)).toEqual(body<DiscoveryResponse>(guest));
  const fresh = await call(
    'get',
    'catalog/locations/discovery?randomize=true',
    '',
  ).expect(200);
  expect(body<DiscoveryResponse>(fresh).seed).not.toBe(
    body<DiscoveryResponse>(guest).seed,
  );
  const changed = await call(
    'get',
    `catalog/locations/discovery?provinceId=${otherProvince}&seed=${body<DiscoveryResponse>(guest).seed}`,
    '',
  ).expect(200);
  expect(
    body<DiscoveryResponse>(changed).cities.every(
      (p) => p.provinceId === otherProvince,
    ),
  ).toBe(true);
  expect(
    body<DiscoveryResponse>(changed).districts.every(
      (p) => p.cityId === otherCity,
    ),
  ).toBe(true);
  await call(
    'get',
    `catalog/locations/discovery?provinceId=${otherProvince}&cityId=${city}`,
    '',
  ).expect(400);
  await call('get', 'catalog/locations/discovery?seed=invalid!', '').expect(
    400,
  );
  await call(
    'get',
    `catalog/locations/discovery?cityId=${randomUUID()}`,
    '',
  ).expect(404);
});
test('saved location is persistent, account scoped, clears descendants and preserves website origin boundaries', async () => {
  expect(
    (await call('get', 'profile/account/location').expect(200)).body,
  ).toEqual({ userId: user, location: null });
  const saved = await call('patch', 'profile/account/location')
    .send({ provinceId: province, cityId: city, districtId: district })
    .expect(200);
  expect(
    body<{ userId: string; location: DiscoveryLocation | null }>(saved)
      .location,
  ).toEqual({
    countryId: country,
    provinceId: province,
    cityId: city,
    districtId: district,
  });
  expect(
    (await call('get', 'profile/account/location').expect(200)).body,
  ).toEqual(
    body<{ userId: string; location: DiscoveryLocation | null }>(saved),
  );
  expect(
    (await call('get', 'profile/account/location', otherCookie).expect(200))
      .body,
  ).toEqual({ userId: otherUser, location: null });
  await call('patch', 'profile/account/location')
    .send({ provinceId: otherProvince, cityId: city })
    .expect(400);
  await call('patch', 'profile/account/location')
    .send({ provinceId: province, userId: otherUser })
    .expect(400);
  const changed = await call(
    'patch',
    'profile/account/location',
    cookie,
    'http://localhost:7084',
  )
    .send({ provinceId: otherProvince, cityId: otherCity })
    .expect(200);
  expect(
    body<{ userId: string; location: DiscoveryLocation | null }>(changed)
      .location,
  ).toEqual({
    countryId: country,
    provinceId: otherProvince,
    cityId: otherCity,
  });
  expect(
    (
      await call(
        'get',
        'profile/account/location',
        cookie,
        'http://localhost:7084',
      ).expect(200)
    ).body,
  ).toEqual(
    body<{ userId: string; location: DiscoveryLocation | null }>(changed),
  );
  await call('get', 'profile/account', cookie, 'http://localhost:7084').expect(
    403,
  );
  await call(
    'get',
    'profile/account/location',
    cookie,
    'https://untrusted.invalid',
  ).expect(403);
  await call('get', 'profile/account/location', '').expect(401);
  await call(
    'patch',
    'profile/account/location',
    cookie,
    'http://localhost:7084',
  )
    .send({ provinceId: province, cityId: city, districtId: district })
    .expect(200);
});
