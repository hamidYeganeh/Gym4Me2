import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { ConflictException } from '@nestjs/common';
import { analyticsFilters } from '../src/modules/analytics/analytics.contracts';
import { managementFilters } from '../src/modules/commerce/management-filters';
import { Test } from '@nestjs/testing';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { StorageService } from '../src/modules/clubs/storage.service';
import { MediaRetentionService } from '../src/modules/clubs/media-retention.service';
import { SportsMediaService } from '../src/modules/commerce/media.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { randomInt, randomUUID } from 'node:crypto';
import { bookingPageSchema } from '../src/modules/commerce/booking-page';
import { hostConversationPageSchema } from '../src/modules/commerce/community-page';
import { SportsResourceService } from '../src/modules/commerce/resources.service';
import { SportsInvitationService } from '../src/modules/commerce/invitations.service';
import {
  invitationAnswerSchema,
  invitationRecipientSchema,
  invitationCreateSchema,
} from '../src/modules/commerce/invitations.contracts';
import {
  resourceSettingsSchema,
  resourceCreateSchema,
  resourceBlockSchema,
  resourceCalendarSchema,
} from '../src/modules/commerce/resources.contracts';
import { connect } from 'node:net';
import { resolve } from 'node:path';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { SportsOperationsService } from '../src/modules/commerce/operations.service';
import { CommunityService } from '../src/modules/commerce/community.service';
import { SportsCalendarService } from '../src/modules/commerce/calendars.service';
import {
  calendarPageSchema,
  calendarSettingsSchema,
} from '../src/modules/commerce/calendars.contracts';
import { SportsConversationService } from '../src/modules/commerce/conversations.service';
import { deliverTimeSensitiveNotification } from '../src/modules/commerce/time-sensitive-notifications';
import { SportsDocumentService } from '../src/modules/commerce/documents.service';
import type { Principal } from '../src/modules/auth/auth.service';
import {
  couponSchema,
  eligibilitySchema,
  serviceSchema,
} from '../src/modules/commerce/commerce.contracts';
import { SamanMockPaymentAdapter } from '../src/modules/commerce/sandbox-payment';
import type { TestingModule } from '@nestjs/testing';
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test';
if (!new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error('Requires isolated _test database');
let testingModule: TestingModule,
  db: DatabaseService['db'],
  commerce: CommerceService,
  community: SportsConversationService;
let owner: string,
  athlete: string,
  other: string,
  org: string,
  branch: string,
  secondOrg: string,
  secondBranch: string;
const userIds: string[] = [];
const mediaBucket = `gym4me-commerce-${randomUUID()}`;
let storage: StorageService;
let mediaBucketCreated = false;
const mediaClient = new S3Client({
  endpoint: process.env.TEST_S3_ENDPOINT ?? 'http://127.0.0.1:8333',
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID ?? 'gym4me_local',
    secretAccessKey:
      process.env.TEST_S3_SECRET_ACCESS_KEY ?? 'gym4me_local_storage',
  },
});
const policy = {
  cancellationHours: 0,
  lateRefundBasisPoints: 10000,
  noShowConsumesSession: false,
  consumeOn: 'attendance' as const,
  freezeDays: 7,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms: 'Test-only cancellation and attendance policy.',
};
async function uiFixtureIsRunning() {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ host: '127.0.0.1', port: 7088 });
    let settled = false;
    const finish = (running: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(running);
    };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}
async function create(
  kind: 'class' | 'court' | 'membership' | 'course' = 'class',
  amount = '0',
  resourceIds: string[] = [],
  sessionCount: number | null = null,
  includedServiceIds: string[] = [],
) {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: `Service ${randomUUID()}`,
      kind,
      amountMinor: amount,
      policy,
      resourceIds,
      sessionCount,
      offering: { includedServiceIds },
    }),
  );
  await commerce.publish(owner, service.id, 1);
  return service;
}
async function occurrence(
  serviceId: string,
  capacity = 1,
  start = Date.now() + 86400000,
) {
  return commerce.schedule(owner, serviceId, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity,
  });
}
beforeAll(async () => {
  if (
    new URL(databaseUrl).pathname === '/gym4me_test' &&
    (await uiFixtureIsRunning())
  )
    throw new Error('Stop the UI fixture on 7088 before using gym4me_test.');
  testingModule = await Test.createTestingModule({
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
      WorkspacesModule,
    ],
  }).compile();
  db = testingModule.get(DatabaseService).db;
  commerce = testingModule.get(CommerceService);
  storage = testingModule.get(StorageService);
  await mediaClient.send(new CreateBucketCommand({ Bucket: mediaBucket }));
  mediaBucketCreated = true;
  community = testingModule.get(SportsConversationService);
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  for (let i = 0; i < 3; i++) {
    const [u] = await db
      .insert(s.users)
      .values({
        phone: `+989${String(Date.now()).slice(-7)}${i}${Math.floor(Math.random() * 9)}`,
        displayName: 'Commerce test',
        phoneVerifiedAt: new Date(),
      })
      .returning();
    userIds.push(u.id);
  }
  [owner, athlete, other] = userIds;
  const [o] = await db
    .insert(s.organizations)
    .values({
      name: 'Isolated commerce test',
      slug: `commerce-${randomUUID()}`,
      status: 'approved',
    })
    .returning();
  org = o.id;
  await db
    .insert(s.organizationMembers)
    .values({ organizationId: org, userId: owner, role: 'owner' });
  await db
    .insert(s.clubs)
    .values({ id: org, ownerId: owner, publicationStatus: 'published' });
  const [b] = await db
    .insert(s.branches)
    .values({ organizationId: org, name: 'Test branch', slug: 'test' })
    .returning();
  branch = b.id;
  await db.insert(s.branchProfiles).values({ clubId: org, branchId: branch });
  const [second] = await db
    .insert(s.organizations)
    .values({
      name: 'Isolated second organization',
      slug: `commerce-${randomUUID()}`,
      status: 'approved',
    })
    .returning();
  secondOrg = second.id;
  await db.insert(s.organizationMembers).values({
    organizationId: secondOrg,
    userId: other,
    role: 'owner',
  });
  await db
    .insert(s.clubs)
    .values({ id: secondOrg, ownerId: other, publicationStatus: 'published' });
  const [secondLocation] = await db
    .insert(s.branches)
    .values({
      organizationId: secondOrg,
      name: 'Second branch',
      slug: 'second',
    })
    .returning();
  secondBranch = secondLocation.id;
  await db.insert(s.branchProfiles).values({
    clubId: secondOrg,
    branchId: secondBranch,
  });
});
afterAll(async () => {
  const cleanupErrors: unknown[] = [];
  try {
    if (storage && mediaBucketCreated) {
      for await (const object of storage.objects(''))
        await storage.delete(object.key);
      await mediaClient.send(new DeleteBucketCommand({ Bucket: mediaBucket }));
    }
  } catch (error) {
    cleanupErrors.push(error);
  } finally {
    mediaClient.destroy();
  }
  try {
    if (db) {
      const tables = await rows<{ tablename: string }>(
        db,
        sql`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sport_%'`,
      );
      if (tables.length)
        await db.execute(
          sql.raw(
            `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(',')} CASCADE`,
          ),
        );
      await db.execute(sql`DELETE FROM branch_profiles WHERE club_id=${org}`);
      await db.execute(
        sql`DELETE FROM branch_profiles WHERE club_id=${secondOrg}`,
      );
      await db.execute(sql`DELETE FROM branches WHERE organization_id=${org}`);
      await db.execute(
        sql`DELETE FROM branches WHERE organization_id=${secondOrg}`,
      );
      await db.execute(sql`DELETE FROM clubs WHERE id=${org}`);
      await db.execute(sql`DELETE FROM clubs WHERE id=${secondOrg}`);
      await db.execute(
        sql`DELETE FROM organization_members WHERE organization_id=${org}`,
      );
      await db.execute(
        sql`DELETE FROM organization_members WHERE organization_id=${secondOrg}`,
      );
      await db.execute(
        sql`DELETE FROM audit_events WHERE organization_id=${org}`,
      );
      await db.execute(sql`DELETE FROM platform_admins WHERE user_id=${owner}`);
      await db.execute(sql`DELETE FROM organizations WHERE id=${org}`);
      await db.execute(sql`DELETE FROM organizations WHERE id=${secondOrg}`);
      for (const id of userIds)
        await db.execute(sql`DELETE FROM users WHERE id=${id}`);
    }
  } catch (error) {
    cleanupErrors.push(error);
  } finally {
    if (testingModule)
      try {
        await testingModule.close();
      } catch (error) {
        cleanupErrors.push(error);
      }
  }
  if (cleanupErrors.length)
    throw new AggregateError(
      cleanupErrors,
      'Isolated test cleanup incomplete; verify the owned test database and bucket.',
    );
});
test('public service detail and catalogue use actual price, branch and capacity', async () => {
  const service = await create();
  await occurrence(service.id);
  const detail = await commerce.detail(service.id);
  expect(detail.occurrences).toHaveLength(1);
  expect(detail.amount_minor).toBe('0');
  expect((await commerce.catalog()).some((v) => v.id === service.id)).toBe(
    true,
  );
});
test('service images are private drafts, idempotent and preserved by service edits until publication', async () => {
  const service = await create();
  const media = testingModule.get(SportsMediaService);
  const bytes = await sharp({
    create: { width: 24, height: 16, channels: 3, background: '#227744' },
  })
    .png()
    .toBuffer();
  const file = { buffer: bytes, size: bytes.length, mimetype: 'image/png' };
  const input = {
    revision: 2,
    idempotencyKey: randomUUID(),
    alt: 'Test service image',
  };
  await expect(media.upload(other, service.id, input, file)).rejects.toThrow();
  const uploaded = await media.upload(owner, service.id, input, file);
  expect(uploaded.revision).toBe(3);
  expect(await media.upload(owner, service.id, input, file)).toEqual(uploaded);
  await expect(
    media.upload(owner, service.id, { ...input, alt: 'Changed caption' }, file),
  ).rejects.toThrow('Backend.scheduleKeyReused');
  expect((await commerce.detail(service.id)).cover).toBeNull();
  await expect(media.publicContent(uploaded.cover!.id)).rejects.toThrow(
    'Backend.mediaNotFound',
  );
  expect((await media.preview(owner, service.id)).url).toContain(
    'X-Amz-Signature',
  );
  await expect(media.preview(other, service.id)).rejects.toThrow();
  await commerce.publish(owner, service.id, 3);
  const publicImage = await media.publicContent(uploaded.cover!.id);
  expect((await sharp(publicImage.body).metadata()).format).toBe('webp');
  expect((await commerce.detail(service.id)).cover).toEqual(uploaded.cover);
  const next = await testingModule.get(SportsOperationsService).updateService(
    owner,
    service.id,
    4,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Service with retained image',
      kind: 'class',
      amountMinor: '0',
      policy,
    }),
  );
  expect(
    (await commerce.business(owner, org, branch)).find(
      (item) => item.id === service.id,
    )?.cover,
  ).toEqual(uploaded.cover);
  const removal = {
    revision: Number(next.revision),
    idempotencyKey: randomUUID(),
  };
  const removed = await media.remove(owner, service.id, removal);
  expect(await media.remove(owner, service.id, removal)).toEqual(removed);
  await expect(media.preview(owner, service.id)).rejects.toThrow(
    'Backend.mediaNotFound',
  );
  await expect(media.publicContent(uploaded.cover!.id)).resolves.toMatchObject({
    contentType: 'image/webp',
  });
  await commerce.publish(owner, service.id, removed.revision);
  await expect(media.publicContent(uploaded.cover!.id)).rejects.toThrow(
    'Backend.mediaNotFound',
  );
});
test('service image ownership, invalid uploads and stale revision cannot create cross-service references or leave objects', async () => {
  const a = await create();
  const b = await create();
  const media = testingModule.get(SportsMediaService);
  const bytes = await sharp({
    create: { width: 16, height: 16, channels: 3, background: '#445588' },
  })
    .png()
    .toBuffer();
  const file = { buffer: bytes, size: bytes.length, mimetype: 'image/png' };
  const uploaded = await media.upload(
    owner,
    a.id,
    { revision: 2, idempotencyKey: randomUUID(), alt: 'Private service cover' },
    file,
  );
  await expect(
    db.execute(
      sql`UPDATE sport_service_versions SET cover_image_id=${uploaded.cover!.id} WHERE service_id=${b.id}`,
    ),
  ).rejects.toThrow();
  const before = [] as string[];
  for await (const object of storage.objects(`sports/service-images/${a.id}/`))
    before.push(object.key);
  await expect(
    media.upload(
      owner,
      a.id,
      { revision: 2, idempotencyKey: randomUUID(), alt: 'Stale cover' },
      file,
    ),
  ).rejects.toThrow('Backend.serviceChanged');
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
  );
  await expect(
    media.upload(
      owner,
      a.id,
      { revision: 3, idempotencyKey: randomUUID(), alt: 'Invalid cover' },
      { buffer: svg, size: svg.length, mimetype: 'image/png' },
    ),
  ).rejects.toThrow('Backend.invalidImage');
  const after = [] as string[];
  for await (const object of storage.objects(`sports/service-images/${a.id}/`))
    after.push(object.key);
  expect(after.sort()).toEqual(before.sort());
  const [manager] = await db
    .insert(s.organizationMembers)
    .values({
      organizationId: org,
      userId: other,
      role: 'manager',
      allBranches: false,
    })
    .returning();
  try {
    await expect(media.preview(other, a.id)).rejects.toThrow();
    await db
      .insert(s.organizationMemberBranches)
      .values({ organizationId: org, memberId: manager.id, branchId: branch });
    await expect(media.preview(other, a.id)).resolves.toHaveProperty('url');
  } finally {
    await db.execute(
      sql`DELETE FROM organization_member_branches WHERE member_id=${manager.id}`,
    );
    await db.execute(
      sql`DELETE FROM organization_members WHERE id=${manager.id}`,
    );
  }
});
test('sports object retention deletes abandoned uploads while preserving historical service images', async () => {
  const service = await create();
  const media = testingModule.get(SportsMediaService);
  const bytes = await sharp({
    create: { width: 12, height: 8, channels: 3, background: '#226699' },
  })
    .png()
    .toBuffer();
  const file = { buffer: bytes, size: bytes.length, mimetype: 'image/png' };
  const first = await media.upload(
    owner,
    service.id,
    { revision: 2, idempotencyKey: randomUUID(), alt: 'First image' },
    file,
  );
  await commerce.publish(owner, service.id, first.revision);
  const second = await media.upload(
    owner,
    service.id,
    { revision: 4, idempotencyKey: randomUUID(), alt: 'Second image' },
    file,
  );
  await commerce.publish(owner, service.id, second.revision);
  await expect(media.publicContent(first.cover!.id)).rejects.toThrow(
    'Backend.mediaNotFound',
  );
  await expect(media.publicContent(second.cover!.id)).resolves.toHaveProperty(
    'body',
  );
  const orphan = `sports/service-images/${service.id}/${randomUUID()}.webp`;
  await storage.put(orphan, bytes, 'image/webp');
  const retention = testingModule.get(MediaRetentionService);
  const later = new Date(Date.now() + 8 * 86400000);
  expect((await retention.run(false, later)).eligibleObjects).toBe(1);
  expect((await retention.run(true, later)).deletedObjects).toBe(1);
  await expect(storage.get(orphan)).rejects.toThrow();
  const [old] = await rows<{ object_key: string }>(
    db,
    sql`SELECT object_key FROM sport_service_images WHERE id=${first.cover!.id}`,
  );
  await expect(storage.get(old.object_key)).resolves.toBeInstanceOf(Buffer);
  expect((await retention.run(true, later)).deletedObjects).toBe(0);
});
test('recurring sessions are atomic, idempotent and scoped to staff', async () => {
  const service = await create('class');
  const start = Date.now() + 31 * 86400000;
  const input = {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 8,
    count: 3,
    intervalDays: 7 as const,
    revision: 2,
    idempotencyKey: randomUUID(),
  };
  await expect(
    commerce.scheduleSeries(other, service.id, input),
  ).rejects.toThrow();
  const first = await commerce.scheduleSeries(owner, service.id, input);
  const retry = await commerce.scheduleSeries(owner, service.id, input);
  expect(first.occurrences).toHaveLength(3);
  expect(retry.occurrences.map((o) => o.id)).toEqual(
    first.occurrences.map((o) => o.id),
  );
  expect(
    new Date(first.occurrences[1].start_at).getTime() -
      new Date(first.occurrences[0].start_at).getTime(),
  ).toBe(7 * 86400000);
  await expect(
    commerce.scheduleSeries(owner, service.id, { ...input, count: 2 }),
  ).rejects.toThrow('Backend.scheduleKeyReused');
  const persisted = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_occurrences WHERE series_id=${first.id}`,
  );
  expect(persisted[0].count).toBe(3);
});
test('a late series conflict rolls back every earlier session and the series', async () => {
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Series room',
    [],
  );
  const target = await create('class', '0', [resource.id]);
  const occupied = await create('class', '0', [resource.id]);
  const start = Date.now() + 42 * 86400000;
  await occurrence(occupied.id, 8, start + 7 * 86400000);
  const input = {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 8,
    count: 3,
    intervalDays: 7 as const,
    revision: 2,
    idempotencyKey: randomUUID(),
  };
  await expect(
    commerce.scheduleSeries(owner, target.id, input),
  ).rejects.toThrow('Backend.scheduleConflict');
  const [occurrences] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_occurrences WHERE service_id=${target.id}`,
  );
  const [series] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_occurrence_series WHERE service_id=${target.id}`,
  );
  expect(occurrences.count).toBe(0);
  expect(series.count).toBe(0);
});
test('series edit preserves session identities and refuses stale or enrolled changes', async () => {
  const service = await create('class');
  const start = Date.now() + 60 * 86400000;
  const series = await commerce.scheduleSeries(owner, service.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 8,
    count: 3,
    intervalDays: 7,
    revision: 2,
    idempotencyKey: randomUUID(),
  });
  const [available] = await commerce.listSeries(owner, service.id);
  expect(available.id).toBe(series.id);
  expect(available.editable).toBe(true);
  await expect(commerce.listSeries(other, service.id)).rejects.toThrow();
  // The first new date initially belongs to the second session. The final
  // schedule is valid and must be committed atomically without changing IDs.
  const move = start + 7 * 86400000;
  const input = {
    startAt: new Date(move).toISOString(),
    endAt: new Date(move + 5400000).toISOString(),
    capacity: 6,
    intervalDays: 1 as const,
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Test schedule correction',
  };
  await expect(
    commerce.editSeries(other, service.id, series.id, input),
  ).rejects.toThrow();
  const edited = await commerce.editSeries(owner, service.id, series.id, input);
  expect(edited.revision).toBe(2);
  expect(edited.occurrences.map((item) => item.id)).toEqual(
    series.occurrences.map((item) => item.id),
  );
  expect(
    Date.parse(edited.occurrences[1].startAt) -
      Date.parse(edited.occurrences[0].startAt),
  ).toBe(86400000);
  expect(
    await commerce.editSeries(owner, service.id, series.id, input),
  ).toEqual(edited);
  await expect(
    commerce.editSeries(owner, service.id, series.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.seriesChanged');
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: edited.occurrences[0].id,
    idempotencyKey: randomUUID(),
  });
  expect(order.reservations).toHaveLength(1);
  expect((await commerce.listSeries(owner, service.id))[0].editable).toBe(
    false,
  );
  await expect(
    commerce.editSeries(owner, service.id, series.id, {
      ...input,
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.seriesLocked');
});
test('failed series edit restores old times and resource occupancies', async () => {
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Edit room',
    [],
  );
  const target = await create('class', '0', [resource.id]);
  const blocker = await create('class', '0', [resource.id]);
  const start = Date.now() + 70 * 86400000;
  const series = await commerce.scheduleSeries(owner, target.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 8,
    count: 2,
    intervalDays: 7,
    revision: 2,
    idempotencyKey: randomUUID(),
  });
  const moved = start + 4 * 86400000;
  await occurrence(blocker.id, 8, moved + 7 * 86400000);
  await expect(
    commerce.editSeries(owner, target.id, series.id, {
      startAt: new Date(moved).toISOString(),
      endAt: new Date(moved + 3600000).toISOString(),
      capacity: 5,
      intervalDays: 7,
      revision: 1,
      idempotencyKey: randomUUID(),
      reason: 'Move the weekly class',
    }),
  ).rejects.toThrow('Backend.scheduleConflict');
  const after = await rows<{ id: string; start_at: Date }>(
    db,
    sql`SELECT id,start_at FROM sport_occurrences WHERE series_id=${series.id} ORDER BY start_at`,
  );
  expect(after.map((item) => item.id)).toEqual(
    series.occurrences.map((item) => item.id),
  );
  expect(new Date(after[0].start_at).getTime()).toBe(start);
  const [occupancies] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_occupancies WHERE occurrence_id=ANY(${`{${after.map((item) => item.id).join(',')}}`}::uuid[]) AND active=true`,
  );
  expect(occupancies.count).toBe(2);
  const [unchanged] = await rows<{ revision: number }>(
    db,
    sql`SELECT revision FROM sport_occurrence_series WHERE id=${series.id}`,
  );
  expect(unchanged.revision).toBe(1);
});
test('editing a published service keeps its live version and old orders until explicit publication', async () => {
  const input = serviceSchema.parse({
    organizationId: org,
    branchId: branch,
    title: 'Original class',
    kind: 'class',
    amountMinor: '1000000',
    policy,
  });
  const service = await commerce.createService(owner, input);
  await commerce.publish(owner, service.id, 1);
  const first = await occurrence(service.id, 3);
  const oldOrder = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: first.id,
    idempotencyKey: randomUUID(),
  });
  const ops = testingModule.get(SportsOperationsService);
  const draft = await ops.updateService(owner, service.id, 2, {
    ...input,
    title: 'Revised class',
    amountMinor: '2000000',
    policy: { ...policy, terms: 'Updated test-only policy and terms.' },
  });
  expect(draft.status).toBe('published');
  expect((await commerce.detail(service.id)).title).toBe('Original class');
  expect((await commerce.detail(service.id)).amount_minor).toBe('1000000');
  expect(
    (await commerce.catalog('Original class')).some(
      (item) => item.id === service.id,
    ),
  ).toBe(true);
  const business = (await commerce.business(owner, org, branch)).find(
    (item) => item.id === service.id,
  );
  expect(business?.title).toBe('Revised class');
  expect(business?.has_unpublished_changes).toBe(true);
  const whileDraft = await occurrence(service.id, 3, Date.now() + 172800000);
  expect(whileDraft.version_id).toBe(service.version_id);
  await commerce.publish(owner, service.id, Number(draft.revision));
  expect((await commerce.detail(service.id)).title).toBe('Revised class');
  expect((await commerce.detail(service.id)).amount_minor).toBe('2000000');
  expect((await commerce.myOrder(athlete, oldOrder.id)).amount_minor).toBe(
    '1000000',
  );
  expect(
    (await commerce.myOrder(athlete, oldOrder.id)).reservations[0].title,
  ).toBe('Original class');
  expect(
    (await commerce.bookings(athlete)).find(
      (booking) => booking.order_id === oldOrder.id,
    )?.title,
  ).toBe('Original class');
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'New court',
    [],
  );
  await expect(
    ops.updateService(owner, service.id, 4, {
      ...input,
      resourceIds: [String(resource.id)],
    }),
  ).rejects.toThrow('Future sessions still use');
});
test('eligibility follows publication and is snapshotted without changing past orders', async () => {
  const eligibility = eligibilitySchema.parse({
    minimumAge: 18,
    maximumAge: 60,
    prerequisites: [{ kind: 'equipment', description: 'Bring a towel' }],
  });
  const input = serviceSchema.parse({
    organizationId: org,
    branchId: branch,
    title: 'Eligibility version test',
    kind: 'class',
    amountMinor: '100000',
    policy,
    eligibility,
  });
  const service = await commerce.createService(owner, input);
  await commerce.publish(owner, service.id, 1);
  const slot = await occurrence(service.id, 4);
  const quote = await commerce.quote(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    participants: [
      {
        name: 'Synthetic eligible athlete',
        birthDate: '1990-01-01',
        gender: 'unspecified',
      },
    ],
  });
  expect(quote.eligibility).toEqual(eligibility);
  const oldOrder = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    participants: [
      {
        name: 'Synthetic eligible athlete',
        birthDate: '1990-01-01',
        gender: 'unspecified',
      },
    ],
    quoteId: quote.id,
    idempotencyKey: randomUUID(),
  });
  const revised = eligibilitySchema.parse({
    minimumAge: 21,
    maximumAge: null,
    prerequisites: [
      { kind: 'experience', description: 'Complete the introductory class' },
      { kind: 'equipment', description: 'Bring your own mat' },
    ],
  });
  const draft = await testingModule
    .get(SportsOperationsService)
    .updateService(owner, service.id, 2, { ...input, eligibility: revised });
  expect((await commerce.detail(service.id)).eligibility).toEqual(eligibility);
  expect(
    (await commerce.business(owner, org, branch)).find(
      (item) => item.id === service.id,
    )?.eligibility,
  ).toEqual(revised);
  await commerce.publish(owner, service.id, Number(draft.revision));
  expect((await commerce.detail(service.id)).eligibility).toEqual(revised);
  expect(
    (await commerce.myOrder(athlete, oldOrder.id)).snapshot.eligibility,
  ).toEqual(eligibility);
  await expect(
    commerce.checkout(other, {
      serviceId: service.id,
      occurrenceId: slot.id,
      participants: [
        {
          name: 'Synthetic eligible athlete',
          birthDate: '1990-01-01',
          gender: 'unspecified',
        },
      ],
      quoteId: (
        await commerce.quote(other, {
          serviceId: service.id,
          occurrenceId: slot.id,
          participants: [
            {
              name: 'Synthetic eligible athlete',
              birthDate: '1990-01-01',
              gender: 'unspecified',
            },
          ],
        })
      ).id,
      idempotencyKey: randomUUID(),
    }),
  ).resolves.toMatchObject({ snapshot: { eligibility: revised } });
  await expect(
    commerce.checkout(athlete, {
      serviceId: service.id,
      occurrenceId: slot.id,
      participants: [
        {
          name: 'Synthetic eligible athlete',
          birthDate: '1990-01-01',
          gender: 'unspecified',
        },
      ],
      quoteId: quote.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Quote changed');
});
test('age ranges and structured prerequisites are constrained by both input and PostgreSQL', async () => {
  const invalid = [
    { minimumAge: 30, maximumAge: 20, prerequisites: [] },
    { minimumAge: -1, maximumAge: null, prerequisites: [] },
    { minimumAge: 18.5, maximumAge: 60, prerequisites: [] },
    { minimumAge: null, maximumAge: 121, prerequisites: [] },
    {
      minimumAge: null,
      maximumAge: null,
      prerequisites: [{ kind: 'unknown', description: 'Test' }],
    },
    {
      minimumAge: null,
      maximumAge: null,
      prerequisites: [{ kind: 'equipment' }],
    },
    {
      minimumAge: null,
      maximumAge: null,
      prerequisites: [{ kind: 'equipment', description: '   ' }],
    },
    {
      minimumAge: null,
      maximumAge: null,
      prerequisites: Array.from({ length: 13 }, () => ({
        kind: 'equipment',
        description: 'Towel',
      })),
    },
  ];
  for (const value of invalid) {
    expect(eligibilitySchema.safeParse(value).success).toBe(false);
    const [result] = await rows<{ valid: boolean }>(
      db,
      sql`SELECT sport_valid_eligibility(${JSON.stringify(value)}::jsonb) valid`,
    );
    expect(result.valid).toBe(false);
  }
  const service = await create();
  await expect(
    db.execute(
      sql`UPDATE sport_service_versions SET eligibility=${JSON.stringify(invalid[0])}::jsonb WHERE service_id=${service.id}`,
    ),
  ).rejects.toThrow();
  expect((await commerce.detail(service.id)).eligibility).toEqual({
    minimumAge: null,
    maximumAge: null,
    prerequisites: [],
  });
});
test('last seat cannot be reserved twice in concurrent requests', async () => {
  const service = await create();
  const o = await occurrence(service.id);
  const results = await Promise.allSettled(
    [athlete, other].map((user) =>
      commerce.checkout(user, {
        serviceId: service.id,
        occurrenceId: o.id,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
});
test('checkout retries return the same order and reject changed payloads', async () => {
  const service = await create();
  const o = await occurrence(service.id, 3);
  const key = randomUUID();
  const input = {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: key,
  };
  const a = await commerce.checkout(athlete, input);
  const b = await commerce.checkout(athlete, input);
  expect(a.id).toBe(b.id);
  await expect(
    commerce.checkout(athlete, { ...input, serviceId: randomUUID() }),
  ).rejects.toThrow();
});
test.each(['0', '1000000'])(
  'a second checkout for the same active session returns a conflict without an orphan order (%s)',
  async (amount) => {
    const service = await create('class', amount);
    const slot = await occurrence(service.id, 4);
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        commerce.checkout(athlete, {
          serviceId: service.id,
          occurrenceId: slot.id,
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find(
      (result) => result.status === 'rejected',
    ) as PromiseRejectedResult;
    const failure: unknown = rejected.reason;
    if (!(failure instanceof ConflictException)) throw failure;
    expect(failure.getStatus()).toBe(409);
    expect(failure.message).toBe('Backend.sessionAlreadyReserved');
    expect(
      (
        await rows<{ count: number }>(
          db,
          sql`SELECT count(*)::int AS count FROM sport_orders WHERE service_id=${service.id} AND user_id=${athlete}`,
        )
      )[0].count,
    ).toBe(1);
  },
);
test('host discount codes are scoped, revocable and leave old order prices intact', async () => {
  const service = await create('class', '1000000');
  const slot = await occurrence(service.id, 2);
  const coupon = await commerce.createCoupon(
    owner,
    service.id,
    couponSchema.parse({
      code: 'save20',
      basisPoints: 2000,
      maxUses: 1,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
  );
  expect(coupon.code).toBe('SAVE20');
  expect((await commerce.coupons(owner, service.id))[0].used).toBe(0);
  await expect(commerce.coupons(other, service.id)).rejects.toThrow();
  const quote = await commerce.quote(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    coupon: 'SAVE20',
  });
  expect(quote.amountMinor).toBe('800000');
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    coupon: 'SAVE20',
    quoteId: quote.id,
    idempotencyKey: randomUUID(),
  });
  expect(order.amount_minor).toBe('800000');
  expect((await commerce.coupons(owner, service.id))[0].used).toBe(1);
  await expect(
    commerce.quote(other, {
      serviceId: service.id,
      occurrenceId: slot.id,
      coupon: 'SAVE20',
    }),
  ).rejects.toThrow('Coupon limit reached');
  await expect(
    commerce.disableCoupon(other, service.id, coupon.id, 1),
  ).rejects.toThrow();
  const disabled = await commerce.disableCoupon(
    owner,
    service.id,
    coupon.id,
    1,
  );
  expect(disabled.revision).toBe(2);
  await expect(
    commerce.disableCoupon(owner, service.id, coupon.id, 1),
  ).rejects.toThrow();
  await expect(
    commerce.quote(other, {
      serviceId: service.id,
      occurrenceId: slot.id,
      coupon: 'SAVE20',
    }),
  ).rejects.toThrow();
  expect((await commerce.myOrder(athlete, order.id)).amount_minor).toBe(
    '800000',
  );
  const audit = await rows(
    db,
    sql`SELECT id FROM audit_events WHERE target_id=${coupon.id} AND action IN ('sports.coupon.create','sports.coupon.disable')`,
  );
  expect(audit).toHaveLength(2);
});
test('the last discount use cannot be claimed by two concurrent checkouts', async () => {
  const service = await create('class', '1000000');
  const slot = await occurrence(service.id, 2);
  await commerce.createCoupon(
    owner,
    service.id,
    couponSchema.parse({
      code: 'LASTONE',
      basisPoints: 1000,
      maxUses: 1,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }),
  );
  const attempts = await Promise.allSettled(
    [athlete, other].map((userId) =>
      commerce.checkout(userId, {
        serviceId: service.id,
        occurrenceId: slot.id,
        coupon: 'LASTONE',
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  expect(
    attempts.filter((attempt) => attempt.status === 'fulfilled'),
  ).toHaveLength(1);
  expect(
    attempts.filter((attempt) => attempt.status === 'rejected'),
  ).toHaveLength(1);
  expect((await commerce.coupons(owner, service.id))[0].used).toBe(1);
});
test('payment confirmation is server verified and repeated confirmation posts one journal', async () => {
  const service = await create('class', '2500000');
  const o = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  expect(order.status).toBe('awaiting_payment');
  const started = await commerce.startPayment(
    athlete,
    order.id,
    'success',
    randomUUID(),
  );
  const pendingReplay = await commerce.startPayment(
    athlete,
    order.id,
    'success',
    randomUUID(),
  );
  expect(pendingReplay).toMatchObject({
    id: started.id,
    provider: 'saman_mock',
    scenario: 'success',
  });
  await commerce.verifyPayment(athlete, order.id);
  await commerce.verifyPayment(athlete, order.id);
  const result = await commerce.myOrder(athlete, order.id);
  expect(result.status).toBe('paid');
  expect(result.reservations[0].status).toBe('confirmed');
  const journals = await rows(
    db,
    sql`SELECT id FROM sport_journals WHERE order_id=${order.id} AND source_key LIKE 'payment:%'`,
  );
  expect(journals).toHaveLength(1);
});
test('BankTest callbacks require signed attempt, verified receipt and unique bank reference', async () => {
  const config = testingModule.get(ConfigService);
  const previousProvider = config.get<string>('PAYMENT_PROVIDER');
  const previousTerminal = config.get<string>('SAMAN_SANDBOX_TERMINAL_ID');
  config.set('PAYMENT_PROVIDER', 'saman_sandbox');
  config.set('SAMAN_SANDBOX_TERMINAL_ID', '123456');
  const fetcher = jest.spyOn(global, 'fetch');
  const token = () =>
    new Response(JSON.stringify({ status: 1, token: randomUUID() }));
  const receipt = `receipt-${randomUUID()}`;
  try {
    const service = await create('class', '2500000');
    const slot = await occurrence(service.id, 10);
    const makeOrder = (userId: string) =>
      commerce.checkout(userId, {
        serviceId: service.id,
        occurrenceId: slot.id,
        idempotencyKey: randomUUID(),
      });
    const order = await makeOrder(athlete);
    fetcher.mockResolvedValueOnce(token());
    const key = randomUUID();
    const started = await commerce.startPayment(
      athlete,
      order.id,
      'success',
      key,
    );
    const replay = await commerce.startPayment(
      athlete,
      order.id,
      'success',
      key,
    );
    expect(replay).toMatchObject({
      id: started.id,
      provider: 'saman_sandbox',
      gateway_url: started.gateway_url,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string) as {
      RedirectUrl: string;
      ResNum: string;
    };
    const proof = new URL(payload.RedirectUrl).searchParams.get('proof')!;
    const waiting = await commerce.verifyPayment(athlete, order.id);
    expect(waiting.status).toBe('awaiting_payment');
    expect(waiting.payments[0].state).toBe('unknown');
    await expect(
      commerce.samanPaymentCallback(payload.ResNum, '0'.repeat(64), {
        ResNum: payload.ResNum,
        RefNum: receipt,
      }),
    ).rejects.toThrow('Invalid payment callback');
    await expect(
      commerce.samanPaymentCallback(payload.ResNum, proof, {
        ResNum: '0'.repeat(40),
        RefNum: receipt,
      }),
    ).rejects.toThrow('Invalid payment callback');
    fetcher.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          Success: true,
          ResultCode: 0,
          TransactionDetail: {
            RefNum: receipt,
            TerminalNumber: '123456',
            OrginalAmount: 2500000,
          },
        }),
      ),
    );
    expect(
      await commerce.samanPaymentCallback(payload.ResNum, proof, {
        ResNum: payload.ResNum,
        RefNum: receipt,
      }),
    ).toBe(order.id);
    await commerce.samanPaymentCallback(payload.ResNum, proof, {
      ResNum: payload.ResNum,
      RefNum: receipt,
    });
    const result = await commerce.myOrder(athlete, order.id);
    expect(result.status).toBe('paid');
    expect(result.reservations[0].status).toBe('confirmed');
    expect(
      await rows(
        db,
        sql`SELECT id FROM sport_journals WHERE order_id=${order.id} AND source_key LIKE 'payment:%'`,
      ),
    ).toHaveLength(1);
    const second = await makeOrder(other);
    fetcher.mockResolvedValueOnce(token());
    await commerce.startPayment(other, second.id, 'success', randomUUID());
    const last = fetcher.mock.calls.at(-1)!;
    const secondPayload = JSON.parse(last[1]!.body as string) as {
      RedirectUrl: string;
      ResNum: string;
    };
    const secondProof = new URL(secondPayload.RedirectUrl).searchParams.get(
      'proof',
    )!;
    await expect(
      commerce.samanPaymentCallback(secondPayload.ResNum, secondProof, {
        ResNum: secondPayload.ResNum,
        RefNum: receipt,
      }),
    ).rejects.toThrow('Payments.mismatch');
    await commerce.samanPaymentCallback(secondPayload.ResNum, secondProof, {
      ResNum: secondPayload.ResNum,
    });
    const cancelled = await commerce.myOrder(other, second.id);
    expect(cancelled.payments[0].state).toBe('failed');
    expect(cancelled.status).toBe('awaiting_payment');
  } finally {
    fetcher.mockRestore();
    config.set('PAYMENT_PROVIDER', previousProvider);
    config.set('SAMAN_SANDBOX_TERMINAL_ID', previousTerminal);
  }
});
test('authenticated mock callback targets its own attempt and is idempotent', async () => {
  const service = await create('class', '2500000');
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const first = await commerce.startPayment(
    athlete,
    order.id,
    'failure',
    randomUUID(),
  );
  await commerce.verifyPayment(athlete, order.id);
  const second = await commerce.startPayment(
    athlete,
    order.id,
    'success',
    randomUUID(),
  );
  const payments = await rows<{ id: string; reference: string }>(
    db,
    sql`SELECT id,reference FROM sport_payments WHERE order_id=${order.id}`,
  );
  const firstReference = payments.find((p) => p.id === first.id)!.reference;
  const secondReference = payments.find((p) => p.id === second.id)!.reference;
  const adapter = testingModule.get<SamanMockPaymentAdapter>(
    SamanMockPaymentAdapter,
  );
  await expect(
    commerce.mockPaymentCallback(secondReference, '0'.repeat(64)),
  ).rejects.toThrow('Invalid payment callback');
  const failed = await commerce.mockPaymentCallback(
    firstReference,
    adapter.signCallback(firstReference),
  );
  expect(failed.status).toBe('awaiting_payment');
  const pending = await rows<{ state: string }>(
    db,
    sql`SELECT state FROM sport_payments WHERE id=${second.id}`,
  );
  expect(pending[0].state).toBe('pending');
  await commerce.mockPaymentCallback(
    secondReference,
    adapter.signCallback(secondReference),
  );
  const replay = await commerce.mockPaymentCallback(
    secondReference,
    adapter.signCallback(secondReference),
  );
  expect(replay.status).toBe('paid');
  const journals = await rows(
    db,
    sql`SELECT id FROM sport_journals WHERE order_id=${order.id} AND source_key LIKE 'payment:%'`,
  );
  expect(journals).toHaveLength(1);
});
test('a stale payment query cannot confirm a later retry', async () => {
  const service = await create('class', '2500000');
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const failed = await commerce.startPayment(
    athlete,
    order.id,
    'failure',
    randomUUID(),
  );
  await commerce.verifyPayment(athlete, order.id);
  const retry = await commerce.startPayment(
    athlete,
    order.id,
    'success',
    randomUUID(),
  );
  await rows(
    db,
    sql`UPDATE sport_outbox SET due_at=now()+interval '1 day' WHERE kind='payment.query' AND payload->>'paymentId'=${retry.id}`,
  );
  await commerce.runJobs();
  const payments = await rows<{ id: string; state: string }>(
    db,
    sql`SELECT id,state FROM sport_payments WHERE order_id=${order.id}`,
  );
  expect(payments.find((payment) => payment.id === failed.id)?.state).toBe(
    'failed',
  );
  expect(payments.find((payment) => payment.id === retry.id)?.state).toBe(
    'pending',
  );
  expect((await commerce.myOrder(athlete, order.id)).status).toBe(
    'awaiting_payment',
  );
});
async function invitationAthlete() {
  const [user] = await db
    .insert(s.users)
    .values({
      phone: `+989${randomInt(100000000, 999999999)}`,
      displayName: `Invite ${randomUUID().slice(0, 8)}`,
      phoneVerifiedAt: new Date(),
    })
    .returning();
  userIds.push(user.id);
  const membership = await create('membership', '0', [], 2);
  await commerce.checkout(user.id, {
    serviceId: membership.id,
    idempotencyKey: randomUUID(),
  });
  return user;
}
test('invitations only expose eligible branch athletes with masked phone numbers', async () => {
  const invitations = testingModule.get(SportsInvitationService),
    user = await invitationAthlete(),
    service = await create();
  const people = await invitations.recipients(
    owner,
    service.id,
    user.displayName!,
  );
  expect(people).toHaveLength(1);
  expect(people[0]).toMatchObject({
    id: user.id,
    phone_suffix: user.phone.slice(-4),
  });
  expect(people[0]).not.toHaveProperty('phone');
  const localPhone = user.phone
    .replace('+98', '0')
    .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
  const parsed = invitationRecipientSchema.parse({ search: localPhone });
  expect(parsed.search).toBe(user.phone);
  expect(
    await invitations.recipients(owner, service.id, parsed.search),
  ).toHaveLength(1);
  await expect(invitations.recipients(other, service.id, '')).rejects.toThrow();
  await expect(invitations.host(other, service.id)).rejects.toThrow();
  await expect(
    invitations.create(owner, {
      serviceId: service.id,
      userId: other,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationRecipientUnavailable');
  await db
    .update(s.users)
    .set({ deletionPending: true })
    .where(sql`id=${user.id}`);
  expect(
    await invitations.recipients(owner, service.id, user.displayName!),
  ).toHaveLength(0);
  await expect(
    invitations.create(owner, {
      serviceId: service.id,
      userId: user.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationRecipientUnavailable');
});
test('duplicate invitations and answers are idempotent and never allocate capacity or money', async () => {
  const invitations = testingModule.get(SportsInvitationService),
    user = await invitationAthlete(),
    service = await create();
  await occurrence(service.id, 1);
  const [before] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_orders WHERE service_id=${service.id}`,
  );
  const input = {
    serviceId: service.id,
    userId: user.id,
    idempotencyKey: randomUUID(),
  };
  const [a, b] = await Promise.all([
    invitations.create(owner, input),
    invitations.create(owner, { ...input, idempotencyKey: randomUUID() }),
  ]);
  expect(a.id).toBe(b.id);
  expect(await invitations.create(owner, input)).toEqual(a);
  const id = String(a.id),
    answer = { accept: true, revision: 1, idempotencyKey: randomUUID() };
  const accepted = await invitations.answer(user.id, id, answer);
  expect(accepted).toMatchObject({ status: 'accepted', revision: 2 });
  expect(await invitations.answer(user.id, id, answer)).toEqual(accepted);
  await expect(invitations.answer(other, id, answer)).rejects.toThrow(
    'Backend.invitationUnavailable',
  );
  await expect(
    invitations.answer(user.id, id, { ...answer, accept: false }),
  ).rejects.toThrow('Backend.invitationKeyReused');
  await expect(
    invitations.answer(user.id, id, {
      ...answer,
      accept: false,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationChanged');
  await expect(
    invitations.cancel(owner, id, {
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationChanged');
  const [after] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_orders WHERE service_id=${service.id}`,
  );
  expect(after.count).toBe(before.count);
  const [claims] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE o.service_id=${service.id}`,
  );
  expect(claims.count).toBe(0);
  const audits = await rows<{ action: string }>(
    db,
    sql`SELECT action FROM audit_events WHERE target_id=${id}`,
  );
  expect(audits.map((a) => a.action).sort()).toEqual([
    'sports.invitation.answered',
    'sports.invitation.created',
  ]);
  const notices = await rows(
    db,
    sql`SELECT id FROM sport_notifications WHERE source_key=${`invite:${id}`}`,
  );
  expect(notices).toHaveLength(1);
});
test('cancellation and response race produces one revision and obsolete unread notices disappear', async () => {
  const invitations = testingModule.get(SportsInvitationService),
    user = await invitationAthlete(),
    service = await create();
  const invitation = await invitations.create(owner, {
      serviceId: service.id,
      userId: user.id,
      idempotencyKey: randomUUID(),
    }),
    id = String(invitation.id);
  const results = await Promise.allSettled([
    invitations.answer(user.id, id, {
      accept: true,
      revision: 1,
      idempotencyKey: randomUUID(),
    }),
    invitations.cancel(owner, id, {
      revision: 1,
      idempotencyKey: randomUUID(),
    }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const [state] = await rows<{ status: string; revision: number }>(
    db,
    sql`SELECT status,revision FROM sport_invitations WHERE id=${id}`,
  );
  expect(state.revision).toBe(2);
  expect(['accepted', 'cancelled']).toContain(state.status);
  if (state.status === 'cancelled')
    expect(
      await rows(
        db,
        sql`SELECT id FROM sport_notifications WHERE source_key=${`invite:${id}`}`,
      ),
    ).toHaveLength(0);
  const user2 = await invitationAthlete();
  const pending = await invitations.create(owner, {
      serviceId: service.id,
      userId: user2.id,
      idempotencyKey: randomUUID(),
    }),
    cancel = { revision: 1, idempotencyKey: randomUUID() };
  const cancelled = await invitations.cancel(owner, String(pending.id), cancel);
  expect(await invitations.cancel(owner, String(pending.id), cancel)).toEqual(
    cancelled,
  );
  await expect(
    invitations.answer(user2.id, String(pending.id), {
      accept: true,
      revision: 1,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationChanged');
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_notifications WHERE source_key=${`invite:${String(pending.id)}`}`,
    ),
  ).toHaveLength(0);
});
test('invitation preferences and unavailable services are enforced by the server', async () => {
  const invitations = testingModule.get(SportsInvitationService),
    user = await invitationAthlete(),
    service = await create();
  await testingModule.get(CommunityService).notificationPreferences(user.id, {
    reminders: true,
    messages: true,
    invitations: false,
  });
  const invitation = await invitations.create(owner, {
      serviceId: service.id,
      userId: user.id,
      idempotencyKey: randomUUID(),
    }),
    id = String(invitation.id);
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_notifications WHERE source_key=${`invite:${id}`}`,
    ),
  ).toHaveLength(0);
  await rows(
    db,
    sql`UPDATE sport_services SET status='archived' WHERE id=${service.id}`,
  );
  await expect(
    invitations.answer(user.id, id, {
      accept: true,
      revision: 1,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationServiceUnpublished');
  expect(
    (
      await invitations.answer(user.id, id, {
        accept: false,
        revision: 1,
        idempotencyKey: randomUUID(),
      })
    ).status,
  ).toBe('declined');
  await expect(
    invitations.create(owner, {
      serviceId: service.id,
      userId: user.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.invitationServiceUnpublished');
  expect(
    invitationCreateSchema.safeParse({ serviceId: service.id, userId: user.id })
      .success,
  ).toBe(false);
  expect(invitationAnswerSchema.safeParse({ accept: true }).success).toBe(
    false,
  );
});
test('invitation pages preserve microseconds and tied timestamps and reject another recipient cursor', async () => {
  const invitations = testingModule.get(SportsInvitationService),
    user = await invitationAthlete();
  const services = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_services(organization_id,branch_id,title,kind) SELECT ${org},${branch},'Historical invitation '||n,'class' FROM generate_series(1,31) n RETURNING id`,
  );
  await rows(
    db,
    sql`INSERT INTO sport_invitations(service_id,user_id,invited_by,created_at) SELECT id,${user.id},${owner},'2026-01-01T00:00:00Z'::timestamptz + ((row_number() OVER(ORDER BY id)+1)/2)*interval '1 microsecond' FROM sport_services WHERE id=ANY(${`{${services.map((s) => s.id).join(',')}}`}::uuid[])`,
  );
  const first = await invitations.list(user.id);
  expect(first.items).toHaveLength(25);
  expect(first.nextCursor).not.toBeNull();
  const second = await invitations.list(user.id, first.nextCursor!);
  expect(second.items).toHaveLength(6);
  expect(second.nextCursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map((i) => i.id)).size).toBe(
    31,
  );
  await expect(invitations.list(other, first.nextCursor!)).rejects.toThrow(
    'Backend.invalidInvitationCursor',
  );
});
test('revoking a branch grant also prevents invitation receipt replay', async () => {
  const invitations = testingModule.get(SportsInvitationService),
    user = await invitationAthlete(),
    service = await create();
  const [manager] = await db
    .insert(s.users)
    .values({ phone: `+989${randomInt(100000000, 999999999)}` })
    .returning();
  userIds.push(manager.id);
  const [member] = await db
    .insert(s.organizationMembers)
    .values({
      organizationId: org,
      userId: manager.id,
      role: 'manager',
      allBranches: false,
    })
    .returning();
  await rows(
    db,
    sql`INSERT INTO organization_member_branches(member_id,organization_id,branch_id) VALUES(${member.id},${org},${branch})`,
  );
  const input = {
    serviceId: service.id,
    userId: user.id,
    idempotencyKey: randomUUID(),
  };
  await invitations.create(manager.id, input);
  const [north] = await db
    .insert(s.branches)
    .values({
      organizationId: org,
      name: 'Other invitation branch',
      slug: `invite-${randomUUID()}`,
    })
    .returning();
  await db.insert(s.branchProfiles).values({ clubId: org, branchId: north.id });
  const northService = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: north.id,
      title: 'Other branch service',
      kind: 'class',
      amountMinor: '0',
      policy,
    }),
  );
  await expect(
    invitations.recipients(manager.id, northService.id, ''),
  ).rejects.toThrow();
  await rows(
    db,
    sql`DELETE FROM organization_member_branches WHERE member_id=${member.id}`,
  );
  await expect(invitations.create(manager.id, input)).rejects.toThrow();
  await expect(invitations.host(manager.id, service.id)).rejects.toThrow();
});
test('last session in a membership cannot be held twice', async () => {
  const service = await create();
  const plan = await create('membership', '0', [], 1, [service.id]);
  await commerce.checkout(athlete, {
    serviceId: plan.id,
    idempotencyKey: randomUUID(),
  });
  const [membership] = await commerce.memberships(athlete);
  const a = await occurrence(service.id, 3);
  const b = await occurrence(service.id, 3, Date.now() + 2 * 86400000);
  const results = await Promise.allSettled(
    [a, b].map((o) =>
      commerce.checkout(athlete, {
        serviceId: service.id,
        occurrenceId: o.id,
        membershipId: String(membership.id),
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
});
test('correcting attendance restores and then consumes one membership session', async () => {
  const service = await create();
  const plan = await create('membership', '0', [], 1, [service.id]);
  await commerce.checkout(athlete, {
    serviceId: plan.id,
    idempotencyKey: randomUUID(),
  });
  const [membership] = await commerce.memberships(athlete);
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    membershipId: String(membership.id),
    idempotencyKey: randomUUID(),
  });
  const [reservation] = (await commerce.myOrder(athlete, order.id))
    .reservations;
  const ops = testingModule.get(SportsOperationsService);
  const balance = async () =>
    (
      await rows<{ consumed: number }>(
        db,
        sql`SELECT consumed FROM sport_memberships WHERE id=${membership.id}`,
      )
    )[0].consumed;
  await ops.manualAttendance(owner, String(reservation.id), true, 'arrived');
  expect(await balance()).toBe(1);
  await ops.manualAttendance(owner, String(reservation.id), false, 'corrected');
  expect(await balance()).toBe(0);
  await ops.manualAttendance(
    owner,
    String(reservation.id),
    true,
    'corrected again',
  );
  expect(await balance()).toBe(1);
  await ops.manualAttendance(owner, String(reservation.id), true, 'retry');
  expect(await balance()).toBe(1);
  const events = await rows<{ kind: string }>(
    db,
    sql`SELECT kind FROM sport_entitlement_events WHERE reservation_id=${reservation.id} AND kind IN ('consume','restore') ORDER BY created_at`,
  );
  expect(events.map((event) => event.kind)).toEqual([
    'consume',
    'restore',
    'consume',
  ]);
});
test('shared resource units prevent overlapping court bookings', async () => {
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Court',
    [],
  );
  const service = await create('court', '0', [resource.id]);
  const a = await occurrence(service.id, 10);
  const b = await occurrence(
    service.id,
    10,
    new Date(a.start_at).getTime() + 1800000,
  );
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: a.id,
    idempotencyKey: randomUUID(),
  });
  await expect(
    commerce.checkout(other, {
      serviceId: service.id,
      occurrenceId: b.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
});
test('concurrent resource creation replays one audited resource and rejects changed input', async () => {
  expect(
    resourceCreateSchema.safeParse({
      organizationId: org,
      branchId: branch,
      name: 'Missing request key',
      unitIds: [],
    }).success,
  ).toBe(false);
  const key = randomUUID();
  const [a, b] = await Promise.all([
    commerce.createResource(owner, org, branch, 'Idempotent resource', [], key),
    commerce.createResource(owner, org, branch, 'Idempotent resource', [], key),
  ]);
  expect(a).toEqual(b);
  await expect(
    commerce.createResource(owner, org, branch, 'Changed resource', [], key),
  ).rejects.toThrow('Backend.scheduleKeyReused');
  const [counts] = await rows<{
    resources: number;
    units: number;
    audit: number;
  }>(
    db,
    sql`SELECT (SELECT count(*)::int FROM sport_resources WHERE id=${a.id}) resources,(SELECT count(*)::int FROM sport_resource_units WHERE resource_id=${a.id}) units,(SELECT count(*)::int FROM audit_events WHERE target_id=${a.id} AND action='sports.resource.create') audit`,
  );
  expect(counts).toEqual({ resources: 1, units: 1, audit: 1 });
});
test('resource buffers protect setup time, preserve boundary slots and reject unsafe settings changes', async () => {
  const resources = testingModule.get(SportsResourceService);
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Buffered room',
    [],
  );
  const input = resourceSettingsSchema.parse({
    name: 'Prepared room',
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 20,
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Room preparation',
  });
  await expect(resources.settings(other, resource.id, input)).rejects.toThrow();
  const updated = await resources.settings(owner, resource.id, input);
  expect(updated).toMatchObject({
    revision: 2,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 20,
  });
  expect(await resources.settings(owner, resource.id, input)).toEqual(updated);
  await expect(
    resources.settings(owner, resource.id, {
      ...input,
      name: 'Changed replay',
    }),
  ).rejects.toThrow('Backend.scheduleKeyReused');
  await expect(
    resources.settings(owner, resource.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.resourceChanged');
  expect(
    resourceSettingsSchema.safeParse({ ...input, bufferBeforeMinutes: -1 })
      .success,
  ).toBe(false);
  expect(
    resourceSettingsSchema.safeParse({ ...input, bufferAfterMinutes: 241 })
      .success,
  ).toBe(false);
  await expect(
    rows(
      db,
      sql`UPDATE sport_resources SET buffer_before_minutes=-1 WHERE id=${resource.id}`,
    ),
  ).rejects.toThrow();
  const service = await create('class', '0', [resource.id]);
  const start = Date.now() + 2 * 86400000;
  const first = await occurrence(service.id, 1, start);
  await expect(occurrence(service.id, 1, start + 89 * 60000)).rejects.toThrow(
    'Backend.resourceConflict',
  );
  await occurrence(service.id, 1, start + 90 * 60000);
  const claims = await rows<{ start: Date; end: Date }>(
    db,
    sql`SELECT lower(period) start,upper(period) "end" FROM sport_occupancies WHERE occurrence_id=${first.id}`,
  );
  expect(new Date(claims[0].start).getTime()).toBe(start - 10 * 60000);
  expect(new Date(claims[0].end).getTime()).toBe(start + 80 * 60000);
  await expect(
    resources.settings(owner, resource.id, {
      ...input,
      revision: 2,
      bufferAfterMinutes: 21,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.resourceBufferLocked');
  expect(
    (await commerce.resources(owner, org, branch)).find(
      (r) => r.id === resource.id,
    )?.buffer_after_minutes,
  ).toBe(20);
  expect(
    (
      await rows<{ count: number }>(
        db,
        sql`SELECT count(*)::int count FROM sport_occurrences WHERE service_id=${service.id}`,
      )
    )[0].count,
  ).toBe(2);
});
test('maintenance blocks shared units, changes public availability, and releases idempotently with audit', async () => {
  const resources = testingModule.get(SportsResourceService);
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Shared court',
    [],
  );
  const [unit] = await rows<{ unit_id: string }>(
    db,
    sql`SELECT unit_id FROM sport_resource_units WHERE resource_id=${resource.id}`,
  );
  const sibling = await commerce.createResource(
    owner,
    org,
    branch,
    'Shared room',
    [unit.unit_id],
  );
  const service = await create('court', '0', [sibling.id]);
  const slot = await occurrence(service.id, 1, Date.now() + 3 * 86400000);
  const start = new Date(slot.start_at).getTime();
  const input = resourceBlockSchema.parse({
    kind: 'maintenance',
    startAt: new Date(start + 20 * 60000).toISOString(),
    endAt: new Date(start + 40 * 60000).toISOString(),
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Test floor maintenance',
  });
  await expect(
    resources.createBlock(other, resource.id, input),
  ).rejects.toThrow();
  const block = await resources.createBlock(owner, resource.id, input);
  await expect(
    rows(
      db,
      sql`INSERT INTO sport_occupancies(unit_id,occurrence_id,block_id,period,active) VALUES(${unit.unit_id},${slot.id},${String(block.id)},tstzrange(${input.startAt},${input.endAt},'[)'),false)`,
    ),
  ).rejects.toThrow();
  expect(await resources.createBlock(owner, resource.id, input)).toEqual(block);
  expect(
    (await commerce.detail(service.id)).occurrences[0].resource_available,
  ).toBe(false);
  expect(
    (await commerce.catalog()).find((item) => item.id === service.id)
      ?.next_start_at,
  ).toBeNull();
  await expect(
    commerce.quote(athlete, { serviceId: service.id, occurrenceId: slot.id }),
  ).rejects.toThrow('Backend.resourceUnavailable');
  await expect(
    commerce.checkout(athlete, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.resourceUnavailable');
  await expect(occurrence(service.id, 1, start + 60000)).rejects.toThrow(
    'Backend.resourceUnavailable',
  );
  const range = resourceCalendarSchema.parse({
    from: new Date(start - 3600000).toISOString(),
    to: new Date(start + 7200000).toISOString(),
  });
  const calendar = await resources.calendar(owner, sibling.id, range);
  expect(calendar).toHaveLength(1);
  expect(calendar[0]).toMatchObject({
    id: block.id,
    kind: 'maintenance',
    title: input.reason,
  });
  await expect(resources.calendar(other, resource.id, range)).rejects.toThrow();
  const cancellation = {
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Maintenance completed',
  };
  await expect(
    resources.cancelBlock(owner, sibling.id, String(block.id), cancellation),
  ).rejects.toThrow('Backend.resourceChanged');
  const cancelled = await resources.cancelBlock(
    owner,
    resource.id,
    String(block.id),
    cancellation,
  );
  expect(cancelled).toMatchObject({ active: false, revision: 2 });
  expect(
    await resources.cancelBlock(
      owner,
      resource.id,
      String(block.id),
      cancellation,
    ),
  ).toEqual(cancelled);
  expect(await resources.calendar(owner, sibling.id, range)).toHaveLength(0);
  expect(
    (await commerce.detail(service.id)).occurrences[0].resource_available,
  ).toBe(true);
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const audit = await rows<{ action: string }>(
    db,
    sql`SELECT action FROM audit_events WHERE target_id=${String(block.id)} ORDER BY created_at`,
  );
  expect(audit.map((r) => r.action)).toEqual([
    'sports.resource.block',
    'sports.resource.unblock',
  ]);
});
test('resource permissions are branch scoped and revocation also prevents receipt replay', async () => {
  const resources = testingModule.get(SportsResourceService);
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Scoped resource',
    [],
  );
  const [manager] = await db
    .insert(s.organizationMembers)
    .values({
      organizationId: org,
      userId: other,
      role: 'manager',
      allBranches: false,
    })
    .returning();
  const range = {
    from: new Date().toISOString(),
    to: new Date(Date.now() + 86400000).toISOString(),
  };
  const input = resourceSettingsSchema.parse({
    name: 'Scoped update',
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Branch-scoped change',
  });
  try {
    await expect(resources.calendar(other, resource.id, range)).rejects.toThrow(
      'Backend.branchAccessDenied',
    );
    await expect(resources.settings(other, resource.id, input)).rejects.toThrow(
      'Backend.branchAccessDenied',
    );
    await db
      .insert(s.organizationMemberBranches)
      .values({ organizationId: org, memberId: manager.id, branchId: branch });
    expect(await resources.settings(other, resource.id, input)).toMatchObject({
      name: input.name,
      revision: 2,
    });
    await db.execute(
      sql`DELETE FROM organization_member_branches WHERE member_id=${manager.id}`,
    );
    await expect(resources.settings(other, resource.id, input)).rejects.toThrow(
      'Backend.branchAccessDenied',
    );
  } finally {
    await db.execute(
      sql`DELETE FROM organization_member_branches WHERE member_id=${manager.id}`,
    );
    await db.execute(
      sql`DELETE FROM organization_members WHERE id=${manager.id}`,
    );
  }
});
test('a racing closure and court checkout cannot both acquire the shared resource', async () => {
  const resources = testingModule.get(SportsResourceService);
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Racing court',
    [],
  );
  const service = await create('court', '0', [resource.id]);
  const slot = await occurrence(service.id);
  const outcomes = await Promise.allSettled([
    resources.createBlock(owner, resource.id, {
      kind: 'closure',
      startAt: slot.start_at.toISOString(),
      endAt: slot.end_at.toISOString(),
      revision: 1,
      idempotencyKey: randomUUID(),
      reason: 'Closure race test',
    }),
    commerce.checkout(athlete, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    }),
  ]);
  expect(outcomes.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const claims = await rows(
    db,
    sql`SELECT c.id FROM sport_occupancies c JOIN sport_resource_units ru ON ru.unit_id=c.unit_id WHERE ru.resource_id=${resource.id} AND c.active`,
  );
  expect(claims).toHaveLength(1);
  const [counts] = await rows<{ orders: number; blocks: number }>(
    db,
    sql`SELECT (SELECT count(*)::int FROM sport_orders WHERE service_id=${service.id}) orders,(SELECT count(*)::int FROM sport_resource_blocks WHERE resource_id=${resource.id}) blocks`,
  );
  expect(counts.orders + counts.blocks).toBe(1);
});
test('closure conflicts roll back every series session and a failed reschedule preserves the original claim', async () => {
  const resources = testingModule.get(SportsResourceService);
  const resource = await commerce.createResource(
    owner,
    org,
    branch,
    'Blocked series resource',
    [],
  );
  const start = Date.now() + 4 * 86400000;
  const block = await resources.createBlock(owner, resource.id, {
    kind: 'closure',
    startAt: new Date(start + 86400000).toISOString(),
    endAt: new Date(start + 86400000 + 3600000).toISOString(),
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Scheduled closure',
  });
  const series = await create('class', '0', [resource.id]);
  await expect(
    commerce.scheduleSeries(owner, series.id, {
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 3600000).toISOString(),
      capacity: 1,
      count: 3,
      intervalDays: 1,
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.scheduleConflict');
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_occurrences WHERE service_id=${series.id}`,
    ),
  ).toHaveLength(0);
  const court = await create('court', '0', [resource.id]);
  const original = await occurrence(court.id, 1, start);
  await resources.cancelBlock(owner, resource.id, String(block.id), {
    revision: 1,
    idempotencyKey: randomUUID(),
    reason: 'Prepare target slot',
  });
  const target = await occurrence(court.id, 1, start + 86400000);
  const order = await commerce.checkout(athlete, {
    serviceId: court.id,
    occurrenceId: original.id,
    idempotencyKey: randomUUID(),
  });
  await resources.createBlock(owner, resource.id, {
    kind: 'closure',
    startAt: target.start_at.toISOString(),
    endAt: target.end_at.toISOString(),
    revision: 3,
    idempotencyKey: randomUUID(),
    reason: 'Close the target',
  });
  const reservation = order.reservations[0];
  await expect(
    commerce.reschedule(
      athlete,
      String(reservation.id),
      Number(reservation.revision),
      target.id,
      randomUUID(),
    ),
  ).rejects.toThrow('Backend.resourceConflict');
  expect(await commerce.booking(athlete, String(reservation.id))).toMatchObject(
    { occurrence_id: original.id, status: 'confirmed' },
  );
  const claims = await rows(
    db,
    sql`SELECT id FROM sport_occupancies WHERE reservation_id=${String(reservation.id)} AND active`,
  );
  expect(claims).toHaveLength(1);
});
test('failed reschedule preserves the original reservation', async () => {
  const service = await create();
  const a = await occurrence(service.id);
  const b = await occurrence(service.id, 1, Date.now() + 3 * 86400000);
  const first = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: a.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.checkout(other, {
    serviceId: service.id,
    occurrenceId: b.id,
    idempotencyKey: randomUUID(),
  });
  const r = first.reservations[0];
  await expect(
    commerce.reschedule(athlete, String(r.id), Number(r.revision), b.id),
  ).rejects.toThrow();
  expect((await commerce.booking(athlete, String(r.id)))?.occurrence_id).toBe(
    a.id,
  );
});
test('cancelled registrations lose conversation access and foreign users cannot read orders', async () => {
  const service = await create();
  const o = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  const c = await community.start(owner, o.id);
  await community.send(athlete, String(c.id), 'Hello', randomUUID());
  await expect(community.messages(other, String(c.id))).rejects.toThrow();
  await expect(commerce.myOrder(other, order.id)).rejects.toThrow();
  const r = order.reservations[0];
  await commerce.cancel(athlete, String(r.id), Number(r.revision));
  await expect(community.messages(athlete, String(c.id))).rejects.toThrow();
});
test('chat archive does not acknowledge unseen messages and read cursors advance monotonically', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const chat = await community.start(owner, slot.id);
  const first = await community.send(
    owner,
    String(chat.id),
    'First',
    randomUUID(),
  );
  const second = await community.send(
    owner,
    String(chat.id),
    'Second',
    randomUUID(),
  );
  await community.preferences(athlete, String(chat.id), { archived: true });
  expect(
    (await community.conversations(athlete, true)).find((c) => c.id === chat.id)
      ?.unread,
  ).toBe(2);
  await community.preferences(athlete, String(chat.id), {
    readMessageId: String(first.id),
  });
  expect(
    (await community.conversations(athlete, true)).find((c) => c.id === chat.id)
      ?.unread,
  ).toBe(1);
  await Promise.all([
    community.preferences(athlete, String(chat.id), {
      readMessageId: String(second.id),
    }),
    community.preferences(athlete, String(chat.id), {
      readMessageId: String(first.id),
    }),
  ]);
  expect(
    (await community.conversations(athlete, true)).find((c) => c.id === chat.id)
      ?.unread,
  ).toBe(0);
  const messages = await community.messages(owner, String(chat.id));
  expect(messages.messages.map((m) => m.read_by_count)).toEqual([1, 1]);
  await community.send(
    owner,
    String(chat.id),
    'Not yet rendered',
    randomUUID(),
  );
  await community.preferences(athlete, String(chat.id), { archived: false });
  expect(
    (await community.conversations(athlete)).find((c) => c.id === chat.id)
      ?.unread,
  ).toBe(1);
});
test('chat read markers cannot cross conversations and cancellation cannot rewrite historical read receipts', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const chat = await community.start(owner, slot.id);
  const foreignSlot = await occurrence(
    service.id,
    1,
    Date.now() + 4 * 86400000,
  );
  const foreignChat = await community.start(owner, foreignSlot.id);
  const foreignMessage = await community.send(
    owner,
    String(foreignChat.id),
    'Different session',
    randomUUID(),
  );
  await expect(
    community.preferences(athlete, String(chat.id), {
      readMessageId: String(foreignMessage.id),
    }),
  ).rejects.toThrow('Message unavailable');
  await expect(
    community.messages(athlete, String(chat.id), String(foreignMessage.id)),
  ).rejects.toThrow('Message cursor unavailable');
  const message = await community.send(
    owner,
    String(chat.id),
    'Visible',
    randomUUID(),
  );
  await community.preferences(athlete, String(chat.id), {
    readMessageId: String(message.id),
  });
  const booking = order.reservations[0];
  await commerce.cancel(athlete, String(booking.id), Number(booking.revision));
  await expect(
    community.preferences(athlete, String(chat.id), {
      readMessageId: String(message.id),
    }),
  ).rejects.toThrow('Conversation unavailable');
  expect(
    (await community.messages(owner, String(chat.id))).messages[0]
      .read_by_count,
  ).toBe(1);
});
test('unpublished participant visibility never exposes a class roster', async () => {
  const service = await create();
  const slot = await occurrence(service.id, 2);
  for (const userId of [athlete, other])
    await commerce.checkout(userId, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    });
  const chat = await community.start(owner, slot.id);
  await rows(
    db,
    sql`UPDATE users SET profile_public=true WHERE id IN(${athlete},${other})`,
  );
  await rows(
    db,
    sql`UPDATE sport_service_versions SET show_participants=false WHERE service_id=${service.id}`,
  );
  const draft = await testingModule.get(SportsOperationsService).updateService(
    owner,
    service.id,
    2,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Visible only after publication',
      kind: 'class',
      amountMinor: '0',
      policy,
      showParticipants: true,
    }),
  );
  expect(
    (await community.messages(athlete, String(chat.id))).conversation.members,
  ).toHaveLength(0);
  expect(
    (await community.messages(owner, String(chat.id))).conversation.members,
  ).toHaveLength(2);
  await commerce.publish(owner, service.id, Number(draft.revision));
  expect(
    (await community.messages(athlete, String(chat.id))).conversation.members,
  ).toHaveLength(2);
  await rows(
    db,
    sql`UPDATE users SET profile_public=false WHERE id IN(${athlete},${other})`,
  );
});
test('chat image sends are retry-safe, decoded and stored privately, and invalid bytes create no message', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  const chat = await community.start(owner, slot.id);
  await expect(
    community.send(
      owner,
      String(chat.id),
      '',
      randomUUID(),
      Buffer.from('not an image'),
    ),
  ).rejects.toThrow('Backend.invalidInput');
  const input = await sharp({
    create: { width: 16, height: 16, channels: 3, background: '#65dd58' },
  })
    .png()
    .toBuffer();
  const key = randomUUID();
  const first = await community.send(owner, String(chat.id), '', key, input);
  const again = await community.send(owner, String(chat.id), '', key, input);
  expect(again.id).toBe(first.id);
  const page = await community.messages(owner, String(chat.id));
  expect(page.messages).toHaveLength(1);
  const image = await fetch(page.messages[0].image_url!);
  expect(image.ok).toBe(true);
  const metadata = await sharp(
    Buffer.from(await image.arrayBuffer()),
  ).metadata();
  expect(metadata.format).toBe('webp');
  expect(metadata.exif).toBeUndefined();
  await expect(
    community.send(owner, String(chat.id), 'Changed', key, input),
  ).rejects.toThrow('Message key reused');
});
test('message paging retains timestamp ties and microseconds without an empty terminal page', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  const chat = await community.start(owner, slot.id);
  await rows(
    db,
    sql`INSERT INTO sport_messages(conversation_id,sender_id,body,idempotency_key,created_at) SELECT ${String(chat.id)},${owner},'History '||n,gen_random_uuid()::text,'2026-01-01'::timestamptz + ((n/3)::text||' microseconds')::interval FROM generate_series(1,100) n`,
  );
  const first = await community.messages(owner, String(chat.id));
  const second = await community.messages(
    owner,
    String(chat.id),
    first.messages[0].id,
  );
  expect(first.hasMore).toBe(true);
  expect(second.hasMore).toBe(false);
  expect(first.messages).toHaveLength(50);
  expect(second.messages).toHaveLength(50);
  expect(
    new Set([...first.messages, ...second.messages].map((m) => m.id)).size,
  ).toBe(100);
});
test('a valid second-organization owner cannot access the first organization financial data, documents, or chat', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const chat = await community.start(owner, slot.id);
  const [document] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_documents(user_id,service_id,name,object_key) VALUES(${athlete},${service.id},'test','sports/documents/test-only.pdf') RETURNING id`,
  );
  const documents = testingModule.get(SportsDocumentService);
  const ops = testingModule.get(SportsOperationsService);
  await expect(commerce.report(other, org, branch)).rejects.toThrow();
  await expect(documents.preview(other, document.id)).rejects.toThrow();
  expect(
    (await documents.list(other)).some((item) => item.id === document.id),
  ).toBe(false);
  await expect(community.messages(other, String(chat.id))).rejects.toThrow();
  await expect(
    ops.reviewDocument(other, document.id, 1, true, 'Wrong organization'),
  ).rejects.toThrow();
  await ops.reviewDocument(owner, document.id, 1, true, 'Valid document');
  await expect(
    ops.reviewDocument(owner, document.id, 1, false, 'Stale decision'),
  ).rejects.toThrow('Document changed');
  const reviewed = await rows<{ status: string; revision: number }>(
    db,
    sql`SELECT status,revision FROM sport_documents WHERE id=${document.id}`,
  );
  expect(reviewed[0]).toEqual({ status: 'approved', revision: 2 });
  const reviewAudit = await rows(
    db,
    sql`SELECT id FROM audit_events WHERE organization_id=${org} AND action='sports.document.reviewed' AND target_id=${document.id}`,
  );
  expect(reviewAudit).toHaveLength(1);
  const [expired] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_documents(user_id,service_id,name,object_key,expires_at) VALUES(${athlete},${service.id},'expired','sports/documents/expired-test.pdf',now()-interval '1 day') RETURNING id`,
  );
  await expect(
    ops.reviewDocument(owner, expired.id, 1, true, 'Expired document'),
  ).rejects.toThrow('Document expired');
  const ownReport = await commerce.report(other, secondOrg, secondBranch);
  expect(ownReport).toHaveProperty('sales_minor', '0');
});
test('admin can remove a reported message with revision control and an audit trail', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const chat = await community.start(owner, slot.id);
  const message = await community.send(
    athlete,
    String(chat.id),
    'Report me',
    randomUUID(),
  );
  await community.reportMessage(
    owner,
    String(chat.id),
    String(message.id),
    'Unsafe content',
  );
  await db.execute(sql`INSERT INTO platform_admins(user_id) VALUES(${owner})`);
  const ops = testingModule.get(SportsOperationsService);
  const principal = {
    user: { id: owner },
    session: { client: 'admin' },
  } as Principal;
  const wrongClient = {
    user: { id: owner },
    session: { client: 'application' },
  } as Principal;
  const overview = await ops.adminOverview(principal);
  const report = overview.reports.find(
    (item) => item.message_id === message.id,
  );
  expect(report).toBeDefined();
  await expect(
    ops.decideMessageReport(
      wrongClient,
      String(report?.id),
      1,
      true,
      'Removed',
    ),
  ).rejects.toThrow();
  await ops.decideMessageReport(
    principal,
    String(report?.id),
    1,
    true,
    'Removed',
  );
  await expect(
    ops.decideMessageReport(principal, String(report?.id), 1, true, 'Retry'),
  ).rejects.toThrow('Report changed');
  const visible = await community.messages(athlete, String(chat.id));
  expect(visible.messages).toHaveLength(0);
  const audit = await rows(
    db,
    sql`SELECT id FROM audit_events WHERE organization_id=${org} AND action='sports.message.removed' AND target_id=${message.id}`,
  );
  expect(audit).toHaveLength(1);
});
test('QR replay records one entry without completing class attendance', async () => {
  const service = await create();
  const o = await occurrence(service.id, 1, Date.now() + 30 * 60 * 1000);
  const order = await commerce.checkout(other, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  const r = order.reservations[0];
  const token = await commerce.ticket(other, String(r.id));
  const a = await commerce.checkIn(owner, token.token, 'Test check in');
  const b = await commerce.checkIn(owner, token.token, 'Retry check in');
  expect(a.id).toBe(b.id);
  await expect(
    commerce.exitVisit(other, String(a.id), 'Leaving'),
  ).rejects.toThrow();
  const exited = await commerce.exitVisit(owner, String(a.id), 'Leaving');
  const replayedExit = await commerce.exitVisit(
    owner,
    String(a.id),
    'Retry exit',
  );
  expect(exited.exited_at).toBeTruthy();
  expect(replayedExit.exited_at).toEqual(exited.exited_at);
  expect((await commerce.booking(other, String(r.id)))?.status).toBe(
    'confirmed',
  );
});
test('direct membership QR consumes once and dated analytics counts the replayed visit once', async () => {
  const service = await create('membership', '0', [], 2);
  const order = await commerce.checkout(other, {
    serviceId: service.id,
    idempotencyKey: randomUUID(),
  });
  const membership = (await commerce.memberships(other)).find(
    (m) => m.order_id === order.id,
  )!;
  const ticket = await commerce.ticket(other, String(membership.id), true);
  const visit = await commerce.checkIn(owner, ticket.token, 'Member entry');
  expect(
    (await commerce.checkIn(owner, ticket.token, 'Repeated scan')).id,
  ).toBe(visit.id);
  expect(
    (await commerce.memberships(other)).find((m) => m.id === membership.id)
      ?.consumed,
  ).toBe(1);
  expect(
    (
      await rows<{ count: number }>(
        db,
        sql`SELECT count(*)::int count FROM sport_entitlement_events WHERE membership_id=${membership.id} AND kind='consume'`,
      )
    )[0].count,
  ).toBe(1);
  await rows(
    db,
    sql`UPDATE sport_visits SET created_at='2026-05-01T20:29:59Z' WHERE id=${visit.id}`,
  );
  const analytics = testingModule.get(AnalyticsService);
  const business = {
    user: { id: owner },
    session: { client: 'business' },
  } as Principal;
  const filters = analyticsFilters.parse({
    from: '2026-05-01',
    to: '2026-05-01',
    serviceId: service.id,
    kind: 'membership',
  });
  expect(
    (await analytics.report(business, 'business', filters)).data.find(
      (row) => row.metric === 'attendance',
    )?.value,
  ).toBe('1');
  expect(
    (
      await analytics.report(business, 'business', {
        ...filters,
        from: '2026-05-02',
        to: '2026-05-02',
      })
    ).data.some((row) => row.metric === 'attendance'),
  ).toBe(false);
});
test('two direct membership tokens cannot consume the final session twice and an exhausted membership cannot mint a ticket', async () => {
  await db.execute(
    sql`UPDATE sport_visits SET exited_at=now() WHERE user_id=${other} AND exited_at IS NULL`,
  );
  const service = await create('membership', '0', [], 1);
  const order = await commerce.checkout(other, {
    serviceId: service.id,
    idempotencyKey: randomUUID(),
  });
  const membership = (await commerce.memberships(other)).find(
    (m) => m.order_id === order.id,
  )!;
  const tickets = await Promise.all(
    [1, 2].map(() => commerce.ticket(other, String(membership.id), true)),
  );
  const results = await Promise.allSettled(
    tickets.map((t) => commerce.checkIn(owner, t.token, 'Member entry')),
  );
  const succeeded = results.filter((r) => r.status === 'fulfilled');
  expect(succeeded).toHaveLength(2);
  if (
    succeeded[0].status === 'fulfilled' &&
    succeeded[1].status === 'fulfilled'
  )
    expect(succeeded[0].value.id).toBe(succeeded[1].value.id);
  expect(
    (await commerce.memberships(other)).find((m) => m.id === membership.id)
      ?.consumed,
  ).toBe(1);
  await expect(
    commerce.ticket(other, String(membership.id), true),
  ).rejects.toThrow('Backend.membershipExhausted');
});
test('a direct membership token cannot spend a session reserved for a booking', async () => {
  await db.execute(
    sql`UPDATE sport_visits SET exited_at=now() WHERE user_id=${other} AND exited_at IS NULL`,
  );
  const group = await create();
  const service = await create('membership', '0', [], 1, [group.id]);
  const order = await commerce.checkout(other, {
    serviceId: service.id,
    idempotencyKey: randomUUID(),
  });
  const membership = (await commerce.memberships(other)).find(
    (m) => m.order_id === order.id,
  )!;
  const ticket = await commerce.ticket(other, String(membership.id), true);
  const slot = await occurrence(group.id, 4);
  await commerce.checkout(other, {
    serviceId: group.id,
    occurrenceId: slot.id,
    membershipId: String(membership.id),
    idempotencyKey: randomUUID(),
  });
  await expect(
    commerce.checkIn(owner, ticket.token, 'Walk-in entry'),
  ).rejects.toThrow('Backend.membershipExhausted');
  expect(
    (await commerce.memberships(other)).find((m) => m.id === membership.id)
      ?.consumed,
  ).toBe(0);
});
test('future booking cannot mint an entry token before its entry window', async () => {
  const service = await create();
  const o = await occurrence(service.id);
  const order = await commerce.checkout(other, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  await expect(
    commerce.ticket(other, String(order.reservations[0].id)),
  ).rejects.toThrow('Ticket is available near the session');
});
test('worker records a missed paid session once', async () => {
  const service = await create();
  const o = await occurrence(service.id);
  const order = await commerce.checkout(other, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  await rows(
    db,
    sql`UPDATE sport_occurrences SET start_at=now()-interval '2 hours',end_at=now()-interval '1 hour' WHERE id=${o.id}`,
  );
  await commerce.runJobs();
  await commerce.runJobs();
  const booking = await commerce.booking(
    other,
    String(order.reservations[0].id),
  );
  expect(booking?.status).toBe('no_show');
  const attendance = await rows<{ status: string }>(
    db,
    sql`SELECT status FROM sport_attendance WHERE reservation_id=${order.reservations[0].id}`,
  );
  expect(attendance).toHaveLength(1);
  expect(attendance[0].status).toBe('absent');
});
test('unknown and late payment does not silently create confirmed capacity', async () => {
  const service = await create('class', '10000');
  const o = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(athlete, order.id, 'late', randomUUID());
  const pending = await commerce.verifyPayment(athlete, order.id);
  expect(pending.payments[0].state).toBe('unknown');
  expect(pending.payments[0].provider).toBe('saman_mock');
  await db.execute(
    sql`UPDATE sport_orders SET expires_at=now()-interval '1 minute' WHERE id=${order.id}`,
  );
  const paid = await commerce.verifyPayment(athlete, order.id, true);
  expect(paid.status).toBe('review');
  expect(paid.reservations[0].status).not.toBe('confirmed');
});
test('failed mock payment allows a fresh attempt without changing the order', async () => {
  const service = await create('class', '10000');
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const failedKey = randomUUID();
  const firstAttempt = await commerce.startPayment(
    athlete,
    order.id,
    'failure',
    failedKey,
  );
  const failed = await commerce.verifyPayment(athlete, order.id);
  expect(failed.status).toBe('awaiting_payment');
  expect(failed.payments[0].state).toBe('failed');
  const replay = await commerce.startPayment(
    athlete,
    order.id,
    'failure',
    failedKey,
  );
  expect(replay.id).toBe(firstAttempt.id);
  await expect(
    commerce.startPayment(athlete, order.id, 'success', failedKey),
  ).rejects.toThrow('Idempotency key reused');
  await commerce.startPayment(athlete, order.id, 'success', randomUUID());
  const paid = await commerce.verifyPayment(athlete, order.id);
  expect(paid.status).toBe('paid');
  expect(paid.payments.map((payment) => payment.state)).toEqual([
    'failed',
    'verified',
  ]);
});

test('quote is server priced and rejects a different session before creating an order', async () => {
  const service = await create('class', '2200000');
  const a = await occurrence(service.id);
  const b = await occurrence(service.id, 1, Date.now() + 172800000);
  const quote = await commerce.quote(athlete, {
    serviceId: service.id,
    occurrenceId: a.id,
  });
  expect(quote.amountMinor).toBe('2200000');
  await expect(
    commerce.checkout(athlete, {
      serviceId: service.id,
      occurrenceId: b.id,
      quoteId: quote.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: a.id,
    quoteId: quote.id,
    idempotencyKey: randomUUID(),
  });
  expect(order.amount_minor).toBe('2200000');
});
test('deposit remains payable and cancellation refunds only collected money', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Deposit test',
      kind: 'class',
      amountMinor: '2000000',
      policy: { ...policy, depositBasisPoints: 2500 },
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const o = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(athlete, order.id, 'success', randomUUID());
  const paid = await commerce.verifyPayment(athlete, order.id);
  expect(paid.status).toBe('partially_paid');
  expect(paid.balanceDueMinor).toBe('1500000');
  await expect(
    commerce.ticket(athlete, String(paid.reservations[0].id)),
  ).rejects.toThrow();
  const preview = await commerce.cancelPreview(
    athlete,
    String(paid.reservations[0].id),
  );
  expect(preview.refundMinor).toBe('500000');
  await expect(
    commerce.cancel(
      athlete,
      String(paid.reservations[0].id),
      preview.revision,
      '2000000',
    ),
  ).rejects.toThrow();
  await commerce.cancel(
    athlete,
    String(paid.reservations[0].id),
    preview.revision,
    preview.refundMinor,
  );
  // Refunds are durable asynchronous work. Exercise an older event backlog,
  // then allow bounded worker ticks rather than assuming one batch drains it.
  await rows(
    db,
    sql`INSERT INTO sport_outbox(kind,aggregate_id,payload,source_key,due_at) SELECT 'reservation.changed',${String(paid.reservations[0].id)},'{}'::jsonb,gen_random_uuid()::text,now()-interval '1 minute' FROM generate_series(1,40)`,
  );
  let refunded = await commerce.myOrder(athlete, order.id);
  for (let tick = 0; tick < 10 && refunded.status !== 'refunded'; tick++) {
    await commerce.runJobs();
    refunded = await commerce.myOrder(athlete, order.id);
  }
  expect(refunded.status).toBe('refunded');
  expect(refunded.refunded_minor).toBe('500000');
});
test('balance payment and repeated cash capture grant one membership', async () => {
  const service = await create('membership', '5000000', [], 8);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.captureCash(owner, order.id, 'Isolated test payment');
  await commerce.captureCash(owner, order.id, 'Duplicate test request');
  const granted = await rows(
    db,
    sql`SELECT id FROM sport_memberships WHERE order_id=${order.id}`,
  );
  expect(granted).toHaveLength(1);
});
test('waitlist offers the next seat without charging and acceptance is repeatable', async () => {
  const service = await create();
  const o = await occurrence(service.id);
  const held = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: o.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.waitlist(other, o.id);
  await commerce.runJobs();
  expect((await commerce.waitlist(other))[0].status).toBe('waiting');
  await commerce.cancel(
    athlete,
    String(held.reservations[0].id),
    Number(held.reservations[0].revision),
  );
  await commerce.runJobs();
  const offer = (await commerce.waitlist(other))[0];
  expect(offer.status).toBe('offered');
  const accepted = await commerce.acceptOffer(other, String(offer.id));
  expect(accepted.status).toBe('paid');
  expect(accepted.payments).toHaveLength(0);
  expect((await commerce.acceptOffer(other, String(offer.id))).id).toBe(
    accepted.id,
  );
});
test('course seats allocate atomically when one session is already full', async () => {
  const service = await create('course');
  const a = await occurrence(service.id);
  const b = await occurrence(service.id, 1, Date.now() + 172800000);
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: a.id,
    idempotencyKey: randomUUID(),
  });
  await expect(
    commerce.checkout(other, {
      serviceId: service.id,
      occurrenceId: b.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
  const reservations = await rows(
    db,
    sql`SELECT id FROM sport_reservations WHERE user_id=${other} AND occurrence_id IN(${a.id},${b.id})`,
  );
  expect(reservations).toHaveLength(0);
});
test('course schedule cannot grow after the first order is created', async () => {
  const service = await create('course');
  const first = await occurrence(service.id, 5, Date.now() + 20 * 86400000);
  await occurrence(service.id, 5, Date.now() + 21 * 86400000);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: first.id,
    idempotencyKey: randomUUID(),
  });
  expect(order.reservations).toHaveLength(2);
  const later = Date.now() + 28 * 86400000;
  await expect(
    commerce.scheduleSeries(owner, service.id, {
      startAt: new Date(later).toISOString(),
      endAt: new Date(later + 3600000).toISOString(),
      capacity: 5,
      count: 2,
      intervalDays: 7,
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.courseScheduleLocked');
  await expect(occurrence(service.id, 5, later)).rejects.toThrow(
    'Backend.courseScheduleLocked',
  );
  const [sessions] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_occurrences WHERE service_id=${service.id}`,
  );
  expect(sessions.count).toBe(2);
});
test('concurrent course purchase covers every session or rejects the schedule change', async () => {
  const service = await create('course');
  const first = await occurrence(service.id, 5, Date.now() + 30 * 86400000);
  const later = Date.now() + 37 * 86400000;
  const [schedule, purchase] = await Promise.allSettled([
    commerce.scheduleSeries(owner, service.id, {
      startAt: new Date(later).toISOString(),
      endAt: new Date(later + 3600000).toISOString(),
      capacity: 5,
      count: 2,
      intervalDays: 7,
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
    commerce.checkout(athlete, {
      serviceId: service.id,
      occurrenceId: first.id,
      idempotencyKey: randomUUID(),
    }),
  ]);
  expect(purchase.status).toBe('fulfilled');
  if (purchase.status !== 'fulfilled') throw purchase.reason;
  const order = await commerce.myOrder(athlete, purchase.value.id);
  const [sessions] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_occurrences WHERE service_id=${service.id}`,
  );
  expect(order.reservations).toHaveLength(sessions.count);
  if (schedule.status === 'rejected') expect(sessions.count).toBe(1);
});

test('host course rejection refunds once and releases every course session', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Course approval',
      kind: 'course',
      amountMinor: '3000000',
      approvalRequired: true,
      policy,
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const a = await occurrence(service.id);
  await occurrence(service.id, 1, Date.now() + 172800000);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: a.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(athlete, order.id, 'success', randomUUID());
  const paid = await commerce.verifyPayment(athlete, order.id);
  const ops = testingModule.get(SportsOperationsService);
  for (const r of paid.reservations)
    await ops.approve(
      owner,
      String(r.id),
      Number(r.revision),
      false,
      'Isolated rejection test',
    );
  const refunds = await rows<{ amount_minor: string }>(
    db,
    sql`SELECT amount_minor::text FROM sport_refunds WHERE order_id=${order.id}`,
  );
  expect(refunds).toHaveLength(1);
  expect(refunds[0].amount_minor).toBe('3000000');
  expect(
    (await commerce.myOrder(athlete, order.id)).reservations.every(
      (r) => r.status === 'cancelled',
    ),
  ).toBe(true);
});

test('old booking details are independent of the recent list and remain account scoped', async () => {
  const [historyUser] = await db
    .insert(s.users)
    .values({
      phone: `+989${randomInt(100000000, 999999999)}`,
      displayName: 'Isolated booking history',
      phoneVerifiedAt: new Date(),
    })
    .returning();
  userIds.push(historyUser.id);
  const account = historyUser.id;
  const service = await create();
  const start = Date.now() + 86400000;
  const slot = await occurrence(service.id, 1, start);
  const order = await commerce.checkout(account, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const firstId = String(order.reservations[0].id);
  const firstOrderId = order.id;
  // This regression tests persisted history, not 101 checkout round trips.
  // Keep a real checkout/snapshot, then add constrained synthetic history in one statement.
  await rows(
    db,
    sql`WITH slots AS (
    INSERT INTO sport_occurrences(service_id,version_id,start_at,end_at,capacity)
    SELECT ${service.id},${service.version_id},${new Date(start).toISOString()}::timestamptz+i*interval '1 day',${new Date(start + 3600000).toISOString()}::timestamptz+i*interval '1 day',1
    FROM generate_series(1,100) i RETURNING id
  ), orders AS (
    INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,status,idempotency_key,request_hash,expires_at)
    SELECT ${account},${org},${service.id},${service.version_id},0,(SELECT snapshot FROM sport_orders WHERE id=${firstOrderId}),'paid','history-fixture:'||slots.id::text,'isolated-history-fixture',now()+interval '10 minutes'
    FROM slots RETURNING id,idempotency_key
  ) INSERT INTO sport_reservations(user_id,occurrence_id,order_id,status,expires_at)
    SELECT ${account},slots.id,orders.id,'confirmed',now()+interval '10 minutes' FROM slots JOIN orders ON orders.idempotency_key='history-fixture:'||slots.id::text`,
  );
  const bookingIds = (
    await rows<{ id: string }>(
      db,
      sql`SELECT r.id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE r.user_id=${account} ORDER BY o.start_at`,
    )
  ).map((r) => r.id);
  const recent = await commerce.bookings(account);
  expect(recent).toHaveLength(100);
  expect(recent.some((item) => item.id === firstId)).toBe(false);
  expect(await commerce.booking(account, firstId)).toMatchObject({
    id: firstId,
    order_id: firstOrderId,
    service_id: service.id,
    title: service.title,
    amount_minor: '0',
    snapshot: { title: service.title, policy },
  });
  await expect(commerce.booking(other, firstId)).rejects.toThrow();
  await expect(commerce.booking(account, randomUUID())).rejects.toThrow();

  // Retain PostgreSQL's microseconds across cursor boundaries; JS Date truncates them.
  await rows(
    db,
    sql`UPDATE sport_occurrences SET start_at=${new Date(start).toISOString()}::timestamptz + interval '1 microsecond'
    WHERE id=(SELECT occurrence_id FROM sport_reservations WHERE id=${firstId})`,
  );
  const tiedService = await create();
  const tiedSlot = await occurrence(tiedService.id, 1, start);
  const tiedOrder = await commerce.checkout(account, {
    serviceId: tiedService.id,
    occurrenceId: tiedSlot.id,
    idempotencyKey: randomUUID(),
  });
  const tiedId = String(tiedOrder.reservations[0].id);
  await rows(
    db,
    sql`UPDATE sport_occurrences SET start_at=${new Date(start).toISOString()}::timestamptz + interval '1 microsecond'
    WHERE id=${tiedSlot.id}`,
  );
  const first = await commerce.bookingPage(account, {
    tab: 'upcoming',
    limit: 1,
  });
  expect(first.nextCursor).toEqual(expect.any(String));
  const second = await commerce.bookingPage(account, {
    tab: 'upcoming',
    limit: 1,
    cursor: first.nextCursor!,
  });
  expect(new Set([first.items[0].id, second.items[0].id])).toEqual(
    new Set([firstId, tiedId]),
  );
  const nearest = await commerce.bookingPage(account, {
    tab: 'upcoming',
    limit: 3,
  });
  expect(nearest.items.map((item) => item.id)).toEqual([
    first.items[0].id,
    second.items[0].id,
    bookingIds[1],
  ]);
  const all: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await commerce.bookingPage(account, {
      tab: 'upcoming',
      limit: 20,
      cursor,
    });
    all.push(...page.items.map((item) => String(item.id)));
    cursor = page.nextCursor ?? undefined;
  } while (cursor && all.length <= 102);
  expect(cursor).toBeUndefined();
  expect(all).toHaveLength(102);
  expect(new Set(all)).toEqual(new Set([...bookingIds, tiedId]));
  await expect(
    commerce.bookingPage(other, {
      tab: 'upcoming',
      limit: 20,
      cursor: first.nextCursor!,
    }),
  ).rejects.toThrow('Backend.invalidBookingCursor');
  await expect(
    commerce.bookingPage(account, {
      tab: 'past',
      limit: 20,
      cursor: first.nextCursor!,
    }),
  ).rejects.toThrow('Backend.invalidBookingCursor');
  await expect(
    commerce.bookingPage(account, {
      tab: 'upcoming',
      limit: 20,
      cursor: 'invalid',
    }),
  ).rejects.toThrow('Backend.invalidBookingCursor');
  expect(bookingPageSchema.safeParse({ limit: 51 }).success).toBe(false);
  expect(bookingPageSchema.safeParse({ limit: 0 }).success).toBe(false);
  expect(bookingPageSchema.safeParse({ tab: 'unknown' }).success).toBe(false);
  expect(
    (await commerce.bookingPage(account, { tab: 'past', limit: 20 })).items,
  ).toEqual([]);
  // Ended sessions and cancelled future reservations belong in history, beyond the old limit.
  await rows(
    db,
    sql`UPDATE sport_occurrences SET start_at=now()-interval '2 hours',end_at=now()-interval '1 hour'
    WHERE id=(SELECT occurrence_id FROM sport_reservations WHERE id=${firstId})`,
  );
  await rows(
    db,
    sql`UPDATE sport_reservations SET status='cancelled' WHERE id=${bookingIds[100]}`,
  );
  const past = await commerce.bookingPage(account, { tab: 'past', limit: 1 });
  expect(past.items.map((item) => item.id)).toEqual([bookingIds[100]]);
  const older = await commerce.bookingPage(account, {
    tab: 'past',
    limit: 1,
    cursor: past.nextCursor!,
  });
  expect(older.items.map((item) => item.id)).toEqual([firstId]);
  expect(older.nextCursor).toBeNull();
  const remaining = await commerce.bookingPage(account, {
    tab: 'upcoming',
    limit: 3,
  });
  expect(remaining.items.map((item) => item.id)).toEqual([
    tiedId,
    bookingIds[1],
    bookingIds[2],
  ]);
}, 30000);

async function calendarBranch() {
  const [b] = await db
    .insert(s.branches)
    .values({
      organizationId: org,
      name: 'Calendar branch',
      slug: `calendar-${randomUUID()}`,
    })
    .returning();
  await db.insert(s.branchProfiles).values({ clubId: org, branchId: b.id });
  return { organizationId: org, branchId: b.id };
}
async function calendarStaff(
  branchId: string,
  role: 'manager' | 'receptionist',
) {
  const [user] = await db
    .insert(s.users)
    .values({ phone: `+989${randomInt(100000000, 999999999)}` })
    .returning();
  userIds.push(user.id);
  const [member] = await db
    .insert(s.organizationMembers)
    .values({ organizationId: org, userId: user.id, role, allBranches: false })
    .returning();
  await rows(
    db,
    sql`INSERT INTO organization_member_branches(member_id,organization_id,branch_id) VALUES(${member.id},${org},${branchId})`,
  );
  return { userId: user.id, memberId: member.id };
}
test('calendar settings are revisioned, audited, retry-safe and preserved when the first service is created', async () => {
  const calendars = testingModule.get(SportsCalendarService),
    scope = await calendarBranch();
  expect((await calendars.host(owner, scope)).calendar).toBeNull();
  const input = calendarSettingsSchema.parse({
    title: 'تقویم ورزش شعبه',
    description: 'برنامهٔ عمومی شعبه',
    revision: 0,
    idempotencyKey: randomUUID(),
  });
  const [a, b] = await Promise.all([
    calendars.save(owner, scope, input),
    calendars.save(owner, scope, input),
  ]);
  expect(a).toEqual(b);
  expect(a.revision).toBe(1);
  await expect(
    calendars.save(owner, scope, { ...input, title: 'Different' }),
  ).rejects.toThrow('Backend.calendarKeyReused');
  await expect(
    calendars.save(owner, scope, { ...input, idempotencyKey: randomUUID() }),
  ).rejects.toThrow('Backend.calendarChanged');
  const events = await rows(
    db,
    sql`SELECT id FROM audit_events WHERE target_id=${String(a.id)} AND action='sports.calendar.created'`,
  );
  expect(events).toHaveLength(1);
  await commerce.createService(
    owner,
    serviceSchema.parse({
      ...scope,
      title: 'First class',
      kind: 'class',
      amountMinor: '0',
      policy,
    }),
  );
  expect((await calendars.host(owner, scope)).calendar).toMatchObject({
    id: a.id,
    title: input.title,
    revision: 1,
  });
});
test('calendar writes and receipt replay enforce the current organization and branch grant', async () => {
  const calendars = testingModule.get(SportsCalendarService),
    scope = await calendarBranch();
  const manager = await calendarStaff(scope.branchId, 'manager'),
    reader = await calendarStaff(scope.branchId, 'receptionist');
  const input = calendarSettingsSchema.parse({
    title: 'Scoped calendar',
    revision: 0,
    idempotencyKey: randomUUID(),
  });
  await calendars.save(manager.userId, scope, input);
  expect((await calendars.host(reader.userId, scope)).can_manage).toBe(false);
  await expect(
    calendars.save(reader.userId, scope, {
      ...input,
      revision: 1,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
  await expect(calendars.host(other, scope)).rejects.toThrow();
  const another = await calendarBranch();
  await expect(calendars.host(manager.userId, another)).rejects.toThrow(
    'Backend.branchAccessDenied',
  );
  await rows(
    db,
    sql`DELETE FROM organization_member_branches WHERE member_id=${manager.memberId}`,
  );
  await expect(calendars.save(manager.userId, scope, input)).rejects.toThrow(
    'Backend.branchAccessDenied',
  );
});
test('calendar follows are idempotent, cannot recreate pending-deletion data and hide unavailable branches', async () => {
  const calendars = testingModule.get(SportsCalendarService),
    scope = await calendarBranch();
  const cal = await calendars.save(
      owner,
      scope,
      calendarSettingsSchema.parse({
        title: 'Follow calendar',
        revision: 0,
        idempotencyKey: randomUUID(),
      }),
    ),
    id = String(cal.id);
  const [before] = await rows(
    db,
    sql`SELECT (SELECT count(*) FROM sport_orders)::int orders,(SELECT count(*) FROM sport_reservations)::int reservations`,
  );
  await Promise.all([
    calendars.follow(athlete, id, true),
    calendars.follow(athlete, id, true),
  ]);
  expect(await calendars.following(athlete, id)).toEqual({ following: true });
  expect(
    await rows(
      db,
      sql`SELECT user_id FROM sport_calendar_follows WHERE user_id=${athlete} AND calendar_id=${id}`,
    ),
  ).toHaveLength(1);
  await rows(
    db,
    sql`UPDATE branch_profiles SET archived_at=now() WHERE branch_id=${scope.branchId}`,
  );
  try {
    expect(
      (
        await calendars.page(
          calendarPageSchema.parse({ search: 'Follow calendar' }),
          athlete,
        )
      ).items,
    ).toHaveLength(0);
    await expect(calendars.detail(id)).rejects.toThrow(
      'Backend.calendarUnavailable',
    );
    await calendars.follow(athlete, id, false);
  } finally {
    await rows(
      db,
      sql`UPDATE branch_profiles SET archived_at=null WHERE branch_id=${scope.branchId}`,
    );
  }
  expect(await calendars.following(athlete, id)).toEqual({ following: false });
  await rows(
    db,
    sql`UPDATE users SET deletion_pending=true WHERE id=${athlete}`,
  );
  try {
    await expect(calendars.follow(athlete, id, true)).rejects.toThrow(
      'Backend.accountDeletionPending',
    );
  } finally {
    await rows(
      db,
      sql`UPDATE users SET deletion_pending=false WHERE id=${athlete}`,
    );
  }
  const [after] = await rows(
    db,
    sql`SELECT (SELECT count(*) FROM sport_orders)::int orders,(SELECT count(*) FROM sport_reservations)::int reservations`,
  );
  expect(after).toEqual(before);
});
test('public and followed calendar pages cover older than 100 entries with exact timestamp ties', async () => {
  const calendars = testingModule.get(SportsCalendarService),
    prefix = `History ${randomUUID()}`;
  const items = await rows<{ id: string }>(
    db,
    sql`WITH b AS(INSERT INTO branches(organization_id,name,slug) SELECT ${org},${prefix}||n,gen_random_uuid()::text FROM generate_series(1,101) n RETURNING id,organization_id,name), p AS(INSERT INTO branch_profiles(club_id,branch_id) SELECT organization_id,id FROM b)
    INSERT INTO sport_calendars(organization_id,branch_id,title,created_at) SELECT organization_id,id,name,'2026-01-01'::timestamptz FROM b RETURNING id`,
  );
  for (const userId of [undefined, athlete]) {
    if (userId)
      await rows(
        db,
        sql`INSERT INTO sport_calendar_follows(user_id,calendar_id,created_at) SELECT ${userId},id,'2026-01-01'::timestamptz + ((row_number() over(order by id)/3)::text||' microseconds')::interval FROM sport_calendars WHERE title LIKE ${prefix + '%'}`,
      );
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await calendars.page(
        calendarPageSchema.parse({ search: prefix, cursor, limit: 25 }),
        userId,
      );
      seen.push(...page.items.map((i) => i.id));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen).toHaveLength(101);
    expect(new Set(seen).size).toBe(101);
  }
  const [oldest] = await rows<{ id: string }>(
    db,
    sql`SELECT id FROM sport_calendars WHERE title LIKE ${prefix + '%'} ORDER BY title DESC LIMIT 1`,
  );
  await rows(
    db,
    sql`UPDATE sport_calendars SET created_at='2010-01-01' WHERE id=${oldest.id}`,
  );
  expect(
    (
      await calendars.page({ ...calendarPageSchema.parse({}), limit: 100 })
    ).items.some((c) => c.id === oldest.id),
  ).toBe(false);
  expect((await calendars.detail(oldest.id)).id).toBe(oldest.id);
  await expect(
    calendars.page(calendarPageSchema.parse({ cursor: items[0].id }), other),
  ).rejects.toThrow('Backend.invalidCalendarCursor');
});
test('calendar service paging retains the published catalog and excludes unlisted or foreign cursors', async () => {
  const calendars = testingModule.get(SportsCalendarService),
    scope = await calendarBranch();
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      ...scope,
      title: 'Calendar base',
      kind: 'class',
      amountMinor: '0',
      policy,
    }),
  );
  await commerce.publish(owner, service.id, 1);
  await rows(
    db,
    sql`WITH additions AS(INSERT INTO sport_services(organization_id,branch_id,title,kind,created_at) SELECT ${org},${scope.branchId},'Calendar item '||n,'class','2026-01-01'::timestamptz + ((n/3)::text||' microseconds')::interval FROM generate_series(1,101) n RETURNING id,title)
    INSERT INTO sport_service_versions(service_id,version,title,amount_minor,description,policy,eligibility) SELECT a.id,1,a.title,0,v.description,v.policy,v.eligibility FROM additions a CROSS JOIN sport_service_versions v WHERE v.id=${service.version_id}`,
  );
  await rows(
    db,
    sql`UPDATE sport_services s SET status='published',published_version_id=v.id FROM sport_service_versions v WHERE v.service_id=s.id AND s.branch_id=${scope.branchId}`,
  );
  await rows(
    db,
    sql`UPDATE sport_service_versions v SET visibility='unlisted' FROM sport_services s WHERE v.service_id=s.id AND s.branch_id=${scope.branchId} AND s.title='Calendar item 101'`,
  );
  const host = await calendars.host(owner, scope),
    id = host.calendar.id;
  expect((await calendars.detail(id)).next_service_cursor).not.toBeNull();
  const seen: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await calendars.services(id, cursor);
    seen.push(...page.items.map((i) => i.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  expect(seen).toHaveLength(101);
  expect(new Set(seen).size).toBe(101);
  expect(seen).toContain(service.id);
  const foreign = await create();
  await expect(calendars.services(id, foreign.id)).rejects.toThrow(
    'Backend.invalidCalendarCursor',
  );
});

test('conversation pages cover more than 100 records with scoped microsecond cursors and separate archives', async () => {
  const scope = await calendarBranch(),
    manager = await calendarStaff(scope.branchId, 'manager');
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      ...scope,
      title: 'Paged conversations',
      kind: 'class',
      amountMinor: '0',
      policy,
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const created = await rows<{ id: string }>(
    db,
    sql`WITH slots AS (INSERT INTO sport_occurrences(service_id,version_id,start_at,end_at,capacity) SELECT ${service.id},(SELECT published_version_id FROM sport_services WHERE id=${service.id}),'2032-01-01'::timestamptz+g*interval '1 day','2032-01-01'::timestamptz+g*interval '1 day'+interval '1 hour',2 FROM generate_series(1,101) g RETURNING id) INSERT INTO sport_conversations(occurrence_id,title,created_at) SELECT id,'Paged thread','2040-01-01'::timestamptz+((row_number() OVER())::int%3)*interval '1 microsecond' FROM slots RETURNING id`,
  );
  const collected: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await community.conversationPage(manager.userId, {
      archived: false,
      cursor,
    });
    collected.push(...page.items.map((c) => c.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  expect(collected).toHaveLength(101);
  expect(new Set(collected)).toEqual(new Set(created.map((c) => c.id)));
  const hosted: string[] = [];
  let hostCursor: string | undefined;
  do {
    const page = await community.hostPage(owner, {
      ...scope,
      archived: false,
      cursor: hostCursor,
    });
    hosted.push(...page.items.map((c) => c.id));
    hostCursor = page.nextCursor ?? undefined;
  } while (hostCursor);
  expect(new Set(hosted)).toEqual(new Set(collected));
  expect(
    (await community.conversationPage(other, { archived: false })).items.some(
      (c) => collected.includes(c.id),
    ),
  ).toBe(false);
  await expect(
    community.conversationPage(other, {
      archived: false,
      cursor: collected[0],
    }),
  ).rejects.toThrow('Backend.invalidConversationCursor');
  await community.preferences(manager.userId, collected[0], { archived: true });
  const archived = await community.conversationPage(manager.userId, {
    archived: true,
  });
  expect(archived.items.map((c) => c.id)).toEqual([collected[0]]);
  expect(archived.nextCursor).toBeNull();
  await expect(
    community.conversationPage(manager.userId, {
      archived: false,
      cursor: collected[0],
    }),
  ).rejects.toThrow('Backend.invalidConversationCursor');
  const ids: string[] = [];
  cursor = undefined;
  do {
    const page = await community.conversationPage(manager.userId, {
      archived: false,
      cursor,
    });
    ids.push(...page.items.map((c) => c.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  expect(ids).toHaveLength(100);
  expect(new Set(ids).size).toBe(100);
  const otherService = await create(),
    otherSlot = await occurrence(otherService.id);
  const otherThread = await community.start(owner, otherSlot.id);
  await expect(
    community.hostPage(owner, {
      ...scope,
      archived: false,
      cursor: String(otherThread.id),
    }),
  ).rejects.toThrow('Backend.invalidConversationCursor');
  expect(
    (
      await community.hostPage(manager.userId, { ...scope, archived: true })
    ).items.map((c) => c.id),
  ).toEqual([collected[0]]);
});

test('notification pages are private, complete and read commands preserve their first timestamp', async () => {
  const service = testingModule.get(CommunityService),
    person = await calendarStaff(branch, 'receptionist');
  const notices = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_notifications(user_id,title,body,href,source_key,created_at,read_at) SELECT ${person.userId},'Test notice','Notice body','/bookings',gen_random_uuid()::text,'2040-01-01'::timestamptz+(g%3)*interval '1 microsecond',CASE WHEN g=1 THEN now() ELSE NULL END FROM generate_series(1,101) g RETURNING id`,
  );
  const all: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await service.notificationPage(person.userId, {
      view: 'all',
      cursor,
    });
    all.push(...page.items.map((n) => n.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  expect(all).toHaveLength(101);
  expect(new Set(all)).toEqual(new Set(notices.map((n) => n.id)));
  const unread: string[] = [];
  cursor = undefined;
  do {
    const page = await service.notificationPage(person.userId, {
      view: 'unread',
      cursor,
    });
    unread.push(...page.items.map((n) => n.id));
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  expect(unread).toHaveLength(100);
  expect(new Set(unread).size).toBe(100);
  await expect(
    service.notificationPage(other, { view: 'all', cursor: all[0] }),
  ).rejects.toThrow('Backend.invalidNotificationCursor');
  await expect(service.readNotification(other, all[0])).rejects.toThrow(
    'Backend.notificationUnavailable',
  );
  const [a, b] = await Promise.all([
    service.readNotification(person.userId, unread[0]),
    service.readNotification(person.userId, unread[0]),
  ]);
  expect(a.read_at).toEqual(b.read_at);
  await expect(
    service.notificationPage(person.userId, {
      view: 'unread',
      cursor: unread[0],
    }),
  ).rejects.toThrow('Backend.invalidNotificationCursor');
  await rows(
    db,
    sql`UPDATE users SET deletion_pending=true WHERE id=${person.userId}`,
  );
  await expect(
    service.readNotification(person.userId, unread[1]),
  ).rejects.toThrow('Backend.accountDeletionPending');
  await expect(
    service.notificationPreferences(person.userId, {
      reminders: false,
      messages: false,
      invitations: false,
    }),
  ).rejects.toThrow('Backend.accountDeletionPending');
});

test('host conversation changes are revisioned, audited, retry-safe and reject revoked branch grants', async () => {
  const service = await create(),
    slot = await occurrence(service.id),
    manager = await calendarStaff(branch, 'manager'),
    reader = await calendarStaff(branch, 'receptionist');
  const chat = await community.start(manager.userId, slot.id),
    id = String(chat.id);
  const input = {
    closed: true,
    revision: 1,
    reason: 'Close the session conversation',
    idempotencyKey: randomUUID(),
  };
  const [a, b] = await Promise.all([
    community.moderate(manager.userId, id, input),
    community.moderate(manager.userId, id, input),
  ]);
  expect(a).toEqual({ closed: true, revision: 2 });
  expect(b).toEqual(a);
  expect(
    await rows(
      db,
      sql`SELECT id FROM audit_events WHERE target_id=${id} AND action='sports.conversation.state_changed'`,
    ),
  ).toHaveLength(1);
  await expect(
    community.moderate(manager.userId, id, {
      ...input,
      reason: 'A different reason',
    }),
  ).rejects.toThrow('Backend.conversationKeyReused');
  await expect(
    community.moderate(manager.userId, id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow('Backend.conversationChanged');
  await expect(
    community.moderate(reader.userId, id, {
      ...input,
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
  await expect(community.moderate(other, id, input)).rejects.toThrow();
  await rows(
    db,
    sql`DELETE FROM organization_member_branches WHERE member_id=${manager.memberId}`,
  );
  await expect(community.moderate(manager.userId, id, input)).rejects.toThrow();
  expect(
    await community.moderate(owner, id, {
      ...input,
      closed: false,
      revision: 2,
      idempotencyKey: randomUUID(),
    }),
  ).toEqual({ closed: false, revision: 3 });
});

test('starting and sending a conversation concurrently create a single audited thread and message', async () => {
  const service = await create(),
    slot = await occurrence(service.id),
    manager = await calendarStaff(branch, 'manager');
  const [a, b] = await Promise.all([
    community.start(manager.userId, slot.id),
    community.start(manager.userId, slot.id),
  ]);
  expect(a.id).toBe(b.id);
  expect(
    await rows(
      db,
      sql`SELECT id FROM audit_events WHERE target_id=${String(a.id)} AND action='sports.conversation.created'`,
    ),
  ).toHaveLength(1);
  const key = randomUUID(),
    [m, n] = await Promise.all([
      community.send(manager.userId, String(a.id), 'Concurrent retry', key),
      community.send(manager.userId, String(a.id), 'Concurrent retry', key),
    ]);
  expect(m.id).toBe(n.id);
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_messages WHERE conversation_id=${String(a.id)}`,
    ),
  ).toHaveLength(1);
  await rows(
    db,
    sql`UPDATE users SET deletion_pending=true WHERE id=${manager.userId}`,
  );
  const next = await occurrence(service.id, 1, Date.now() + 5 * 86400000);
  await expect(community.start(manager.userId, next.id)).rejects.toThrow(
    'Backend.accountDeletionPending',
  );
});

test('a sender queued behind a conversation lock rechecks closure before inserting a message', async () => {
  const service = await create(),
    slot = await occurrence(service.id),
    manager = await calendarStaff(branch, 'manager');
  const chat = await community.start(owner, slot.id),
    id = String(chat.id);
  let outcome: Promise<{ ok: boolean; error?: string }> | undefined;
  await db.transaction(async (tx) => {
    const [holder] = await rows<{ pid: number }>(
      tx,
      sql`SELECT pg_backend_pid() pid`,
    );
    await rows(
      tx,
      sql`SELECT id FROM sport_conversations WHERE id=${id} FOR UPDATE`,
    );
    outcome = community
      .send(manager.userId, id, 'Must not pass the close lock', randomUUID())
      .then(
        () => ({ ok: true }),
        (error: unknown) => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    let queued = false;
    for (let attempt = 0; attempt < 100 && !queued; attempt++) {
      const waiting = await rows(
        db,
        sql`SELECT pid FROM pg_stat_activity WHERE ${holder.pid}=ANY(pg_blocking_pids(pid)) AND query LIKE 'SELECT c.%'`,
      );
      queued = waiting.length > 0;
      if (!queued) await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(queued).toBe(true);
    await rows(
      tx,
      sql`UPDATE sport_conversations SET closed=true,revision=revision+1 WHERE id=${id}`,
    );
  });
  expect(await outcome).toEqual({ ok: false, error: 'Conversation closed' });
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_messages WHERE conversation_id=${id}`,
    ),
  ).toHaveLength(0);
});

test('manual attendance retires unread reminders and prevents late delivery', async () => {
  const service = await create();
  const slot = await occurrence(service.id, 1, Date.now() + 20 * 60000);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const reservation = order.reservations[0];
  const [job] = await rows<{ id: string; payload: { occurrenceId: string } }>(
    db,
    sql`SELECT id,payload FROM sport_outbox WHERE kind='reservation.reminder' AND aggregate_id=${String(reservation.id)} AND processed_at IS NULL`,
  );
  const dispatched = {
    ...job,
    aggregateId: String(reservation.id),
    kind: 'reservation.reminder' as const,
  };
  await deliverTimeSensitiveNotification(db, dispatched);
  const notices = () =>
    rows(
      db,
      sql`SELECT id FROM sport_notifications WHERE source_key=${`${job.id}:${athlete}`}`,
    );
  expect(await notices()).toHaveLength(1);
  const operations = testingModule.get(SportsOperationsService);
  await operations.manualAttendance(
    owner,
    String(reservation.id),
    true,
    'Notification integration check',
  );
  expect(await notices()).toHaveLength(0);
  await deliverTimeSensitiveNotification(db, dispatched);
  expect(await notices()).toHaveLength(0);
  expect((await commerce.booking(athlete, String(reservation.id))).status).toBe(
    'completed',
  );
});

test('business host reads require current branch management even for a registered receptionist', async () => {
  const service = await create(),
    slot = await occurrence(service.id, 4);
  const receptionist = await calendarStaff(branch, 'receptionist'),
    manager = await calendarStaff(branch, 'manager');
  for (const userId of [athlete, receptionist.userId])
    await commerce.checkout(userId, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    });
  const thread = await community.start(owner, slot.id),
    id = String(thread.id);
  expect(
    (await community.messages(receptionist.userId, id)).conversation.host,
  ).toBe(false);
  await expect(
    community.messages(receptionist.userId, id, undefined, true),
  ).rejects.toThrow('Backend.branchAccessDenied');
  await expect(
    community.hostPage(receptionist.userId, {
      organizationId: org,
      branchId: branch,
      archived: false,
    }),
  ).rejects.toThrow('Backend.branchAccessDenied');
  await expect(
    community.messages(athlete, id, undefined, true),
  ).rejects.toThrow('Backend.branchAccessDenied');
  expect(
    (await community.messages(manager.userId, id, undefined, true)).conversation
      .host,
  ).toBe(true);
  await expect(
    community.hostPage(other, {
      organizationId: org,
      branchId: branch,
      archived: false,
    }),
  ).rejects.toThrow('Backend.branchAccessDenied');
  await expect(
    community.hostPage(owner, {
      organizationId: org,
      branchId: secondBranch,
      archived: false,
    }),
  ).rejects.toThrow('Backend.branchNotFound');
  await rows(
    db,
    sql`DELETE FROM organization_member_branches WHERE member_id=${manager.memberId} AND branch_id=${branch}`,
  );
  await expect(
    community.messages(manager.userId, id, undefined, true),
  ).rejects.toThrow();
  await expect(
    community.hostPage(manager.userId, {
      organizationId: org,
      branchId: branch,
      archived: false,
    }),
  ).rejects.toThrow('Backend.branchAccessDenied');
});

test('host conversation filters reject unknown scope fields and require both organization and branch', () => {
  expect(
    hostConversationPageSchema.parse({ organizationId: org, branchId: branch })
      .archived,
  ).toBe(false);
  for (const input of [
    { organizationId: org },
    { branchId: branch },
    { organizationId: org, branchId: branch, archived: true },
    { organizationId: org, branchId: branch, organization: secondOrg },
    { organizationId: org, branchId: 'invalid' },
  ])
    expect(hostConversationPageSchema.safeParse(input).success).toBe(false);
});

test('individual session edits preserve identities, replay safely and enforce administrator authority', async () => {
  const service = await create();
  const item = await occurrence(service.id, 3);
  const input = {
    startAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 3 * 86400000 + 3600000).toISOString(),
    capacity: 4,
    revision: 1,
    reason: 'Correct session timing',
    idempotencyKey: randomUUID(),
  };
  await expect(
    commerce.editOccurrence(other, item.id, input),
  ).rejects.toThrow();
  await db.execute(
    sql`INSERT INTO platform_admins(user_id) VALUES(${owner}) ON CONFLICT DO NOTHING`,
  );
  const admin = {
    user: { id: owner },
    session: { client: 'admin' },
  } as Principal;
  const wrong = {
    user: { id: owner },
    session: { client: 'application' },
  } as Principal;
  await expect(
    commerce.editOccurrence(owner, item.id, input, wrong),
  ).rejects.toThrow();
  const first = await commerce.editOccurrence(owner, item.id, input, admin);
  expect((first as { id: string }).id).toBe(item.id);
  await expect(
    commerce.editOccurrence(owner, item.id, input, admin),
  ).resolves.toBeDefined();
  await expect(
    commerce.editOccurrence(
      owner,
      item.id,
      { ...input, idempotencyKey: randomUUID() },
      admin,
    ),
  ).rejects.toThrow('Backend.seriesChanged');
  const saved = await rows(
    db,
    sql`SELECT * FROM audit_events WHERE target_id=${item.id} AND action='sports.occurrence.edit'`,
  );
  expect(saved).toHaveLength(1);
});

test('analytics uses Tehran boundaries, exact money and rejects cross-role/cross-branch access', async () => {
  const analytics = testingModule.get(AnalyticsService);
  const service = await create('class', '10000');
  const [version] = await rows<{ id: string }>(
    db,
    sql`SELECT id FROM sport_service_versions WHERE service_id=${service.id} ORDER BY version DESC LIMIT 1`,
  );
  for (const [at, amount] of [
    ['2026-04-30T20:29:59Z', '100'],
    ['2026-04-30T20:30:00Z', '9007199254740993'],
    ['2026-05-01T20:29:59Z', '7'],
    ['2026-05-01T20:30:00Z', '200'],
  ]) {
    const [order] = await rows<{ id: string }>(
      db,
      sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,status,idempotency_key,request_hash,expires_at,created_at) VALUES(${athlete},${org},${service.id},${version.id},${amount},${JSON.stringify({ title: 'Analytics isolated', branchId: branch })}::jsonb,'paid',${randomUUID()},'analytics-test',now()+interval '1 day',${at}::timestamptz) RETURNING id`,
    );
    await rows(
      db,
      sql`INSERT INTO sport_payments(order_id,reference,amount_minor,scenario,state,verified_at,created_at) VALUES(${order.id},${randomUUID()},${amount},'success','verified',${at}::timestamptz,${at}::timestamptz)`,
    );
  }
  const business = {
    user: { id: owner },
    session: { client: 'business' },
  } as Principal;
  const filter = analyticsFilters.parse({
    from: '2026-05-01',
    to: '2026-05-01',
    serviceId: service.id,
  });
  const report = await analytics.report(business, 'business', filter);
  expect(report.data.find((r) => r.metric === 'collectedMinor')?.value).toBe(
    '9007199254741000',
  );
  expect(report.data.find((r) => r.metric === 'orders')?.value).toBe('2');
  expect(
    report.options.branches.some((b) => b.organization_id === secondOrg),
  ).toBe(false);
  expect(report.platform).toEqual([]);
  await expect(
    analytics.report(business, 'business', {
      ...filter,
      organizationId: secondOrg,
    }),
  ).rejects.toThrow();
  await expect(
    analytics.report(
      { ...business, session: { client: 'application' } } as Principal,
      'business',
      filter,
    ),
  ).rejects.toThrow();
  await expect(
    analytics.report(
      { user: { id: athlete }, session: { client: 'business' } } as Principal,
      'business',
      filter,
    ),
  ).rejects.toThrow();
  const scoped = await calendarStaff(branch, 'manager');
  const manager = {
    user: { id: scoped.userId },
    session: { client: 'business' },
  } as Principal;
  const scope = await calendarBranch();
  await expect(
    analytics.report(manager, 'business', {
      ...filter,
      branchId: scope.branchId,
    }),
  ).rejects.toThrow();
  const own = await analytics.report(manager, 'business', filter);
  expect(own.options.branches.map((b) => b.id)).toEqual([branch]);
  expect(JSON.stringify(own)).not.toMatch(
    /phone|display_name|measurements|training_messages|assessment/,
  );
  await expect(analytics.report(business, 'admin', filter)).rejects.toThrow();
});

test('management list filters are applied before pagination and preserve staff authorization', async () => {
  const operations = testingModule.get(SportsOperationsService),
    service = await create();
  const matches = await commerce.business(
    owner,
    org,
    branch,
    managementFilters({ search: service.title, page: 1, status: 'published' }),
  );
  expect(matches.map((s) => s.id)).toEqual([service.id]);
  expect(
    await commerce.business(
      owner,
      org,
      branch,
      managementFilters({ search: service.title, page: 2 }),
    ),
  ).toEqual([]);
  expect(
    await commerce.business(
      owner,
      org,
      branch,
      managementFilters({ search: "%' OR true --", page: 1 }),
    ),
  ).toEqual([]);
  await expect(
    operations.members(athlete, org, branch, managementFilters({ page: 1 })),
  ).rejects.toThrow();
});

test('only the active coach can aggregate workouts the athlete still shares', async () => {
  const analytics = testingModule.get(AnalyticsService),
    coach = await invitationAthlete();
  await db.insert(s.coachProfiles).values({ userId: coach.id });
  try {
    const [relationship] = await rows<{ id: string }>(
      db,
      sql`INSERT INTO coaching_relationships(coach_id,student_id,status) VALUES(${coach.id},${athlete},'active') RETURNING id`,
    );
    const sharedId = randomUUID();
    for (const shared of [true, false])
      await rows(
        db,
        sql`INSERT INTO training_sessions(id,athlete_id,relationship_id,snapshot,day_index,state,shared,started_at,ended_at) VALUES(${shared ? sharedId : randomUUID()},${athlete},${relationship.id},'{}'::jsonb,0,'completed',${shared},'2026-05-01T10:00:00Z','2026-05-01T11:00:00Z')`,
      );
    const f = analyticsFilters.parse({ from: '2026-05-01', to: '2026-05-01' }),
      principal = {
        user: { id: coach.id },
        session: { client: 'application' },
      } as Principal;
    expect(
      (await analytics.report(principal, 'coach', f)).data.find(
        (r) => r.metric === 'sharedWorkouts',
      )?.value,
    ).toBe('1');
    expect(
      (
        await analytics.report(
          {
            user: { id: other },
            session: { client: 'application' },
          } as Principal,
          'coach',
          f,
        )
      ).data.some((r) => r.metric === 'sharedWorkouts'),
    ).toBe(false);
    await rows(
      db,
      sql`UPDATE training_sessions SET shared=false WHERE id=${sharedId}`,
    );
    expect(
      (await analytics.report(principal, 'coach', f)).data.some(
        (r) => r.metric === 'sharedWorkouts',
      ),
    ).toBe(false);
    await rows(
      db,
      sql`UPDATE training_sessions SET shared=true WHERE id=${sharedId}`,
    );
    await rows(
      db,
      sql`UPDATE coaching_relationships SET status='ended' WHERE id=${relationship.id}`,
    );
    expect(
      (await analytics.report(principal, 'coach', f)).data.some(
        (r) => r.metric === 'sharedWorkouts',
      ),
    ).toBe(false);
  } finally {
    await rows(
      db,
      sql`DELETE FROM training_sessions WHERE relationship_id IN (SELECT id FROM coaching_relationships WHERE coach_id=${coach.id})`,
    );
    await rows(
      db,
      sql`DELETE FROM coaching_relationships WHERE coach_id=${coach.id}`,
    );
    await rows(db, sql`DELETE FROM coach_profiles WHERE user_id=${coach.id}`);
  }
});

test('audit: paid bookings awaiting approval keep their seat after the payment hold expires', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Approval capacity audit',
      kind: 'class',
      amountMinor: '0',
      policy,
      approvalRequired: true,
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  await db.execute(
    sql`UPDATE sport_reservations SET expires_at=now()-interval '1 minute' WHERE order_id=${order.id}`,
  );
  expect((await commerce.detail(service.id)).occurrences[0].remaining).toBe(0);
  await expect(
    commerce.checkout(other, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toBeInstanceOf(ConflictException);
});

test('audit: an approval-pending booking protects the final membership session from direct entry', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Approval entitlement audit',
      kind: 'class',
      amountMinor: '0',
      policy,
      approvalRequired: true,
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const plan = await create('membership', '0', [], 1, [service.id]);
  const purchase = await commerce.checkout(athlete, {
    serviceId: plan.id,
    idempotencyKey: randomUUID(),
  });
  const membership = (await commerce.memberships(athlete)).find(
    (m) => m.order_id === purchase.id,
  )!;
  const token = await commerce.ticket(athlete, String(membership.id), true);
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    membershipId: String(membership.id),
    idempotencyKey: randomUUID(),
  });
  await db.execute(
    sql`UPDATE sport_reservations SET expires_at=now()-interval '1 minute' WHERE order_id=${order.id}`,
  );
  await expect(
    commerce.checkIn(owner, token.token, 'Approval balance audit'),
  ).rejects.toThrow('Backend.membershipExhausted');
});

test('audit: capacity cannot be reduced below paid bookings awaiting approval', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Approval capacity edit audit',
      kind: 'class',
      amountMinor: '0',
      policy,
      approvalRequired: true,
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const slot = await occurrence(service.id, 2);
  for (const userId of [athlete, other])
    await commerce.checkout(userId, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    });
  await db.execute(
    sql`UPDATE sport_reservations SET expires_at=now()-interval '1 minute' WHERE occurrence_id=${slot.id}`,
  );
  await expect(
    commerce.editOccurrence(owner, slot.id, {
      startAt: slot.start_at.toISOString(),
      endAt: slot.end_at.toISOString(),
      capacity: 1,
      revision: 1,
      idempotencyKey: randomUUID(),
      reason: 'Approval capacity audit',
    }),
  ).rejects.toBeInstanceOf(ConflictException);
});

test('audit: a cancelled course session cannot create a purchase without reservations', async () => {
  const service = await create('course', '10000');
  const slot = await occurrence(service.id);
  await testingModule
    .get(SportsOperationsService)
    .cancelOccurrence(owner, slot.id, 1, 'Cancelled course audit');
  await expect(
    commerce.checkout(athlete, {
      serviceId: service.id,
      occurrenceId: slot.id,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toBeInstanceOf(ConflictException);
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_orders WHERE service_id=${service.id}`,
    ),
  ).toHaveLength(0);
});

test('audit: cash collection cannot confirm an unpaid session that has already started', async () => {
  const service = await create('class', '10000');
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  await db.execute(
    sql`UPDATE sport_occurrences SET start_at=now()-interval '1 minute',end_at=now()+interval '30 minutes' WHERE id=${slot.id}`,
  );
  await expect(
    commerce.captureCash(owner, order.id, 'Started session audit'),
  ).rejects.toBeInstanceOf(ConflictException);
  expect((await commerce.myOrder(athlete, order.id)).payments).toHaveLength(0);
});

test('audit: withdrawing and rejoining the waitlist creates a fresh payable offer', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  await commerce.waitlist(other, slot.id);
  await commerce.runJobs();
  const first = (await commerce.waitlist(other)).find(
    (w) => w.occurrence_id === slot.id,
  )!;
  expect(first.status).toBe('offered');
  await commerce.withdraw(other, String(first.id));
  await commerce.waitlist(other, slot.id);
  await commerce.runJobs();
  const second = (await commerce.waitlist(other)).find(
    (w) => w.occurrence_id === slot.id,
  )!;
  const accepted = await commerce.acceptOffer(other, String(second.id));
  expect(accepted.status).toBe('paid');
  expect(accepted.id).not.toBe(first.order_id);
  expect(accepted.reservations[0].status).toBe('confirmed');
});

test('audit: the quoted small deposit matches the amount sent to the gateway', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Small deposit audit',
      kind: 'class',
      amountMinor: '1',
      policy: { ...policy, depositBasisPoints: 1 },
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const slot = await occurrence(service.id);
  const input = { serviceId: service.id, occurrenceId: slot.id };
  const quote = await commerce.quote(athlete, input);
  const order = await commerce.checkout(athlete, {
    ...input,
    quoteId: quote.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(athlete, order.id, 'success', randomUUID());
  const pending = await commerce.myOrder(athlete, order.id);
  expect(pending.payments[0].amount_minor).toBe(quote.payNowMinor);
});

test('audit: rescheduling into an existing booking returns a conflict and preserves both bookings', async () => {
  const service = await create();
  const first = await occurrence(service.id, 3);
  const second = await occurrence(service.id, 3, Date.now() + 2 * 86400000);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: first.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: second.id,
    idempotencyKey: randomUUID(),
  });
  await expect(
    commerce.reschedule(
      athlete,
      String(order.reservations[0].id),
      Number(order.reservations[0].revision),
      second.id,
    ),
  ).rejects.toBeInstanceOf(ConflictException);
  expect(
    (await commerce.myOrder(athlete, order.id)).reservations[0].occurrence_id,
  ).toBe(first.id);
});

test('audit: a deposit-paid missed session closes exactly once', async () => {
  const service = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId: org,
      branchId: branch,
      title: 'Deposit no-show audit',
      kind: 'class',
      amountMinor: '10000',
      policy: { ...policy, depositBasisPoints: 2500 },
    }),
  );
  await commerce.publish(owner, service.id, 1);
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(athlete, order.id, 'success', randomUUID());
  await commerce.verifyPayment(athlete, order.id);
  await db.execute(
    sql`UPDATE sport_occurrences SET start_at=now()-interval '2 hours',end_at=now()-interval '1 hour' WHERE id=${slot.id}`,
  );
  await commerce.runJobs();
  await commerce.runJobs();
  const result = await commerce.myOrder(athlete, order.id);
  expect(result.status).toBe('partially_paid');
  expect(result.reservations[0].status).toBe('no_show');
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_attendance WHERE reservation_id=${String(result.reservations[0].id)}`,
    ),
  ).toHaveLength(1);
});

test('audit: archived or inactive branches cannot sell memberships through a direct link', async () => {
  const service = await create('membership', '10000', [], 4);
  try {
    await db.execute(
      sql`UPDATE branch_profiles SET archived_at=now() WHERE branch_id=${branch}`,
    );
    await expect(commerce.detail(service.id)).rejects.toThrow();
    await expect(
      commerce.checkout(athlete, {
        serviceId: service.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow();
    await db.execute(
      sql`UPDATE branch_profiles SET archived_at=NULL WHERE branch_id=${branch}`,
    );
    await db.execute(
      sql`INSERT INTO business_branch_state(branch_id,active,reason) VALUES(${branch},false,'Inactive branch audit')`,
    );
    await expect(
      commerce.quote(athlete, { serviceId: service.id }),
    ).rejects.toThrow();
    await expect(
      commerce.checkout(athlete, {
        serviceId: service.id,
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toThrow();
  } finally {
    await db.execute(
      sql`UPDATE branch_profiles SET archived_at=NULL WHERE branch_id=${branch}`,
    );
    await db.execute(
      sql`DELETE FROM business_branch_state WHERE branch_id=${branch}`,
    );
  }
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_orders WHERE service_id=${service.id}`,
    ),
  ).toHaveLength(0);
});

test('audit: rejoining after an expired waitlist offer receives a fresh hold and notification', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  await commerce.waitlist(other, slot.id);
  await commerce.runJobs();
  const first = (await commerce.waitlist(other)).find(
    (w) => w.occurrence_id === slot.id,
  )!;
  await db.execute(
    sql`UPDATE sport_orders SET expires_at=now()-interval '1 minute' WHERE id=${String(first.order_id)}`,
  );
  await db.execute(
    sql`UPDATE sport_reservations SET expires_at=now()-interval '1 minute' WHERE order_id=${String(first.order_id)}`,
  );
  await db.execute(
    sql`UPDATE sport_waitlist SET offer_expires_at=now()-interval '1 minute' WHERE id=${String(first.id)}`,
  );
  await commerce.runJobs();
  await commerce.waitlist(other, slot.id);
  await commerce.runJobs();
  const second = (await commerce.waitlist(other)).find(
    (w) => w.occurrence_id === slot.id,
  )!;
  const accepted = await commerce.acceptOffer(other, String(second.id));
  expect(accepted.id).not.toBe(first.order_id);
  expect(accepted.reservations[0].status).toBe('confirmed');
  const events = await rows(
    db,
    sql`SELECT source_key FROM sport_outbox WHERE kind='waitlist.offered' AND aggregate_id=${String(first.id)}`,
  );
  expect(events).toHaveLength(2);
});

test('audit: payment verification racing host cancellation does not deadlock or confirm cancelled capacity', async () => {
  const service = await create('class', '10000');
  const slot = await occurrence(service.id);
  const order = await commerce.checkout(athlete, {
    serviceId: service.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(athlete, order.id, 'success', randomUUID());
  let verification: Promise<unknown> | undefined;
  const cancellation = await db
    .transaction(async (tx) => {
      const [holder] = await rows<{ pid: number }>(
        tx,
        sql`SELECT pg_backend_pid() pid`,
      );
      await rows(
        tx,
        sql`SELECT id FROM sport_occurrences WHERE id=${slot.id} FOR UPDATE`,
      );
      verification = commerce
        .verifyPayment(athlete, order.id)
        .catch((error: unknown) => error);
      let queued = false;
      for (let attempt = 0; attempt < 100 && !queued; attempt++) {
        queued =
          (
            await rows(
              db,
              sql`SELECT pid FROM pg_stat_activity WHERE ${holder.pid}=ANY(pg_blocking_pids(pid)) AND query LIKE '%sport_occurrences%'`,
            )
          ).length > 0;
        if (!queued) await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(queued).toBe(true);
      await rows(
        tx,
        sql`UPDATE sport_occurrences SET status='cancelled',revision=revision+1 WHERE id=${slot.id}`,
      );
      await commerce.cancelHostedOrder(
        tx,
        order.id,
        'Host cancellation payment race',
      );
    })
    .catch((error: unknown) => error);
  const result = await verification;
  expect(cancellation).toBeUndefined();
  expect(result).not.toBeInstanceOf(Error);
  const cancelled = await commerce.myOrder(athlete, order.id);
  expect(cancelled.status).toBe('review');
  expect(cancelled.reservations[0].status).toBe('cancelled');
  expect(cancelled.refunds).toHaveLength(1);
});

test('audit: a cancelled session cannot accept a new waitlist registration', async () => {
  const service = await create();
  const slot = await occurrence(service.id);
  await testingModule
    .get(SportsOperationsService)
    .cancelOccurrence(owner, slot.id, 1, 'Cancelled waitlist audit');
  await expect(commerce.waitlist(other, slot.id)).rejects.toThrow();
  expect(
    await rows(
      db,
      sql`SELECT id FROM sport_waitlist WHERE occurrence_id=${slot.id}`,
    ),
  ).toHaveLength(0);
});
