import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomInt, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { HouseholdBillingService } from '../src/modules/commerce/household-billing.service';
import * as hb from '../src/modules/commerce/household-billing.contracts';
import { trainingRelationship } from '../src/modules/training/training.service';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseService } from '../src/database/database.service';
import {
  validateEnvironment,
  type Environment,
} from '../src/config/environment';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { SamanMockPaymentAdapter } from '../src/modules/commerce/sandbox-payment';
import { SportsOperationsService } from '../src/modules/commerce/operations.service';
import { SportsWorkflowsService } from '../src/modules/commerce/workflows.service';
import {
  serviceSchema,
  checkoutSchema,
  type ServiceInput,
} from '../src/modules/commerce/commerce.contracts';
import * as c from '../src/modules/commerce/workflows.contracts';
const url = process.env.MULTISPORT_TEST_DATABASE_URL;
if (
  !url ||
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith('_multisport_test')
)
  throw new Error('An isolated local _multisport_test database is required');
const config = new ConfigService<Environment, true>(
  validateEnvironment({
    DATABASE_URL: url,
    NODE_ENV: 'test',
    AUTH_SECRET: 'isolated-multisport-tests-no-real-payments',
  }),
);
const database = new DatabaseService(config),
  db = database.db,
  commerce = new CommerceService(database, new SamanMockPaymentAdapter(config));
const operations = new SportsOperationsService(
  database,
  commerce,
  undefined!,
  undefined!,
);
const workflow = new SportsWorkflowsService(database, commerce, operations);
const household = new HouseholdBillingService(database, commerce, workflow);
const policy = {
  cancellationHours: 0,
  lateRefundBasisPoints: 10000,
  noShowConsumesSession: false,
  consumeOn: 'attendance',
  freezeDays: 7,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms: 'Synthetic local test terms only.',
};
const participants = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    name: `Synthetic guest ${i + 1}`,
    birthDate: '1990-01-01',
    gender: 'male',
  }));
async function person() {
  const [u] = await rows<{ id: string; phone: string }>(
    db,
    sql`INSERT INTO users(phone,display_name,profile_public) VALUES(${`+989${randomInt(100000000, 999999999)}`},'Synthetic athlete',true) RETURNING id,phone`,
  );
  return u;
}
async function fixture() {
  const owner = await person(),
    athlete = await person(),
    other = await person(),
    reception = await person(),
    accountant = await person();
  const [org] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO organizations(name,slug,status) VALUES('Synthetic multisport center',${randomUUID()},'approved') RETURNING id`,
  );
  const [branch] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO branches(organization_id,name,slug) VALUES(${org.id},'Synthetic branch',${randomUUID()}) RETURNING id`,
  );
  for (const [u, role] of [
    [owner, 'owner'],
    [reception, 'receptionist'],
    [accountant, 'accountant'],
  ] as const)
    await db.execute(
      sql`INSERT INTO organization_members(organization_id,user_id,role,all_branches) VALUES(${org.id},${u.id},${role},true)`,
    );
  await db.execute(
    sql`INSERT INTO clubs(id,owner_id,publication_status) VALUES(${org.id},${owner.id},'published')`,
  );
  await db.execute(
    sql`INSERT INTO branch_profiles(club_id,branch_id) VALUES(${org.id},${branch.id})`,
  );
  return { owner, athlete, other, reception, accountant, org, branch };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function sport(name: string) {
  const [s] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sports(name,slug) VALUES(${name},${`synthetic-${name}`}) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
  );
  return s.id;
}
async function service(
  f: Fixture,
  kind: ServiceInput['kind'],
  extra: Record<string, unknown> = {},
) {
  const resourceIds =
    kind === 'court'
      ? [
          (
            await commerce.createResource(
              f.owner.id,
              f.org.id,
              f.branch.id,
              'Synthetic pitch',
              [],
              randomUUID(),
            )
          ).id,
        ]
      : [];
  const s = await commerce.createService(
    f.owner.id,
    serviceSchema.parse({
      organizationId: f.org.id,
      branchId: f.branch.id,
      title: `Synthetic ${kind}`,
      kind,
      amountMinor: '100000',
      durationDays: kind === 'membership' ? 30 : null,
      sessionCount: kind === 'membership' ? 10 : null,
      resourceIds,
      policy,
      ...extra,
    }),
  );
  await commerce.publish(f.owner.id, s.id, 1);
  return commerce.detail(s.id);
}
async function session(f: Fixture, serviceId: string, capacity = 3, days = 1) {
  return commerce.schedule(f.owner.id, serviceId, {
    startAt: new Date(Date.now() + days * 86400000).toISOString(),
    endAt: new Date(Date.now() + days * 86400000 + 3600000).toISOString(),
    capacity,
  });
}
async function buy(
  f: Fixture,
  serviceId: string,
  occurrenceId?: string,
  extra: Record<string, unknown> = {},
) {
  const o = await commerce.checkout(
    f.athlete.id,
    checkoutSchema.parse({
      serviceId,
      occurrenceId,
      idempotencyKey: randomUUID(),
      ...extra,
    }),
  );
  await commerce.captureCash(f.owner.id, o.id, 'Synthetic test payment');
  return commerce.myOrder(f.athlete.id, o.id);
}
async function coach(f: Fixture) {
  const u = await person();
  await db.execute(sql`INSERT INTO coach_profiles(user_id) VALUES(${u.id})`);
  await db.execute(
    sql`INSERT INTO coaching_practices(user_id,review_status,review_expires_at,published) VALUES(${u.id},'approved',now()+interval '1 year',true)`,
  );
  await db.execute(
    sql`INSERT INTO branch_coaches(branch_id,coach_id,status) VALUES(${f.branch.id},${u.id},'active')`,
  );
  const [relationship] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO coaching_relationships(coach_id,student_id,status) VALUES(${u.id},${f.athlete.id},'active') RETURNING id`,
  );
  return { ...u, relationship };
}
before(async () => {
  await database.onModuleInit();
  await migrate(db, { migrationsFolder: resolve('database/migrations') });
});
after(() => database.onApplicationShutdown());

void test('football, swimming and karate keep independent sports and service formats', async () => {
  const f = await fixture(),
    football = await sport('football'),
    swimming = await sport('swimming'),
    karate = await sport('karate');
  const pitch = await service(f, 'court', { sportId: football }),
    footballClass = await service(f, 'class', { sportId: football });
  await service(f, 'access', { sportId: swimming });
  await service(f, 'class', { sportId: swimming });
  await service(f, 'course', { sportId: karate });
  assert.equal(pitch.kind, 'court');
  assert.equal(footballClass.kind, 'class');
  const found = await commerce.catalog('', undefined, f.org.id, {
    sportId: football,
    kind: 'class',
  });
  assert.deepEqual(
    found.map((s) => s.id),
    [footballClass.id],
  );
  const formats = await workflow.sports();
  assert.ok(formats.some((s) => s.id === football));
});
void test('party tickets count people under concurrent capacity allocation', async () => {
  const f = await fixture(),
    s = await service(f, 'access'),
    o = await session(f, s.id, 3);
  const results = await Promise.allSettled(
    [f.athlete, f.other].map((u) =>
      commerce.checkout(
        u.id,
        checkoutSchema.parse({
          serviceId: s.id,
          occurrenceId: o.id,
          quantity: 2,
          participants: participants(2),
          idempotencyKey: randomUUID(),
        }),
      ),
    ),
  );
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await commerce.detail(s.id)).occurrences[0].remaining, 1);
  const won = results.find((r) => r.status === 'fulfilled');
  assert.equal(won?.status === 'fulfilled' && won.value.amount_minor, '200000');
});
void test('quotes bind ticket quantity and participant details', async () => {
  const f = await fixture(),
    s = await service(f, 'access'),
    o = await session(f, s.id, 5);
  const data = {
    serviceId: s.id,
    occurrenceId: o.id,
    quantity: 2,
    participants: participants(2),
  };
  const quote = await commerce.quote(
    f.athlete.id,
    checkoutSchema.parse({ ...data, idempotencyKey: randomUUID() }),
  );
  assert.equal(quote.amountMinor, '200000');
  await assert.rejects(() =>
    commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        ...data,
        quantity: 1,
        participants: participants(1),
        quoteId: quote.id,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  const order = await commerce.checkout(
    f.athlete.id,
    checkoutSchema.parse({
      ...data,
      quoteId: quote.id,
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(order.amount_minor, '200000');
});
void test('age, audience and service quantity rules apply before capacity or payment', async () => {
  const f = await fixture(),
    s = await service(f, 'class', {
      offering: { audience: 'women' },
      eligibility: { minimumAge: 18, maximumAge: 70, prerequisites: [] },
    }),
    o = await session(f, s.id);
  await assert.rejects(() =>
    commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        participants: participants(1),
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  await assert.rejects(() =>
    commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        quantity: 2,
        participants: participants(2),
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  await assert.rejects(() =>
    commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        participants: [
          {
            name: 'Synthetic child',
            birthDate: '2020-01-01',
            gender: 'female',
          },
        ],
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  assert.equal((await commerce.detail(s.id)).occurrences[0].remaining, 3);
});
void test('membership benefits deny unrelated services and allow explicitly included classes', async () => {
  const f = await fixture(),
    a = await service(f, 'class'),
    b = await service(f, 'class'),
    oa = await session(f, a.id),
    ob = await session(f, b.id);
  const m = await service(f, 'membership', {
    offering: { includedServiceIds: [a.id], entryAllowed: false },
  });
  await buy(f, m.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  await assert.rejects(() =>
    commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: b.id,
        occurrenceId: ob.id,
        membershipId: membership.id,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  const allowed = await commerce.checkout(
    f.athlete.id,
    checkoutSchema.parse({
      serviceId: a.id,
      occurrenceId: oa.id,
      membershipId: membership.id,
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(allowed.status, 'paid');
  assert.equal(allowed.amount_minor, '0');
  await assert.rejects(() =>
    commerce.ticket(f.athlete.id, String(membership.id), true),
  );
});
void test('early renewal preserves the old period and rejects a second concurrent renewal order', async () => {
  const f = await fixture(),
    s = await service(f, 'membership');
  await buy(f, s.id);
  const [old] = await commerce.memberships(f.athlete.id);
  const input = checkoutSchema.parse({
    serviceId: s.id,
    renewMembershipId: old.id,
    idempotencyKey: randomUUID(),
  });
  const order = await commerce.checkout(f.athlete.id, input);
  await assert.rejects(() =>
    commerce.checkout(f.athlete.id, { ...input, idempotencyKey: randomUUID() }),
  );
  await commerce.captureCash(f.owner.id, order.id, 'Synthetic renewal');
  const list = await commerce.memberships(f.athlete.id),
    renewed = list.find((m) => m.renewed_from_id === old.id)!;
  assert.equal(
    (renewed.starts_at as Date).getTime(),
    (old.ends_at as Date).getTime(),
  );
  assert.equal(
    (renewed.ends_at as Date).getTime() - (renewed.starts_at as Date).getTime(),
    30 * 86400000,
  );
  await assert.rejects(() =>
    commerce.ticket(f.athlete.id, String(renewed.id), true),
  );
});
void test('reception can enroll a new athlete and partial POS receipts cannot issue full credit', async () => {
  const f = await fixture(),
    s = await service(f, 'membership'),
    customer = await person();
  const sale = await workflow.receptionSale(
    f.reception.id,
    c.receptionSaleSchema.parse({
      customer: { phone: customer.phone, name: 'Synthetic walk-in' },
      purchase: { serviceId: s.id, idempotencyKey: randomUUID() },
    }),
  );
  const receipt = await workflow.submitReceipt(
    f.reception.id,
    c.receiptSchema.parse({
      orderId: sale.id,
      method: 'pos',
      amountMinor: '40000',
      reference: randomUUID(),
      idempotencyKey: randomUUID(),
    }),
    true,
  );
  await workflow.decideReceipt(
    f.reception.id,
    receipt.id,
    c.receiptDecisionSchema.parse({
      approved: true,
      revision: 1,
      reason: 'Synthetic POS checked',
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(
    (await commerce.myOrder(customer.id, sale.id)).status,
    'partially_paid',
  );
  assert.equal((await commerce.memberships(customer.id)).length, 0);
  const next = await workflow.submitReceipt(
    f.owner.id,
    c.receiptSchema.parse({
      orderId: sale.id,
      method: 'cash',
      amountMinor: '60000',
      reference: randomUUID(),
      idempotencyKey: randomUUID(),
    }),
    true,
  );
  const decision = c.receiptDecisionSchema.parse({
    approved: true,
    revision: 1,
    reason: 'Synthetic cash checked',
    idempotencyKey: randomUUID(),
  });
  await workflow.decideReceipt(f.owner.id, next.id, decision);
  await workflow.decideReceipt(f.owner.id, next.id, decision);
  assert.equal((await commerce.myOrder(customer.id, sale.id)).status, 'paid');
  assert.equal((await commerce.memberships(customer.id)).length, 1);
  const paid = await rows(
    db,
    sql`SELECT id FROM sport_payments WHERE order_id=${sale.id} AND state='verified'`,
  );
  assert.equal(paid.length, 2);
});
void test('bank-transfer receipts need authorized review and cannot overpay', async () => {
  const f = await fixture(),
    s = await service(f, 'membership'),
    o = await commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({ serviceId: s.id, idempotencyKey: randomUUID() }),
    );
  const receipt = await workflow.submitReceipt(
    f.athlete.id,
    c.receiptSchema.parse({
      orderId: o.id,
      method: 'bank_transfer',
      amountMinor: '100000',
      reference: randomUUID(),
      idempotencyKey: randomUUID(),
    }),
    false,
  );
  const input = c.receiptDecisionSchema.parse({
    approved: true,
    revision: 1,
    reason: 'Synthetic bank statement checked',
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(() =>
    workflow.decideReceipt(f.reception.id, receipt.id, input),
  );
  await assert.rejects(() =>
    workflow.decideReceipt(f.other.id, receipt.id, input),
  );
  await workflow.decideReceipt(f.accountant.id, receipt.id, input);
  assert.equal((await commerce.myOrder(f.athlete.id, o.id)).status, 'paid');
  await assert.rejects(() =>
    workflow.submitReceipt(
      f.athlete.id,
      c.receiptSchema.parse({
        orderId: o.id,
        method: 'bank_transfer',
        amountMinor: '1',
        reference: randomUUID(),
        idempotencyKey: randomUUID(),
      }),
      false,
    ),
  );
});
void test('class entry does not complete attendance or consume a coaching session', async () => {
  const f = await fixture(),
    s = await service(f, 'class'),
    o = await session(f, s.id, 3, 0.01);
  const order = await buy(f, s.id, o.id),
    r = order.reservations[0];
  const ticket = await commerce.ticket(f.athlete.id, String(r.id));
  const visit = await commerce.checkIn(f.reception.id, ticket.token);
  await commerce.checkIn(f.reception.id, ticket.token);
  const [reservation] = await rows<{
    status: string;
    checked_in_at: Date | null;
  }>(
    db,
    sql`SELECT status,checked_in_at FROM sport_reservations WHERE id=${r.id}`,
  );
  assert.equal(reservation.status, 'confirmed');
  assert.ok(reservation.checked_in_at);
  const attendance = await rows(
    db,
    sql`SELECT id FROM sport_attendance WHERE reservation_id=${r.id}`,
  );
  assert.equal(attendance.length, 0);
  const manual = await workflow.entry(
    f.reception.id,
    c.manualEntrySchema.parse({
      organizationId: f.org.id,
      branchId: f.branch.id,
      reservationId: r.id,
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(manual.id, visit.id);
});
void test('each party ticket admits once and only the final pass completes the booking', async () => {
  const f = await fixture(),
    s = await service(f, 'access'),
    o = await session(f, s.id, 3, 0.01),
    order = await buy(f, s.id, o.id, {
      quantity: 3,
      participants: participants(3),
    }),
    r = order.reservations[0];
  const passes = await commerce.entryPasses(f.athlete.id, String(r.id));
  assert.equal(passes.length, 3);
  for (let i = 0; i < 3; i++) {
    const ticket = await commerce.ticket(
      f.athlete.id,
      String(r.id),
      false,
      String(passes[i].id),
    );
    await commerce.checkIn(f.reception.id, ticket.token);
    await commerce.checkIn(f.reception.id, ticket.token);
    const [current] = await rows<{ status: string; admitted_count: number }>(
      db,
      sql`SELECT status,admitted_count FROM sport_reservations WHERE id=${r.id}`,
    );
    assert.equal(current.admitted_count, i + 1);
    assert.equal(current.status, i === 2 ? 'completed' : 'confirmed');
  }
  assert.equal((await commerce.detail(s.id)).occurrences[0].remaining, 0);
  const visits = await rows(
    db,
    sql`SELECT id FROM sport_visits WHERE reservation_id=${r.id}`,
  );
  assert.equal(visits.length, 3);
});
void test('manual membership entry works without a phone and enforces a daily limit', async () => {
  const f = await fixture(),
    s = await service(f, 'membership', {
      offering: { entryAllowed: true, entryLimitPerDay: 1 },
    });
  await buy(f, s.id);
  const [m] = await commerce.memberships(f.athlete.id);
  const request = c.manualEntrySchema.parse({
    organizationId: f.org.id,
    branchId: f.branch.id,
    membershipId: m.id,
    idempotencyKey: randomUUID(),
  });
  const entry = await workflow.entry(f.reception.id, request);
  await workflow.entry(f.reception.id, request);
  await commerce.exitVisit(f.reception.id, String(entry.id), 'Synthetic exit');
  await assert.rejects(() =>
    workflow.entry(f.reception.id, {
      ...request,
      idempotencyKey: randomUUID(),
    }),
  );
  const found = await workflow.customers(
    f.reception.id,
    { organizationId: f.org.id, branchId: f.branch.id },
    f.athlete.phone,
  );
  assert.equal(found.length, 1);
  await assert.rejects(() =>
    workflow.customers(
      f.other.id,
      { organizationId: f.org.id, branchId: f.branch.id },
      f.athlete.phone,
    ),
  );
});
void test('class rollcall is atomic, revision controlled and restricted to authorized staff', async () => {
  const f = await fixture(),
    s = await service(f, 'class'),
    o = await session(f, s.id);
  const a = await buy(f, s.id, o.id);
  const other = await commerce.checkout(
    f.other.id,
    checkoutSchema.parse({
      serviceId: s.id,
      occurrenceId: o.id,
      idempotencyKey: randomUUID(),
    }),
  );
  await commerce.captureCash(f.owner.id, other.id, 'Synthetic second student');
  const roster = await workflow.roster(f.owner.id, o.id);
  assert.equal(roster.length, 2);
  const input = c.rollcallSchema.parse({
    changes: roster.map((r) => ({
      reservationId: r.id,
      revision: r.revision,
      present: true,
    })),
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(() => workflow.rollcall(f.other.id, o.id, input));
  await assert.rejects(() =>
    workflow.rollcall(f.owner.id, o.id, {
      ...input,
      changes: input.changes.map((r, i) =>
        i ? { ...r, revision: r.revision + 1 } : r,
      ),
    }),
  );
  assert.equal(
    (await commerce.myOrder(f.athlete.id, a.id)).reservations[0].status,
    'confirmed',
  );
  await workflow.rollcall(f.owner.id, o.id, input);
  await workflow.rollcall(f.owner.id, o.id, input);
  assert.ok(
    (await workflow.roster(f.owner.id, o.id)).every(
      (r) => r.status === 'completed',
    ),
  );
});
void test('fixed series enrollment holds every class credit in one transaction', async () => {
  const f = await fixture(),
    s = await service(f, 'class');
  const series = await commerce.scheduleSeries(f.owner.id, s.id, {
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 90000000).toISOString(),
    capacity: 3,
    count: 3,
    intervalDays: 7,
    revision: 2,
    idempotencyKey: randomUUID(),
  });
  const m = await service(f, 'membership', {
    offering: { includedServiceIds: [s.id], entryAllowed: false },
  });
  await buy(f, m.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  const input = c.seriesEnrollmentSchema.parse({
    serviceId: s.id,
    seriesId: series.id,
    membershipId: membership.id,
    idempotencyKey: randomUUID(),
  });
  const result = await workflow.enrollSeries(f.athlete.id, input);
  assert.equal(result.orderIds.length, 3);
  await workflow.enrollSeries(f.athlete.id, input);
  assert.equal((await commerce.memberships(f.athlete.id))[0].held, 3);
});
void test('makeup restores a consumed absence and moves one seat without charging twice', async () => {
  const f = await fixture(),
    s = await service(f, 'class'),
    o = await session(f, s.id),
    target = await session(f, s.id, 3, 2),
    m = await service(f, 'membership', {
      offering: { includedServiceIds: [s.id] },
      policy: { ...policy, noShowConsumesSession: true },
    });
  await buy(f, m.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  const order = await commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        membershipId: membership.id,
        idempotencyKey: randomUUID(),
      }),
    ),
    r = order.reservations[0];
  // Absence consumption follows the purchased class policy, not the membership policy.
  await db.execute(
    sql`UPDATE sport_orders SET snapshot=jsonb_set(snapshot,'{policy,noShowConsumesSession}','true'::jsonb) WHERE id=${order.id}`,
  );
  await operations.manualAttendance(
    f.owner.id,
    String(r.id),
    false,
    'Synthetic excused absence',
  );
  const [changed] = await rows<{ revision: number }>(
    db,
    sql`SELECT revision FROM sport_reservations WHERE id=${r.id}`,
  );
  await workflow.makeup(
    f.owner.id,
    String(r.id),
    c.makeupSchema.parse({
      targetOccurrenceId: target.id,
      revision: changed.revision,
      reason: 'Synthetic approved makeup',
      idempotencyKey: randomUUID(),
    }),
  );
  const current = (await commerce.memberships(f.athlete.id))[0];
  assert.equal(current.consumed, 0);
  assert.equal(current.held, 1);
  assert.equal(
    (await commerce.myOrder(f.athlete.id, order.id)).reservations[0]
      .occurrence_id,
    target.id,
  );
});
void test('venue coordination blocks payment until staff approves the requested slot', async () => {
  const f = await fixture(),
    s = await service(f, 'class', {
      offering: { confirmation: 'before_payment' },
    }),
    o = await session(f, s.id),
    order = await commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        idempotencyKey: randomUUID(),
      }),
    );
  assert.equal(order.reservations[0].status, 'pending_approval');
  await assert.rejects(() =>
    commerce.startPayment(f.athlete.id, order.id, 'success', randomUUID()),
  );
  await operations.approve(
    f.owner.id,
    String(order.reservations[0].id),
    Number(order.reservations[0].revision),
    true,
    'Synthetic slot confirmation',
  );
  const attempt = await commerce.startPayment(
    f.athlete.id,
    order.id,
    'success',
    randomUUID(),
  );
  assert.ok(attempt.id);
});
void test('independent coach programs have a paid intake and controlled delivery lifecycle', async () => {
  const f = await fixture(),
    trainer = await coach(f),
    sportId = await sport('karate');
  const offer = await workflow.createCoachProgram(
    trainer.id,
    c.coachProgramSchema.parse({
      title: 'Synthetic karate preparation',
      sportId,
      amountMinor: '100000',
      deliveryDays: 2,
      supportDays: 14,
      terms: 'Synthetic program terms for this test.',
      idempotencyKey: randomUUID(),
    }),
  );
  await assert.rejects(
    () =>
      commerce.schedule(trainer.id, offer.id, {
        startAt: new Date(Date.now() + 86400000).toISOString(),
        endAt: new Date(Date.now() + 90000000).toISOString(),
        capacity: 1,
      }),
    /Practice.invalidService/,
  );
  const order = await commerce.checkout(
    f.athlete.id,
    checkoutSchema.parse({ serviceId: offer.id, idempotencyKey: randomUUID() }),
  );
  const [shop] = await rows<{ organization_id: string; branch_id: string }>(
    db,
    sql`SELECT * FROM coach_program_shops WHERE coach_id=${trainer.id}`,
  );
  await commerce.captureCash(
    trainer.id,
    order.id,
    'Synthetic independent program payment',
  );
  assert.equal(
    (await commerce.myOrder(f.athlete.id, order.id)).reservations.length,
    0,
  );
  const [request] = await workflow.programs(f.athlete.id);
  assert.equal(request.status, 'intake');
  await assert.rejects(() =>
    workflow.intake(
      f.other.id,
      String(request.id),
      c.programIntakeSchema.parse({
        revision: 1,
        goals: 'Synthetic goals',
        experience: '',
        limitations: '',
        location: '',
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  await workflow.intake(
    f.athlete.id,
    String(request.id),
    c.programIntakeSchema.parse({
      revision: 1,
      goals: 'Synthetic goals',
      experience: 'beginner',
      limitations: 'none',
      location: 'home',
      idempotencyKey: randomUUID(),
    }),
  );
  const queue = await workflow.programs(trainer.id, true);
  assert.equal(queue[0].status, 'queued');
  await workflow.updateProgram(
    trainer.id,
    String(request.id),
    c.programUpdateSchema.parse({
      revision: 2,
      status: 'preparing',
      idempotencyKey: randomUUID(),
    }),
  );
  await assert.rejects(() =>
    workflow.updateProgram(
      trainer.id,
      String(request.id),
      c.programUpdateSchema.parse({
        revision: 3,
        status: 'delivered',
        assignmentId: randomUUID(),
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  const [plan] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO training_plans(owner_id,athlete_id,relationship_id,title,draft) VALUES(${trainer.id},${f.athlete.id},${trainer.relationship.id},'Synthetic karate plan','{}'::jsonb) RETURNING id`,
  );
  const [version] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO training_versions(plan_id,version,content,effective_from) VALUES(${plan.id},1,'{}'::jsonb,current_date) RETURNING id`,
  );
  const [assignment] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO training_assignments(version_id,athlete_id,relationship_id) VALUES(${version.id},${f.athlete.id},${trainer.relationship.id}) RETURNING id`,
  );
  await workflow.updateProgram(
    trainer.id,
    String(request.id),
    c.programUpdateSchema.parse({
      revision: 3,
      status: 'delivered',
      assignmentId: assignment.id,
      idempotencyKey: randomUUID(),
    }),
  );
  const [delivered] = await workflow.programs(f.athlete.id);
  assert.equal(delivered.status, 'delivered');
  assert.ok(delivered.support_ends_at);
  await workflow.reviseProgram(
    f.athlete.id,
    String(request.id),
    c.programRevisionSchema.parse({
      revision: 4,
      reason: 'Synthetic correction request',
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(
    (await workflow.programs(trainer.id, true))[0].status,
    'revision_requested',
  );
  const [club] = await rows<{ publication_status: string }>(
    db,
    sql`SELECT publication_status FROM clubs WHERE id=${shop.organization_id}`,
  );
  assert.equal(club.publication_status, 'draft');
});

void test('legacy membership benefits require an explicit scoped staff correction and retain sold versions', async () => {
  const f = await fixture(),
    target = await service(f, 'class'),
    o = await session(f, target.id),
    m = await service(f, 'membership');
  await buy(f, m.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  const purchase = checkoutSchema.parse({
    serviceId: target.id,
    occurrenceId: o.id,
    membershipId: membership.id,
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(() => commerce.checkout(f.athlete.id, purchase));
  const edit = c.membershipBenefitsSchema.parse({
    revision: membership.revision,
    serviceIds: [target.id],
    entryAllowed: false,
    reason: 'Synthetic review of existing package',
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(() =>
    workflow.membershipBenefits(f.reception.id, String(membership.id), edit),
  );
  await workflow.membershipBenefits(f.owner.id, String(membership.id), edit);
  assert.equal(
    (await commerce.checkout(f.athlete.id, purchase)).status,
    'paid',
  );
  await assert.rejects(() =>
    commerce.ticket(f.athlete.id, String(membership.id), true),
  );
  const original = await commerce.detail(m.id);
  assert.deepEqual(original.offering.includedServiceIds, []);
});

void test('personal membership credit cannot purchase companion tickets', async () => {
  const f = await fixture(),
    s = await service(f, 'access'),
    o = await session(f, s.id);
  const m = await service(f, 'membership', {
    offering: { includedServiceIds: [s.id] },
  });
  await buy(f, m.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  const input = checkoutSchema.parse({
    serviceId: s.id,
    occurrenceId: o.id,
    membershipId: membership.id,
    quantity: 2,
    participants: participants(2),
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(
    () => commerce.quote(f.athlete.id, input),
    /Workflow.personalMembershipOnly/,
  );
  await assert.rejects(
    () => commerce.checkout(f.athlete.id, input),
    /Workflow.personalMembershipOnly/,
  );
  assert.equal((await commerce.detail(s.id)).occurrences[0].remaining, 3);
});
void test('prepayment coordination requires a scheduled format', async () => {
  const f = await fixture();
  await assert.rejects(
    () =>
      service(f, 'membership', {
        offering: { confirmation: 'before_payment' },
      }),
    /Workflow.coordinationNeedsSession/,
  );
});
void test('a partly admitted ticket party finishes without marking admitted athletes absent', async () => {
  const f = await fixture(),
    s = await service(f, 'access'),
    o = await session(f, s.id, 3, 0.01);
  const order = await buy(f, s.id, o.id, {
      quantity: 3,
      participants: participants(3),
    }),
    r = order.reservations[0];
  const [pass] = await commerce.entryPasses(f.athlete.id, String(r.id));
  const ticket = await commerce.ticket(
    f.athlete.id,
    String(r.id),
    false,
    String(pass.id),
  );
  await commerce.checkIn(f.reception.id, ticket.token);
  await db.execute(
    sql`UPDATE sport_occurrences SET start_at=now()-interval '2 hours',end_at=now()-interval '1 hour' WHERE id=${o.id}`,
  );
  await commerce.runJobs();
  const [current] = await rows<{ status: string; admitted_count: number }>(
    db,
    sql`SELECT status,admitted_count FROM sport_reservations WHERE id=${r.id}`,
  );
  assert.equal(current.status, 'completed');
  assert.equal(current.admitted_count, 1);
  const attendance = await rows(
    db,
    sql`SELECT id FROM sport_attendance WHERE reservation_id=${r.id} AND status='absent'`,
  );
  assert.equal(attendance.length, 0);
});

void test('offline returns wait for scoped real repayment, with one settlement under retries', async () => {
  const f = await fixture(),
    s = await service(f, 'access'),
    o = await session(f, s.id),
    order = await buy(f, s.id, o.id);
  await db.transaction((tx) =>
    commerce.cancelHostedOrder(tx, order.id, 'Synthetic refund'),
  );
  await commerce.runJobs();
  const [refund] = await rows<{ id: string; state: string }>(
    db,
    sql`SELECT id,state FROM sport_refunds WHERE order_id=${order.id}`,
  );
  assert.equal(refund.state, 'requested');
  const input = c.refundSettlementSchema.parse({
    method: 'bank_transfer',
    reference: 'SYNTHETIC-RETURN-1',
    returnedOn: new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    reason: 'Synthetic local repayment',
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(() =>
    workflow.settleRefund(f.reception.id, refund.id, input),
  );
  await workflow.settleRefund(f.accountant.id, refund.id, input);
  await workflow.settleRefund(f.accountant.id, refund.id, input);
  await assert.rejects(() =>
    workflow.settleRefund(f.owner.id, refund.id, {
      ...input,
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(
    (await commerce.myOrder(f.athlete.id, order.id)).status,
    'refunded',
  );
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT * FROM sport_refund_settlements WHERE refund_id=${refund.id}`,
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT * FROM sport_journals WHERE source_key=${`refund:${refund.id}`}`,
      )
    ).length,
    1,
  );
});
void test('a partial bank refund enters the accountant queue and settles without an unsupported reversal', async () => {
  const f = await fixture(),
    s = await service(f, 'access', {
      policy: { ...policy, cancellationHours: 48, lateRefundBasisPoints: 5000 },
    }),
    o = await session(f, s.id),
    order = await buy(f, s.id, o.id);
  await db.execute(
    sql`UPDATE sport_payments SET provider='saman_sandbox',bank_reference=${`SYNTHETIC-${randomUUID()}`} WHERE order_id=${order.id}`,
  );
  const r = order.reservations[0];
  const preview = await commerce.cancelPreview(f.athlete.id, String(r.id));
  assert.equal(preview.refundMinor, '50000');
  await commerce.cancel(
    f.athlete.id,
    String(r.id),
    preview.revision,
    preview.refundMinor,
  );
  await commerce.runJobs();
  const [refund] = await rows<{ id: string; state: string }>(
    db,
    sql`SELECT id,state FROM sport_refunds WHERE order_id=${order.id}`,
  );
  assert.equal(refund.state, 'requested');
  const queue = await workflow.refunds(f.accountant.id, {
    organizationId: f.org.id,
    branchId: f.branch.id,
  });
  assert.ok(queue.some((item) => item.id === refund.id));
  await workflow.settleRefund(
    f.accountant.id,
    refund.id,
    c.refundSettlementSchema.parse({
      method: 'bank_transfer',
      reference: 'SYNTHETIC-PARTIAL-RETURN',
      returnedOn: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tehran',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
      reason: 'Synthetic partial repayment',
      idempotencyKey: randomUUID(),
    }),
  );
  const current = await commerce.myOrder(f.athlete.id, order.id);
  assert.equal(current.refunded_minor, '50000');
  assert.equal(current.status, 'partially_refunded');
  await commerce.runJobs();
  assert.equal(
    (await commerce.myOrder(f.athlete.id, order.id)).refunded_minor,
    '50000',
  );
});
void test('a course series is purchased once and only its selected cohort is enrolled', async () => {
  const f = await fixture(),
    s = await service(f, 'course');
  const series = await commerce.scheduleSeries(f.owner.id, s.id, {
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 90000000).toISOString(),
    capacity: 3,
    count: 3,
    intervalDays: 7,
    revision: 2,
    idempotencyKey: randomUUID(),
  });
  const otherSeries = await commerce.scheduleSeries(f.owner.id, s.id, {
    startAt: new Date(Date.now() + 172800000).toISOString(),
    endAt: new Date(Date.now() + 176400000).toISOString(),
    capacity: 3,
    count: 2,
    intervalDays: 7,
    revision: 2,
    idempotencyKey: randomUUID(),
  });
  const m = await service(f, 'membership', {
    offering: { includedServiceIds: [s.id] },
  });
  await buy(f, m.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  const result = await workflow.enrollSeries(
    f.athlete.id,
    c.seriesEnrollmentSchema.parse({
      serviceId: s.id,
      seriesId: series.id,
      membershipId: membership.id,
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal(result.orderIds.length, 1);
  assert.equal(
    (await commerce.myOrder(f.athlete.id, result.orderIds[0])).reservations
      .length,
    3,
  );
  assert.equal((await commerce.memberships(f.athlete.id))[0].held, 3);
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT r.id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id WHERE o.series_id=${otherSeries.id} AND r.user_id=${f.athlete.id}`,
      )
    ).length,
    0,
  );
});
void test('ending a relationship between checkout and payment preserves paid program delivery, without reopening other coaching access', async () => {
  const f = await fixture(),
    trainer = await coach(f),
    s = await service(f, 'program', { coachUserId: trainer.id });
  const order = await commerce.checkout(
    f.athlete.id,
    checkoutSchema.parse({ serviceId: s.id, idempotencyKey: randomUUID() }),
  );
  await db.execute(
    sql`UPDATE coaching_relationships SET status='ended' WHERE id=${trainer.relationship.id}`,
  );
  await commerce.captureCash(
    f.owner.id,
    order.id,
    'Synthetic payment after relationship ended',
  );
  const [request] = await workflow.programs(f.athlete.id);
  assert.ok(request);
  assert.equal(request.relationship_id, trainer.relationship.id);
  await workflow.intake(
    f.athlete.id,
    String(request.id),
    c.programIntakeSchema.parse({
      revision: 1,
      goals: 'Synthetic goals',
      experience: 'beginner',
      limitations: 'none',
      location: 'home',
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal((await workflow.programs(trainer.id, true)).length, 1);
  await trainingRelationship(
    db,
    trainer.id,
    trainer.relationship.id,
    true,
    true,
  );
  await assert.rejects(() =>
    trainingRelationship(db, trainer.id, trainer.relationship.id, true),
  );
  await db.transaction((tx) =>
    commerce.cancelHostedOrder(tx, order.id, 'Synthetic cancellation'),
  );
  await assert.rejects(() =>
    trainingRelationship(db, trainer.id, trainer.relationship.id, true, true),
  );
});
void test('publishing a new sport service updates branch and club discovery taxonomy atomically', async () => {
  const f = await fixture(),
    sportId = await sport('tennis');
  await service(f, 'class', { sportId });
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT * FROM branch_sports WHERE branch_id=${f.branch.id} AND sport_id=${sportId}`,
      )
    ).length,
    1,
  );
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT * FROM club_sport_links WHERE club_id=${f.org.id} AND sport_id=${sportId}`,
      )
    ).length,
    1,
  );
});

async function child(guardian: string, name = 'Synthetic child') {
  return household.dependent(
    guardian,
    hb.dependentInput.parse({
      name,
      birthDate: '2014-05-15',
      gender: 'male',
      guardianAcknowledged: true,
      idempotencyKey: randomUUID(),
    }),
  );
}
void test('guardians can enroll siblings in the same class but cannot use each other’s or adult credit', async () => {
  const f = await fixture(),
    a = await child(f.athlete.id, 'Synthetic child one'),
    b = await child(f.athlete.id, 'Synthetic child two'),
    s = await service(f, 'class'),
    o = await session(f, s.id);
  const m = await service(f, 'membership', {
    offering: {
      includedServiceIds: [s.id],
      entryAllowed: true,
      entryLimitPerDay: 1,
    },
  });
  await buy(f, m.id, undefined, { dependentId: a.id });
  await buy(f, m.id, undefined, { dependentId: b.id });
  const memberships = await commerce.memberships(f.athlete.id),
    ma = memberships.find((x) => x.dependent_id === a.id)!,
    mb = memberships.find((x) => x.dependent_id === b.id)!;
  await assert.rejects(() =>
    commerce.checkout(
      f.other.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        dependentId: a.id,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  await assert.rejects(() =>
    commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        membershipId: ma.id,
        dependentId: b.id,
        idempotencyKey: randomUUID(),
      }),
    ),
  );
  for (const [d, membership] of [
    [a, ma],
    [b, mb],
  ])
    await commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({
        serviceId: s.id,
        occurrenceId: o.id,
        membershipId: membership.id,
        dependentId: d.id,
        idempotencyKey: randomUUID(),
      }),
    );
  const roster = await workflow.roster(f.owner.id, o.id);
  assert.equal(roster.length, 2);
  assert.deepEqual(roster.map((x) => x.display_name).sort(), [
    'Synthetic child one',
    'Synthetic child two',
  ]);
  const va = await workflow.entry(
    f.reception.id,
    c.manualEntrySchema.parse({
      organizationId: f.org.id,
      branchId: f.branch.id,
      membershipId: ma.id,
      idempotencyKey: randomUUID(),
    }),
  );
  const vb = await workflow.entry(
    f.reception.id,
    c.manualEntrySchema.parse({
      organizationId: f.org.id,
      branchId: f.branch.id,
      membershipId: mb.id,
      idempotencyKey: randomUUID(),
    }),
  );
  assert.notEqual(va.id, vb.id);
  await assert.rejects(() =>
    household.dependent(
      f.other.id,
      hb.dependentInput.parse({
        name: 'Foreign edit',
        birthDate: '2014-05-15',
        gender: 'male',
        guardianAcknowledged: true,
        idempotencyKey: randomUUID(),
      }),
      String(a.id),
      1,
    ),
  );
});
void test('dependent edits invalidate an earlier quote and receipts retain the purchased identity', async () => {
  const f = await fixture(),
    d = await child(f.athlete.id),
    s = await service(f, 'access'),
    o = await session(f, s.id);
  const input = checkoutSchema.parse({
    serviceId: s.id,
    occurrenceId: o.id,
    dependentId: d.id,
    idempotencyKey: randomUUID(),
  });
  const quote = await commerce.quote(f.athlete.id, input);
  await household.dependent(
    f.athlete.id,
    hb.dependentInput.parse({
      name: 'Synthetic renamed child',
      birthDate: '2014-05-15',
      gender: 'male',
      guardianAcknowledged: true,
      idempotencyKey: randomUUID(),
    }),
    String(d.id),
    1,
  );
  await assert.rejects(
    () => commerce.checkout(f.athlete.id, { ...input, quoteId: quote.id }),
    /Quote changed/,
  );
  const order = await buy(f, s.id, o.id, { dependentId: d.id });
  assert.equal(
    order.snapshot.participants?.[0].name,
    'Synthetic renamed child',
  );
});
void test('installments charge one due amount, suspend overdue credit and restore it only after verified settlement', async () => {
  const f = await fixture(),
    m = await service(f, 'membership'),
    order = await commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({ serviceId: m.id, idempotencyKey: randomUUID() }),
    );
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  await household.createInstallments(
    f.owner.id,
    order.id,
    hb.installmentPlanInput.parse({
      activation: 'after_first',
      graceDays: 0,
      installments: [
        { dueOn: today, amountMinor: '50000' },
        {
          dueOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          amountMinor: '50000',
        },
      ],
      reason: 'Synthetic tuition plan',
      idempotencyKey: randomUUID(),
    }),
  );
  let view = await commerce.myOrder(f.athlete.id, order.id);
  assert.equal(view.nextPaymentMinor, '50000');
  const first = await commerce.startPayment(
    f.athlete.id,
    order.id,
    'success',
    randomUUID(),
  );
  const [payment] = await rows<{ amount_minor: string }>(
    db,
    sql`SELECT amount_minor::text FROM sport_payments WHERE id=${first.id}`,
  );
  assert.equal(payment.amount_minor, '50000');
  await commerce.verifyPayment(f.athlete.id, order.id);
  const [membership] = await commerce.memberships(f.athlete.id);
  assert.ok(membership);
  assert.equal(
    (await commerce.myOrder(f.athlete.id, order.id)).status,
    'partially_paid',
  );
  const ticket = await commerce.ticket(
    f.athlete.id,
    String(membership.id),
    true,
  );
  await db.execute(
    sql`UPDATE sport_installments SET due_on=due_on-8 WHERE plan_id IN(SELECT id FROM sport_installment_plans WHERE order_id=${order.id})`,
  );
  await assert.rejects(
    () => commerce.ticket(f.athlete.id, String(membership.id), true),
    /Closure.installmentOverdue/,
  );
  await assert.rejects(
    () => commerce.checkIn(f.reception.id, ticket.token),
    /Closure.installmentOverdue/,
  );
  await commerce.runJobs();
  await commerce.runJobs();
  const notices = await rows(
    db,
    sql`SELECT id FROM sport_notifications WHERE user_id=${f.athlete.id} AND title='Closure.installmentOverdue'`,
  );
  assert.equal(notices.length, 1);
  await commerce.startPayment(f.athlete.id, order.id, 'success', randomUUID());
  await commerce.verifyPayment(f.athlete.id, order.id);
  view = await commerce.myOrder(f.athlete.id, order.id);
  assert.equal(view.status, 'paid');
  assert.equal(view.nextPaymentMinor, '0');
  assert.equal(
    (await household.installments(f.athlete.id, order.id)).every(
      (d) => d.remaining_minor === '0',
    ),
    true,
  );
  assert.equal((await commerce.memberships(f.athlete.id)).length, 1);
  await commerce.ticket(f.athlete.id, String(membership.id), true);
});
void test('installment schedules are exact and scoped; full-payment activation never issues premature credit', async () => {
  const f = await fixture(),
    m = await service(f, 'membership'),
    order = await commerce.checkout(
      f.athlete.id,
      checkoutSchema.parse({ serviceId: m.id, idempotencyKey: randomUUID() }),
    );
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    second = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const input = hb.installmentPlanInput.parse({
    activation: 'after_full',
    graceDays: 2,
    installments: [
      { dueOn: date, amountMinor: '50000' },
      { dueOn: second, amountMinor: '50000' },
    ],
    reason: 'Synthetic plan',
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(() =>
    household.createInstallments(f.reception.id, order.id, input),
  );
  await assert.rejects(() =>
    household.createInstallments(f.owner.id, order.id, {
      ...input,
      installments: [
        { dueOn: date, amountMinor: '1' },
        { dueOn: second, amountMinor: '1' },
      ],
    }),
  );
  await household.createInstallments(f.owner.id, order.id, input);
  await commerce.startPayment(f.athlete.id, order.id, 'success', randomUUID());
  await commerce.verifyPayment(f.athlete.id, order.id);
  assert.equal((await commerce.memberships(f.athlete.id)).length, 0);
  await assert.rejects(() => household.installments(f.other.id, order.id));
});
void test('legacy classification versions preserve sold metadata and benefit review is explicit', async () => {
  const f = await fixture(),
    s = await service(f, 'class'),
    sp = await sport('legacy sport');
  const before = await commerce.detail(s.id);
  await household.classifySport(
    f.owner.id,
    s.id,
    hb.legacySportInput.parse({
      sportId: sp,
      revision: 2,
      reason: 'Synthetic classification',
      idempotencyKey: randomUUID(),
    }),
  );
  assert.equal((await commerce.detail(s.id)).sport_id, sp);
  const [old] = await rows<{ sport_id: string | null }>(
    db,
    sql`SELECT sport_id FROM sport_service_versions WHERE id=${before.version_id}`,
  );
  assert.equal(old.sport_id, null);
  assert.equal(
    (
      await household.readiness(f.owner.id, {
        organizationId: f.org.id,
        branchId: f.branch.id,
      })
    ).services.length,
    0,
  );
});
