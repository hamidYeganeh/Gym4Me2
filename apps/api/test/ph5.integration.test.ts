import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseService } from '../src/database/database.service';
import {
  validateEnvironment,
  type Environment,
} from '../src/config/environment';
import { AdvancedBusinessService } from '../src/modules/advanced-business/ph5.service';
import {
  assertBranchCapacity,
  effectivePrice,
} from '../src/modules/advanced-business/ph5.access';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { SamanMockPaymentAdapter } from '../src/modules/commerce/sandbox-payment';
import * as s from '../src/database/schema';
const url =
  process.env.PH5_TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_ph5_test';
if (
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith('_ph5_test')
)
  throw new Error('Requires an isolated local _ph5_test database');
const env = validateEnvironment({
  DATABASE_URL: url,
  NODE_ENV: 'test',
  DB_POOL_MAX: 6,
  DB_STATEMENT_TIMEOUT_MS: 15000,
});
const dbConfig = new ConfigService<Environment, true>(env),
  database = new DatabaseService(dbConfig),
  db = database.db;
const config = new ConfigService<Environment, true>({
  ...env,
  DEMO_MODE: true,
});
const service = new AdvancedBusinessService(database, config),
  commerce = new CommerceService(
    database,
    new SamanMockPaymentAdapter(dbConfig),
  );
const key = () => randomUUID();
const reason = 'Isolated PH5 acceptance test';
const policy = {
  cancellationHours: 0,
  lateRefundBasisPoints: 10000,
  noShowConsumesSession: false,
  consumeOn: 'attendance',
  freezeDays: 0,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms: 'Isolated PH5 policy',
};
before(async () => {
  await database.onModuleInit();
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
});
after(async () => {
  await database.onApplicationShutdown();
});
async function person() {
  const [u] = await db
    .insert(s.users)
    .values({
      phone: `+989${randomInt(100000000, 999999999)}`,
      displayName: 'PH5 test',
      phoneVerifiedAt: new Date(),
    })
    .returning();
  return u.id;
}
async function fixture() {
  const owner = await person(),
    coach = await person(),
    athlete = await person(),
    stranger = await person();
  const [org] = await db
    .insert(s.organizations)
    .values({ name: 'PH5 isolated', slug: key(), status: 'approved' })
    .returning();
  await db
    .insert(s.organizationMembers)
    .values({ organizationId: org.id, userId: owner, role: 'owner' });
  await db
    .insert(s.clubs)
    .values({ id: org.id, ownerId: owner, publicationStatus: 'published' });
  const bs = await db
    .insert(s.branches)
    .values([
      { organizationId: org.id, name: 'First', slug: 'first' },
      { organizationId: org.id, name: 'Second', slug: 'second' },
    ])
    .returning();
  for (const b of bs)
    await db
      .insert(s.branchProfiles)
      .values({ branchId: b.id, clubId: org.id });
  await db.execute(
    sql`INSERT INTO business_subscriptions(organization_id,plan_code,terms_snapshot) VALUES(${org.id},'pro','{}'::jsonb)`,
  );
  const [contract] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO coaching_contracts(organization_id,branch_id,coach_id,version,starts_on,share_basis_points,basis,costs_minor,terms,created_by) VALUES(${org.id},${bs[0].id},${coach},1,'2020-01-01',5000,'gross',0,'PH5 terms',${owner}) RETURNING id`,
  );
  return {
    owner,
    coach,
    athlete,
    stranger,
    org: org.id,
    branch: bs[0].id,
    other: bs[1].id,
    contract: contract.id,
  };
}
type F = Awaited<ReturnType<typeof fixture>>;
async function sports(
  f: F,
  branch = f.branch,
  coach: string | null = f.coach,
  kind = 'class',
  future = false,
) {
  const [ss] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_services(organization_id,branch_id,title,kind,status) VALUES(${f.org},${branch},'PH5 service',${kind},'draft') RETURNING id`,
  );
  const [v] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_service_versions(service_id,version,title,amount_minor,description,policy,coach_user_id,session_count) VALUES(${ss.id},1,'PH5 service',1000,'',${JSON.stringify(policy)}::jsonb,${coach},${kind === 'membership' ? 1 : null}) RETURNING id`,
  );
  await db.execute(
    sql`UPDATE sport_services SET status='published',published_version_id=${v.id} WHERE id=${ss.id}`,
  );
  const [o] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_occurrences(service_id,version_id,start_at,end_at,capacity) VALUES(${ss.id},${v.id},${future ? sql`now()+interval '10 days'` : sql`'2026-01-15T08:00Z'::timestamptz`},${future ? sql`now()+interval '10 days 1 hour'` : sql`'2026-01-15T09:00Z'::timestamptz`},10) RETURNING id`,
  );
  return { service: ss.id, version: v.id, occurrence: o.id };
}
async function completed(f: F) {
  const ss = await sports(f);
  const [ord] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,status,idempotency_key,request_hash,expires_at) VALUES(${f.athlete},${f.org},${ss.service},${ss.version},1000,${JSON.stringify({ branchId: f.branch })}::jsonb,'paid',${key()},'test',now()) RETURNING id`,
  );
  const [r] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_reservations(user_id,occurrence_id,order_id,status,expires_at) VALUES(${f.athlete},${ss.occurrence},${ord.id},'completed',now()) RETURNING id`,
  );
  return { order: ord.id, reservation: r.id, ...ss };
}
async function rule(
  f: F,
  mode: 'percentage' | 'per_session' | 'fixed' = 'percentage',
) {
  await service.rule(f.owner, {
    idempotencyKey: key(),
    contractId: f.contract,
    mode,
    amountMinor: mode === 'fixed' ? '30000' : '600',
    discountPayer: 'shared',
    spaceMinor: '0',
    platformBps: 0,
    reason,
  });
}
async function close(f: F) {
  return (await service.close(f.owner, {
    idempotencyKey: key(),
    organizationId: f.org,
    branchId: f.branch,
    coachId: f.coach,
    from: '2026-01-01',
    to: '2026-01-31',
  })) as { id: string; revision: number };
}
async function report(f: F) {
  return service.overview(f.owner, 'business', { organizationId: f.org });
}
void test('PH5 tenant, branch and coach financial reads are scoped', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  await close(f);
  await assert.rejects(() =>
    service.overview(f.stranger, 'business', { organizationId: f.org }),
  );
  const own = await service.overview(f.coach, 'coach', {
    organizationId: f.org,
  });
  assert.equal(own.statements.length, 1);
  assert.equal(own.contracts.length, 0);
  const foreign = await service.overview(f.stranger, 'coach', {
    organizationId: f.org,
  });
  assert.equal(foreign.earnings.length, 0);
  const manager = await person();
  const [m] = await db
    .insert(s.organizationMembers)
    .values({
      organizationId: f.org,
      userId: manager,
      role: 'manager',
      allBranches: false,
    })
    .returning();
  await db
    .insert(s.organizationMemberBranches)
    .values({ organizationId: f.org, memberId: m.id, branchId: f.branch });
  await assert.rejects(() =>
    service.overview(manager, 'business', { organizationId: f.org }),
  );
  await assert.rejects(() =>
    service.overview(manager, 'business', {
      organizationId: f.org,
      branchId: f.other,
    }),
  );
  assert.equal(
    (
      await service.overview(manager, 'business', {
        organizationId: f.org,
        branchId: f.branch,
      })
    ).statements.length,
    1,
  );
});
void test('PH5 period snapshots are immutable, idempotent and cannot overlap', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  const input = {
    idempotencyKey: key(),
    organizationId: f.org,
    branchId: f.branch,
    coachId: f.coach,
    from: '2026-01-01',
    to: '2026-01-31',
  };
  const first = (await service.close(f.owner, input)) as { id: string };
  const second = (await service.close(f.owner, input)) as { id: string };
  assert.equal(first.id, second.id);
  const result = await report(f);
  assert.equal(result.earnings.length, 1);
  assert.equal(result.earnings[0].amount_minor, '500');
  await assert.rejects(() =>
    service.close(f.owner, {
      ...input,
      idempotencyKey: key(),
      from: '2026-01-20',
      to: '2026-02-10',
    }),
  );
  await assert.rejects(() =>
    service.rule(f.owner, {
      idempotencyKey: key(),
      contractId: f.contract,
      mode: 'percentage',
      amountMinor: '0',
      discountPayer: 'shared',
      spaceMinor: '1',
      platformBps: 0,
      reason,
    }),
  );
});
void test('PH5 unknown payouts block a second payment until reconciliation', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  const st = await close(f);
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  const pay = {
    revision: 2,
    idempotencyKey: key(),
    reference: 'ph5-' + key(),
    method: 'mock' as const,
    outcome: 'unknown' as const,
    reason,
  };
  const p = (await service.payout(f.owner, st.id, pay)) as { id: string };
  assert.deepEqual(await service.payout(f.owner, st.id, pay), p);
  await assert.rejects(() =>
    service.payout(f.owner, st.id, {
      ...pay,
      idempotencyKey: key(),
      reference: 'ph5-' + key(),
      revision: 3,
    }),
  );
  await service.reconcile(f.owner, p.id, {
    outcome: 'succeeded',
    idempotencyKey: key(),
    reason,
  });
  const r = await report(f);
  assert.equal(r.statements[0].paid_minor, '500');
  assert.equal(r.statements[0].status, 'paid');
});
void test('PH5 simultaneous payout commands produce exactly one successful effect', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  const st = await close(f);
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  const result = await Promise.allSettled(
    [1, 2].map(() =>
      service.payout(f.owner, st.id, {
        revision: 2,
        idempotencyKey: key(),
        reference: 'ph5-' + key(),
        method: 'mock',
        outcome: 'succeeded',
        reason,
      }),
    ),
  );
  assert.equal(result.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal((await report(f)).statements[0].paid_minor, '500');
});
void test('PH5 post-payment disputes append an adjustment and retain the paid receipt', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  const st = await close(f);
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  await service.payout(f.owner, st.id, {
    revision: 2,
    idempotencyKey: key(),
    reference: 'ph5-' + key(),
    method: 'mock',
    outcome: 'succeeded',
    reason,
  });
  const e = (await report(f)).earnings[0];
  const d = (await service.dispute(f.coach, 'coach', {
    idempotencyKey: key(),
    earningId: String(e.id),
    reason,
  })) as { id: string };
  await service.resolve(f.owner, 'business', d.id, {
    revision: 1,
    idempotencyKey: key(),
    amountMinor: '-100',
    reason,
  });
  const r = await report(f);
  assert.equal(r.payouts[0].amount_minor, '500');
  assert.equal(r.statements[0].adjusted_minor, '-100');
  assert.equal(r.disputes[0].state, 'resolved');
});
void test('PH5 source refunds create stable compensating entries before approval', async () => {
  const f = await fixture();
  await rule(f);
  const source = await completed(f);
  const st = await close(f);
  await db.execute(
    sql`UPDATE sport_orders SET refunded_minor=200,status='partially_refunded' WHERE id=${source.order}`,
  );
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  const r = await report(f);
  assert.equal(r.statements[0].adjusted_minor, '-100');
});
void test('PH5 fixed 30-day fees are prorated once for a closed interval', async () => {
  const f = await fixture();
  await rule(f, 'fixed');
  const st = await close(f);
  const r = await report(f);
  assert.equal(r.earnings[0].amount_minor, '31000');
  assert.equal(r.earnings[0].statement_id, st.id);
});
void test('PH5 downgrade restricts new advanced work but preserves prior approved payouts', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  const st = await close(f);
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  await service.selectPlan(f.owner, {
    idempotencyKey: key(),
    organizationId: f.org,
    plan: 'basic',
    revision: 1,
    catalogRevision: 1,
    outcome: 'succeeded',
    acceptTerms: true,
    months: 1,
    reason,
  });
  await assert.rejects(() =>
    db.transaction((tx) => assertBranchCapacity(tx, f.org)),
  );
  await assert.rejects(() =>
    service.close(f.owner, {
      idempotencyKey: key(),
      organizationId: f.org,
      branchId: f.branch,
      coachId: f.coach,
      from: '2026-02-01',
      to: '2026-02-28',
    }),
  );
  await service.payout(f.owner, st.id, {
    revision: 2,
    idempotencyKey: key(),
    reference: 'ph5-' + key(),
    method: 'mock',
    outcome: 'succeeded',
    reason,
  });
  assert.equal((await report(f)).statements[0].status, 'paid');
});
void test('PH5 price exceptions affect new versions without changing the previous version', async () => {
  const f = await fixture();
  const ss = await sports(f);
  await service.price(f.owner, {
    idempotencyKey: key(),
    organizationId: f.org,
    kind: 'class',
    amountMinor: '2000',
    revision: 0,
    reason,
  });
  await service.price(f.owner, {
    idempotencyKey: key(),
    organizationId: f.org,
    branchId: f.other,
    kind: 'class',
    amountMinor: '3000',
    revision: 0,
    reason,
  });
  assert.equal(
    await db.transaction((tx) =>
      effectivePrice(tx, f.org, f.branch, 'class', '1'),
    ),
    '2000',
  );
  assert.equal(
    await db.transaction((tx) =>
      effectivePrice(tx, f.org, f.other, 'class', '1'),
    ),
    '3000',
  );
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT amount_minor::text FROM sport_service_versions WHERE id=${ss.version}`,
      )
    )[0].amount_minor,
    '1000',
  );
});
void test('PH5 shared memberships serialize the last session across two branches', async () => {
  const f = await fixture(),
    a = await sports(f, f.branch, null, 'class', true),
    b = await sports(f, f.other, null, 'class', true),
    ms = await sports(f, f.branch, null, 'membership', true);
  const [order] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,status,idempotency_key,request_hash,expires_at) VALUES(${f.athlete},${f.org},${ms.service},${ms.version},101,${JSON.stringify({ branchId: f.branch })}::jsonb,'paid',${key()},'test',now()) RETURNING id`,
  );
  const [m] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_memberships(user_id,service_id,version_id,organization_id,branch_id,status,granted,order_id) VALUES(${f.athlete},${ms.service},${ms.version},${f.org},${f.branch},'active',1,${order.id}) RETURNING id`,
  );
  await service.shared(f.owner, {
    idempotencyKey: key(),
    membershipId: m.id,
    revision: 1,
    services: [a.service, b.service],
    allocations: [
      { branchId: f.branch, basisPoints: 5000 },
      { branchId: f.other, basisPoints: 5000 },
    ],
    reason,
  });
  const outcomes = await Promise.allSettled(
    [a, b].map((ss) =>
      commerce.checkout(f.athlete, {
        serviceId: ss.service,
        occurrenceId: ss.occurrence,
        membershipId: m.id,
        idempotencyKey: key(),
      }),
    ),
  );
  assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
  const allocation = await rows<{ amount: string }>(
    db,
    sql`SELECT sum(amount_minor)::text amount FROM business_allocations WHERE membership_id=${m.id}`,
  );
  assert.equal(allocation[0].amount, '101');
  const r = await report(f);
  assert.equal(r.report?.unique_members, 1);
  assert.equal(
    r.comparison!.reduce((n, b) => n + BigInt(String(b.allocated_minor)), 0n),
    101n,
  );
});
void test('PH5 refunds after a settled payout append corrections through durable jobs', async () => {
  const f = await fixture();
  await rule(f);
  const source = await completed(f);
  const st = await close(f);
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  await service.payout(f.owner, st.id, {
    revision: 2,
    idempotencyKey: key(),
    reference: 'ph5-' + key(),
    method: 'mock',
    outcome: 'succeeded',
    reason,
  });
  await db.execute(
    sql`UPDATE sport_orders SET refunded_minor=200,status='partially_refunded' WHERE id=${source.order}`,
  );
  await service.reconcileDue();
  await service.reconcileDue();
  const r = await report(f);
  assert.equal(r.statements[0].paid_minor, '500');
  assert.equal(r.statements[0].adjusted_minor, '-100');
  assert.equal(r.adjustments.length, 1);
});
void test('PH5 unknown plan activation requires reconciliation and retains accepted limits', async () => {
  const f = await fixture();
  const plan = {
    idempotencyKey: key(),
    organizationId: f.org,
    plan: 'pro' as const,
    revision: 1,
    catalogRevision: 1,
    outcome: 'unknown' as const,
    acceptTerms: true as const,
    months: 1,
    reason,
  };
  const p = (await service.selectPlan(f.owner, plan)) as { reference: string };
  await assert.rejects(() =>
    service.selectPlan(f.owner, {
      ...plan,
      idempotencyKey: key(),
      outcome: 'succeeded',
    }),
  );
  const [pending] = await rows<{ id: string }>(
    db,
    sql`SELECT id FROM business_plan_payments WHERE reference=${p.reference}`,
  );
  await service.reconcilePlan(f.owner, pending.id, {
    idempotencyKey: key(),
    outcome: 'succeeded',
    reason,
  });
  const r = await report(f);
  assert.equal(r.subscription?.advanced_finance, true);
  assert.equal(r.subscription?.revision, 2);
});
void test('PH5 idempotency cannot be reused for a different dispute or statement', async () => {
  const f = await fixture();
  await rule(f);
  await completed(f);
  const st = await close(f),
    idempotencyKey = key();
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey,
    reason,
  });
  await assert.rejects(() =>
    service.approve(f.owner, st.id, {
      revision: 1,
      idempotencyKey,
      reason: 'Different financial reason',
    }),
  );
});
void test('PH5 repeated changes to session outcome remain compensating, never lost', async () => {
  const f = await fixture();
  await rule(f);
  const source = await completed(f);
  await close(f);
  for (const status of ['cancelled', 'completed', 'cancelled']) {
    await db.execute(
      sql`UPDATE sport_reservations SET status=${status},revision=revision+1 WHERE id=${source.reservation}`,
    );
    await service.reconcileDue();
  }
  const r = await report(f);
  assert.equal(r.statements[0].adjusted_minor, '-500');
  assert.equal(r.adjustments.length, 3);
});
void test('PH5 financial totals remain complete when statement lists are paginated', async () => {
  const f = await fixture();
  await db.execute(
    sql`WITH made AS(INSERT INTO business_statements(organization_id,branch_id,coach_id,from_on,to_on,created_by) SELECT ${f.org},${f.branch},${f.coach},'2021-01-01'::date+d,'2021-01-01'::date+d,${f.owner} FROM generate_series(0,100) d RETURNING id) INSERT INTO business_earnings(statement_id,contract_id,source_key,amount_minor,basis_snapshot) SELECT id,${f.contract},'page-test:'||id::text,1,'{}'::jsonb FROM made`,
  );
  const first = await service.overview(f.owner, 'business', {
    organizationId: f.org,
    page: 1,
  });
  const second = await service.overview(f.owner, 'business', {
    organizationId: f.org,
    page: 2,
  });
  assert.equal(first.statements.length, 100);
  assert.equal(first.pages.statements, true);
  assert.equal(second.statements.length, 1);
  assert.equal(second.pages.statements, false);
  assert.equal(first.totals.earned_minor, '101');
  assert.equal(second.totals.earned_minor, '101');
});
void test('PH5 percentage rules never reuse the full price of an unlimited membership per session', async () => {
  const f = await fixture();
  await rule(f);
  const source = await completed(f),
    ms = await sports(f, f.branch, null, 'membership', true);
  const [ord] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,status,idempotency_key,request_hash,expires_at) VALUES(${f.athlete},${f.org},${ms.service},${ms.version},1000,${JSON.stringify({ branchId: f.branch })}::jsonb,'paid',${key()},'test',now()) RETURNING id`,
  );
  const [m] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO sport_memberships(user_id,service_id,version_id,organization_id,branch_id,status,granted,order_id) VALUES(${f.athlete},${ms.service},${ms.version},${f.org},${f.branch},'active',null,${ord.id}) RETURNING id`,
  );
  await db.execute(
    sql`UPDATE sport_orders SET amount_minor=0 WHERE id=${source.order}`,
  );
  await db.execute(
    sql`UPDATE sport_reservations SET membership_id=${m.id} WHERE id=${source.reservation}`,
  );
  await assert.rejects(() => close(f), /PH5.unlimitedBasis/);
});
void test('PH5 a changed source cannot silently pay an amount from a stale approval', async () => {
  const f = await fixture();
  await rule(f);
  const source = await completed(f);
  const st = await close(f);
  await service.approve(f.owner, st.id, {
    revision: 1,
    idempotencyKey: key(),
    reason,
  });
  await db.execute(
    sql`UPDATE sport_orders SET refunded_minor=200,status='partially_refunded' WHERE id=${source.order}`,
  );
  await assert.rejects(() =>
    service.payout(f.owner, st.id, {
      revision: 2,
      idempotencyKey: key(),
      reference: 'ph5-' + key(),
      method: 'mock',
      outcome: 'succeeded',
      reason,
    }),
  );
  await service.reconcileDue();
  const before = await report(f);
  assert.equal(before.statements[0].status, 'draft');
  assert.equal(before.payouts.length, 0);
  const revision = Number(before.statements[0].revision);
  await service.approve(f.owner, st.id, {
    revision,
    idempotencyKey: key(),
    reason,
  });
  await service.payout(f.owner, st.id, {
    revision: revision + 1,
    idempotencyKey: key(),
    reference: 'ph5-' + key(),
    method: 'mock',
    outcome: 'succeeded',
    reason,
  });
  assert.equal((await report(f)).payouts[0].amount_minor, '400');
});
