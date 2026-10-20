import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { CoachingService } from '../src/modules/coaching/coaching.service';
import { CoachingPracticeService } from '../src/modules/coaching/practice.service';
import { CoachingRecordsService } from '../src/modules/coaching/records.service';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { SportsOperationsService } from '../src/modules/commerce/operations.service';
import {
  offeringSchema,
  practiceSchema,
  assessmentSchema,
  contractSchema,
  ledgerSchema,
  coachReviewSchema,
} from '../src/modules/coaching/practice.contracts';
import { StorageService } from '../src/modules/clubs/storage.service';
import { seedUiCatalog } from './ui.catalog-fixture';
const url =
  process.env.COACHING_TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_coaching_test';
if (!new URL(url).pathname.endsWith('coaching_test'))
  throw new Error('Requires dedicated coaching_test database');
let testingModule: TestingModule,
  db: DatabaseService['db'],
  practice: CoachingPracticeService,
  coaching: CoachingService,
  records: CoachingRecordsService,
  commerce: CommerceService,
  operations: SportsOperationsService;
let coach: string,
  student: string,
  stranger: string,
  owner: string,
  owner2: string,
  org: string,
  branch: string,
  org2: string,
  branch2: string,
  relation: string,
  service: string,
  otherService: string,
  occurrence: string,
  reservation: string;
const files = new Map<string, Buffer>();
const storage = {
  put: (key: string, body: Buffer) => {
    files.set(key, body);
    return Promise.resolve();
  },
  get: (key: string) => Promise.resolve(files.get(key)),
  delete: (key: string) => {
    files.delete(key);
    return Promise.resolve();
  },
  preview: (key: string) =>
    Promise.resolve({
      url: 'https://private.invalid/' + encodeURIComponent(key),
      expiresIn: 60,
    }),
  configured: () => true,
  objects: async function* () {},
};
const now = Date.now(),
  future = (days: number, minutes = 0) =>
    new Date(now + days * 86400000 + minutes * 60000).toISOString();
const policy = {
  cancellationHours: 0,
  lateRefundBasisPoints: 10000,
  noShowConsumesSession: false,
  consumeOn: 'attendance',
  freezeDays: 7,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms: 'Isolated coaching demo policy for integration acceptance.',
} as const;
async function offer(o = org, b = branch, actor = owner) {
  const result = await practice.createOffering(
    actor,
    offeringSchema.parse({
      service: {
        organizationId: o,
        branchId: b,
        title: 'Private coaching integration',
        kind: 'class',
        amountMinor: '10000',
        coachUserId: coach,
        coachName: 'Coach',
        policy,
        approvalRequired: true,
      },
      mode: 'private',
      entryAmountMinor: '1000',
      idempotencyKey: randomUUID(),
    }),
  );
  return String((result as { id: string }).id);
}
async function relationship(actor = student) {
  await coaching.request(actor, coach);
  const page = await coaching.dashboard(coach, 1);
  const row = page.items.find((x) => x.studentId === actor)!;
  await coaching.answer(coach, String(row.id), 'accept', row.revision);
  return String(row.id);
}
beforeAll(async () => {
  testingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () =>
            validateEnvironment({
              DATABASE_URL: url,
              NODE_ENV: 'test',
              AUTH_SECRET: randomUUID() + randomUUID(),
              RETENTION_ENABLED: 'false',
            }),
        ],
      }),
      WorkspacesModule,
    ],
  })
    .overrideProvider(StorageService)
    .useValue(storage)
    .compile();
  db = testingModule.get(DatabaseService).db;
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  practice = testingModule.get(CoachingPracticeService);
  coaching = testingModule.get(CoachingService);
  records = testingModule.get(CoachingRecordsService);
  commerce = testingModule.get(CommerceService);
  operations = testingModule.get(SportsOperationsService);
  const catalog = await seedUiCatalog(db, 'http://localhost:7081', true);
  [owner, owner2, student] = catalog.people.map((p) => p.id);
  [org, org2] = catalog.clubs.map((c) => c.id);
  [branch, branch2] = catalog.clubs.map((c) => c.branches[0]);
  for (const label of ['Coach', 'Unrelated']) {
    const [person] = await db
      .insert(s.users)
      .values({
        phone:
          '+989' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0'),
        displayName: label,
        phoneVerifiedAt: new Date(),
      })
      .returning();
    if (label === 'Coach') coach = person.id;
    else stranger = person.id;
  }
  await practice.save(
    coach,
    practiceSchema.parse({
      specialties: ['strength'],
      goals: ['mobility'],
      city: 'Tehran',
      experienceYears: 5,
      published: true,
      bufferMinutes: 5,
      travelMinutes: 10,
      revision: 1,
    }),
  );
  const credential = await practice.credential(
    coach,
    {
      title: 'Synthetic qualification',
      issuer: 'Fixture',
      expiresAt: future(90),
    },
    {
      buffer: Buffer.from('%PDF-synthetic-fixture'),
      mimetype: 'application/pdf',
    },
  );
  await expect(
    practice.previewCredential(stranger, String(credential.id)),
  ).rejects.toThrow();
  expect(
    (await practice.previewCredential(coach, String(credential.id))).expiresIn,
  ).toBe(60);
  const p = (await practice.workspace(coach)).practice;
  await practice.review(catalog.people[3].id, coach, {
    approved: true,
    reason: 'Synthetic approval',
    expiresAt: future(60),
    revision: Number(p.revision),
  });
  await db.insert(s.branchCoaches).values([
    { branchId: branch, coachId: coach, status: 'active' },
    { branchId: branch2, coachId: coach, status: 'active' },
  ]);
  await practice.availability(coach, {
    kind: 'available',
    startsAt: future(0, 30),
    endsAt: future(30),
  });
  relation = await relationship();
  service = await offer();
  otherService = await offer(org2, branch2, owner2);
}, 120000);
afterAll(async () => {
  await testingModule?.close();
});
it('public discovery exposes approved published metadata, never credentials or recipient phones', async () => {
  const result = await practice.search({
    search: 'Coach',
    city: 'Tehran',
    specialty: 'strength',
    goal: 'mobility',
    page: 1,
  });
  expect(result.items.some((x) => x.user_id === coach)).toBe(true);
  expect(JSON.stringify(result)).not.toContain('object_key');
  expect(JSON.stringify(result)).not.toContain('phone');
  const detail = await practice.detail(coach);
  expect(detail.services.length).toBe(2);
});
it('affiliation expiry hides offerings from coach detail, prices, filters and the commerce catalog', async () => {
  await rows(
    db,
    sql`UPDATE branch_coaches SET ends_on=current_date-1 WHERE coach_id=${coach}`,
  );
  try {
    expect((await practice.detail(coach)).services).toHaveLength(0);
    const input = {
      search: 'Coach',
      city: 'Tehran',
      specialty: 'strength',
      goal: 'mobility',
      page: 1,
    };
    expect((await practice.search(input)).items[0].from_price_minor).toBeNull();
    expect(
      (await practice.search({ ...input, maxPrice: '999999999' })).items,
    ).toHaveLength(0);
    expect(
      (await commerce.catalog()).some(
        (x) => x.id === service || x.id === otherService,
      ),
    ).toBe(false);
  } finally {
    await rows(
      db,
      sql`UPDATE branch_coaches SET ends_on=NULL WHERE coach_id=${coach}`,
    );
  }
});
it('unknown and known invitation targets return identical shapes without unaccepted identity', async () => {
  const known = (
    await rows<{ phone: string }>(
      db,
      sql`SELECT phone FROM users WHERE id=${stranger}`,
    )
  )[0];
  const results = await Promise.all([
    coaching.invite(coach, known.phone),
    coaching.invite(coach, '+989000009999'),
  ]);
  expect(Object.keys(results[0]).sort()).toEqual(
    Object.keys(results[1]).sort(),
  );
  const d = await coaching.dashboard(coach, 1);
  for (const x of d.items.filter((x) => x.status === 'pending')) {
    expect(x.counterpartName).toBeNull();
    expect(x.studentId).toBeNull();
  }
});
it('repeated concurrent invites keep one relationship and a third account cannot answer', async () => {
  const phone = (
    await rows<{ phone: string }>(
      db,
      sql`SELECT phone FROM users WHERE id=${student}`,
    )
  )[0].phone;
  const [a, b] = await Promise.all([
    coaching.invite(coach, phone),
    coaching.invite(coach, phone),
  ]);
  expect(a.id).toBe(b.id);
  await expect(coaching.answer(stranger, relation, 'end', 1)).rejects.toThrow();
});
it('assessment consent and ownership are enforced at the transactional interface', async () => {
  await records.myReviews(student);
  const input = assessmentSchema.parse({
    goals: 'mobility',
    level: 'beginner',
    equipment: 'mat',
    limitations: 'optional synthetic limitation',
    shared: false,
    revision: 0,
  });
  await practice.assessment(student, relation, input);
  expect((await practice.assessment(coach, relation)).limitations).toBe('');
  await expect(
    practice.assessment(coach, relation, {
      ...input,
      shared: true,
      revision: 1,
    }),
  ).rejects.toThrow();
  await practice.assessment(student, relation, {
    ...input,
    shared: true,
    revision: 1,
  });
  expect((await practice.assessment(coach, relation)).limitations).toContain(
    'synthetic',
  );
});
it('global coach claim rejects overlap and travel gaps across two organizations', async () => {
  const first = await commerce.schedule(coach, service, {
    startAt: future(2),
    endAt: future(2, 60),
    capacity: 1,
  });
  occurrence = first.id;
  await expect(
    commerce.schedule(owner2, otherService, {
      startAt: future(2, 55),
      endAt: future(2, 115),
      capacity: 1,
    }),
  ).rejects.toThrow();
  await expect(
    commerce.schedule(owner2, otherService, {
      startAt: future(2, 65),
      endAt: future(2, 125),
      capacity: 1,
    }),
  ).rejects.toThrow();
});
it('blocks cannot overwrite booked coach time; missing availability and private capacity fail', async () => {
  await expect(
    practice.availability(coach, {
      kind: 'blocked',
      startsAt: future(2),
      endsAt: future(2, 60),
    }),
  ).rejects.toThrow();
  await practice.availability(coach, {
    kind: 'blocked',
    startsAt: future(4),
    endsAt: future(4, 60),
  });
  await expect(
    commerce.schedule(coach, service, {
      startAt: future(4),
      endAt: future(4, 60),
      capacity: 1,
    }),
  ).rejects.toThrow();
  await expect(
    commerce.schedule(coach, service, {
      startAt: future(35),
      endAt: future(35, 60),
      capacity: 1,
    }),
  ).rejects.toThrow();
  await expect(
    commerce.schedule(coach, service, {
      startAt: future(5),
      endAt: future(5, 60),
      capacity: 2,
    }),
  ).rejects.toThrow();
});
it('unrelated athletes cannot buy coaching without an active relationship', async () => {
  await expect(
    commerce.checkout(stranger, {
      serviceId: service,
      occurrenceId: occurrence,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
});
it('paid private request stays pending until the assigned coach approves; attendance is shared', async () => {
  const order = await commerce.checkout(student, {
    serviceId: service,
    occurrenceId: occurrence,
    idempotencyKey: randomUUID(),
  });
  await commerce.startPayment(student, order.id, 'success', randomUUID());
  await commerce.verifyPayment(student, order.id);
  const booking = (await commerce.bookings(student)).find(
    (x) => x.occurrence_id === occurrence,
  )!;
  reservation = String(booking.id);
  expect(booking.status).toBe('pending_approval');
  await expect(
    operations.approve(
      stranger,
      reservation,
      Number(booking.revision),
      true,
      'Unauthorized attempt',
    ),
  ).rejects.toThrow();
  await operations.approve(
    coach,
    reservation,
    Number(booking.revision),
    true,
    'Coach accepted request',
  );
  await operations.manualAttendance(
    coach,
    reservation,
    true,
    'Session completed in isolated test',
  );
  expect((await commerce.booking(student, reservation)).status).toBe(
    'completed',
  );
});
it('session notes and revocable progress examples stay attached to a verified session', async () => {
  await records.note(coach, reservation, {
    note: 'Synthetic session note',
    followUp: 'Follow up',
    shared: true,
    revision: 0,
  });
  expect((await records.note(student, reservation)).note).toContain(
    'Synthetic',
  );
  await expect(records.note(stranger, reservation)).rejects.toThrow();
  const review = coachReviewSchema.parse({
    rating: 5,
    body: 'Synthetic verified experience',
    published: true,
    example: 'Synthetic example',
    exampleConsent: true,
    revision: 0,
  });
  await records.review(student, reservation, review);
  expect(
    (await practice.detail(coach)).reviews.some(
      (x) => x.example === 'Synthetic example',
    ),
  ).toBe(true);
  await records.review(student, reservation, {
    ...review,
    exampleConsent: false,
    revision: 1,
  });
  expect(
    (await practice.detail(coach)).reviews.every((x) => x.example === ''),
  ).toBe(true);
});
it('coach responses, duplicate reports and reasoned moderation keep their history and cannot be republished around a hide', async () => {
  const review = (await records.myReviews(student))[0],
    id = String(review.id);
  await expect(
    records.reply(stranger, id, { body: 'Unrelated response', revision: 0 }),
  ).rejects.toThrow();
  await records.reply(coach, id, {
    body: 'Synthetic coach response',
    revision: 0,
  });
  await expect(
    records.reply(coach, id, { body: 'Stale response', revision: 0 }),
  ).rejects.toThrow();
  expect((await practice.detail(coach)).reviews[0].reply).toBe(
    'Synthetic coach response',
  );
  await expect(
    records.report(student, id, { reason: 'Own review report' }),
  ).rejects.toThrow();
  const report = await records.report(stranger, id, {
    reason: 'Synthetic moderation request',
  });
  expect(
    (
      await records.report(stranger, id, {
        reason: 'Synthetic moderation request',
      })
    ).id,
  ).toBe(report.id);
  const otherReport = await records.report(coach, id, {
    reason: 'Second independent report',
  });
  await records.resolveReview(owner, String(report.id), {
    hidden: true,
    reason: 'Synthetic reasoned decision',
    revision: 1,
  });
  await expect(
    records.resolveReview(owner, String(otherReport.id), {
      hidden: false,
      reason: 'Stale decision from another report',
      revision: 1,
    }),
  ).rejects.toThrow();
  expect((await practice.detail(coach)).reviews).toHaveLength(0);
  await records.review(
    student,
    reservation,
    coachReviewSchema.parse({
      rating: 5,
      body: 'Edited student review',
      published: true,
      revision: 2,
    }),
  );
  expect((await practice.detail(coach)).reviews).toHaveLength(0);
  await expect(
    records.resolveReview(owner, String(report.id), {
      hidden: false,
      reason: 'Stale resolution',
      revision: 1,
    }),
  ).rejects.toThrow();
  await records.resolveReview(owner, String(report.id), {
    hidden: false,
    reason: 'Restored after review',
    revision: 2,
  });
  expect((await practice.detail(coach)).reviews).toHaveLength(1);
  expect(
    (await records.reviewReports()).find((x) => x.id === report.id)?.decisions,
  ).toHaveLength(2);
});
it('contracts retain versions and manual income/payment repeats do not double count', async () => {
  const input = contractSchema.parse({
    organizationId: org,
    branchId: branch,
    coachId: coach,
    startsOn: '2026-01-01',
    endsOn: null,
    shareBasisPoints: 5000,
    basis: 'gross',
    costsMinor: '0',
    terms: 'Synthetic versioned contract for isolated acceptance.',
  });
  const first = await records.contract(owner, input),
    second = await records.contract(owner, {
      ...input,
      shareBasisPoints: 6000,
    });
  expect(Number(second.version)).toBe(Number(first.version) + 1);
  const entry = ledgerSchema.parse({
    contractId: first.id,
    kind: 'income',
    amountMinor: '5000',
    reservationId: reservation,
    reference: 'Synthetic completed-session income',
    confirmed: true,
    idempotencyKey: randomUUID(),
  });
  const [a, b] = await Promise.all([
    records.ledger(owner, entry),
    records.ledger(owner, entry),
  ]);
  expect(a.id).toBe(b.id);
  await expect(
    records.ledger(owner2, { ...entry, idempotencyKey: randomUUID() }),
  ).rejects.toThrow();
  const finance = await records.finance(coach);
  expect(finance.contracts.length).toBe(2);
  expect(finance.ledger.length).toBe(1);
});
it('semi-private capacity and coach-specific packages reuse the commerce entitlement locks', async () => {
  const semi = (await practice.createOffering(
    owner,
    offeringSchema.parse({
      service: {
        organizationId: org,
        branchId: branch,
        title: 'Semi-private package acceptance',
        kind: 'class',
        amountMinor: '0',
        coachUserId: coach,
        policy,
      },
      mode: 'semi_private',
      entryAmountMinor: '0',
      idempotencyKey: randomUUID(),
    }),
  )) as { id: string };
  const first = await commerce.schedule(coach, semi.id, {
    startAt: future(8),
    endAt: future(8, 60),
    capacity: 2,
  });
  const second = await commerce.schedule(coach, semi.id, {
    startAt: future(8, 120),
    endAt: future(8, 180),
    capacity: 2,
  });
  const pack = (await practice.createOffering(
    owner,
    offeringSchema.parse({
      service: {
        organizationId: org,
        branchId: branch,
        title: 'Single-right coach package',
        kind: 'membership',
        sessionCount: 1,
        durationDays: 30,
        amountMinor: '0',
        coachUserId: coach,
        policy,
      },
      mode: 'private',
      entryAmountMinor: '0',
      idempotencyKey: randomUUID(),
    }),
  )) as { id: string };
  const purchased = await commerce.checkout(student, {
    serviceId: pack.id,
    idempotencyKey: randomUUID(),
  });
  const membership = (await commerce.memberships(student)).find(
    (m) => m.order_id === purchased.id,
  )!;
  const attempt = await Promise.allSettled(
    [first, second].map((o) =>
      commerce.checkout(student, {
        serviceId: semi.id,
        occurrenceId: o.id,
        membershipId: String(membership.id),
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  expect(attempt.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
  expect(attempt.filter((x) => x.status === 'rejected')).toHaveLength(1);
  const winner = attempt.find(
    (x) => x.status === 'fulfilled',
  ) as PromiseFulfilledResult<Awaited<ReturnType<CommerceService['checkout']>>>;
  const booking = (await commerce.bookings(student)).find(
    (r) => r.order_id === winner.value.id,
  )!;
  await operations.manualAttendance(
    coach,
    String(booking.id),
    true,
    'Package attendance acceptance',
  );
  await operations.manualAttendance(
    coach,
    String(booking.id),
    true,
    'Idempotent package attendance',
  );
  expect(
    (await commerce.memberships(student)).find(
      (item) => item.id === membership.id,
    )?.consumed,
  ).toBe(1);
});
it('simultaneous schedule writes across branches permit exactly one coach claim', async () => {
  const results = await Promise.allSettled([
    commerce.schedule(coach, service, {
      startAt: future(10),
      endAt: future(10, 60),
      capacity: 1,
    }),
    commerce.schedule(owner2, otherService, {
      startAt: future(10),
      endAt: future(10, 60),
      capacity: 1,
    }),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
});
it('ending collaboration cuts private records and new sales while retaining financial history', async () => {
  const row = (await coaching.dashboard(student, 1)).items.find(
    (x) => x.id === relation,
  )!;
  await coaching.answer(student, relation, 'end', row.revision);
  await expect(practice.assessment(coach, relation)).rejects.toThrow();
  await expect(records.note(coach, reservation)).rejects.toThrow();
  expect((await records.finance(coach)).ledger.length).toBe(1);
  await expect(
    commerce.checkout(student, {
      serviceId: service,
      occurrenceId: occurrence,
      idempotencyKey: randomUUID(),
    }),
  ).rejects.toThrow();
});

it('expired invitations cannot be accepted and invite attempts are bounded', async () => {
  await rows(
    db,
    sql`UPDATE coaching_relationships SET status='pending',expires_at=now()-interval '1 second',updated_at=now() WHERE id=${relation}`,
  );
  const row = (await coaching.dashboard(student, 1)).items.find(
    (x) => x.id === relation,
  )!;
  await expect(
    coaching.answer(student, relation, 'accept', row.revision),
  ).rejects.toThrow();
  await rows(
    db,
    sql`INSERT INTO coaching_invite_attempts(coach_id) SELECT ${coach}::uuid FROM generate_series(1,20)`,
  );
  await expect(coaching.invite(coach, '+989000009998')).rejects.toMatchObject({
    status: 429,
  });
});
