import 'reflect-metadata';
import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomInt, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseService } from '../src/database/database.service';
import {
  validateEnvironment,
  type Environment,
} from '../src/config/environment';
import { CrmService } from '../src/modules/growth/crm.service';
import {
  rows,
  CommerceService,
} from '../src/modules/commerce/commerce.service';
import { SamanMockPaymentAdapter } from '../src/modules/commerce/sandbox-payment';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import { offerPrice } from '../src/modules/growth/offers';
import { GrowthDiscoveryService } from '../src/modules/growth/discovery.service';
import { NetworkCreditService } from '../src/modules/growth/credit.service';
import * as c from '../src/modules/growth/growth.contracts';
import { AdvancedBusinessService } from '../src/modules/advanced-business/ph5.service';
import { GamesService } from '../src/modules/growth/games.service';
import { NativePushService } from '../src/modules/push/native-push.service';
import {
  NativePushSender,
  type NativeDevice,
} from '../src/modules/push/native-push.sender';
import { NutritionService } from '../src/modules/training/nutrition.service';
import { foodEntry } from '../src/modules/training/nutrition.contracts';
import { deliverSportsNotification } from '../src/modules/commerce/notification-delivery';
import * as schema from '../src/database/schema';
import type { Principal } from '../src/modules/auth/auth.service';
const url = process.env.COMPLETION_TEST_DATABASE_URL;
if (
  !url ||
  !['localhost', '127.0.0.1'].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith('_completion_test')
)
  throw new Error('Isolated local _completion_test database required');
const config = new ConfigService<Environment, true>(
    validateEnvironment({
      DATABASE_URL: url,
      NODE_ENV: 'test',
      AUTH_SECRET: 'isolated-completion-test-secret-not-production',
    }),
  ),
  database = new DatabaseService(config),
  db = database.db,
  crm = new CrmService(database);
const commerce = new CommerceService(
    database,
    new SamanMockPaymentAdapter(config),
  ),
  discovery = new GrowthDiscoveryService(database),
  credits = new NetworkCreditService(database, commerce);
const policy = {
  cancellationHours: 0,
  lateRefundBasisPoints: 10000,
  noShowConsumesSession: false,
  consumeOn: 'attendance',
  freezeDays: 0,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms: 'Synthetic test service conditions.',
};
async function sale(
  kind: 'class' | 'court' = 'class',
  requirements: string[] = [],
) {
  const f = await fixture();
  await db.execute(
    sql`UPDATE organizations SET status='approved' WHERE id=${f.org.id}`,
  );
  await db.execute(
    sql`INSERT INTO clubs(id,owner_id,publication_status) VALUES(${f.org.id},${f.owner.id},'published')`,
  );
  await db.execute(
    sql`INSERT INTO branch_profiles(club_id,branch_id) VALUES(${f.org.id},${f.branch.id})`,
  );
  const resourceIds =
    kind === 'court'
      ? [
          (
            await commerce.createResource(
              f.owner.id,
              f.org.id,
              f.branch.id,
              'Synthetic court',
              [],
              randomUUID(),
            )
          ).id,
        ]
      : [];
  const service = await commerce.createService(
    f.owner.id,
    serviceSchema.parse({
      organizationId: f.org.id,
      branchId: f.branch.id,
      title: 'Synthetic beginner class',
      kind,
      requirements,
      resourceIds,
      level: 'beginner',
      amountMinor: '100000',
      policy,
    }),
  );
  await commerce.publish(f.owner.id, service.id, 1);
  const occurrence = await commerce.schedule(f.owner.id, service.id, {
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 90000000).toISOString(),
    capacity: 3,
  });
  return { ...f, service, occurrence };
}
async function person() {
  const phone = `+989${randomInt(100000000, 999999999)}`;
  const [u] = await rows<{ id: string; phone: string }>(
    db,
    sql`INSERT INTO users(phone,display_name) VALUES(${phone},'Synthetic completion test') RETURNING id,phone`,
  );
  return u;
}
async function fixture() {
  const owner = await person(),
    outsider = await person();
  const [org] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO organizations(name,slug) VALUES('Synthetic gym',${randomUUID()}) RETURNING id`,
  );
  const [branch] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO branches(organization_id,name,slug) VALUES(${org.id},'Synthetic branch',${randomUUID()}) RETURNING id`,
  );
  await db.execute(
    sql`INSERT INTO organization_members(organization_id,user_id,role,all_branches) VALUES(${org.id},${owner.id},'owner',true)`,
  );
  return { owner, outsider, org, branch };
}
before(async () => {
  await database.onModuleInit();
  await migrate(db, { migrationsFolder: resolve('database/migrations') });
});
after(() => database.onApplicationShutdown());
void test('CRM scopes leads to the branch and rechecks access before idempotent replay', async () => {
  const f = await fixture(),
    contact = await person();
  const input = c.lead.parse({
    operationId: randomUUID(),
    organizationId: f.org.id,
    branchId: f.branch.id,
    name: 'Synthetic lead',
    phone: contact.phone,
    stage: 'new',
    note: '',
    followUpAt: null,
  });
  const saved = await crm.createLead(f.owner.id, input);
  assert.deepEqual(await crm.createLead(f.owner.id, input), saved);
  await assert.rejects(() =>
    crm.createLead(f.owner.id, { ...input, operationId: randomUUID() }),
  );
  await assert.rejects(() =>
    crm.overview(
      f.outsider.id,
      c.scope.parse({ organizationId: f.org.id, branchId: f.branch.id }),
    ),
  );
  const other = await fixture();
  await assert.rejects(() =>
    crm.createLead(f.owner.id, {
      ...input,
      operationId: randomUUID(),
      branchId: other.branch.id,
    }),
  );
  await db.execute(
    sql`DELETE FROM organization_members WHERE organization_id=${f.org.id} AND user_id=${f.owner.id}`,
  );
  await assert.rejects(() => crm.createLead(f.owner.id, input));
});
void test('CRM updates are revision controlled, record history and paginate independently', async () => {
  const f = await fixture(),
    contact = await person();
  const saved = await crm.createLead(
    f.owner.id,
    c.lead.parse({
      operationId: randomUUID(),
      organizationId: f.org.id,
      branchId: f.branch.id,
      name: 'Synthetic lead',
      phone: contact.phone,
      stage: 'new',
      note: '',
      followUpAt: null,
    }),
  );
  const edit = c.editLead.parse({
    operationId: randomUUID(),
    revision: 1,
    name: 'Synthetic lead',
    stage: 'trial',
    note: 'Synthetic followup',
    followUpAt: '2026-01-01T10:00:00Z',
  });
  await crm.editLead(f.owner.id, String(saved.id), edit);
  await assert.rejects(() =>
    crm.editLead(f.owner.id, String(saved.id), {
      ...edit,
      operationId: randomUUID(),
    }),
  );
  const data = await crm.overview(
    f.owner.id,
    c.scope.parse({ organizationId: f.org.id, branchId: f.branch.id }),
  );
  assert.equal(data.leads.length, 1);
  assert.equal(data.leads[0].stage, 'trial');
  assert.equal(data.funnel[0].overdue, 1);
  const history = await rows(
    db,
    sql`SELECT id FROM growth_lead_events WHERE lead_id=${saved.id}`,
  );
  assert.equal(history.length, 1);
});
void test('campaigns require a fresh consent-aware audience and do not send twice concurrently', async () => {
  const f = await fixture(),
    yes = await person(),
    no = await person();
  for (const [contact, consent] of [
    [yes, true],
    [no, false],
  ] as const) {
    await db.execute(
      sql`INSERT INTO account_preferences(user_id,marketing_consent) VALUES(${contact.id},${consent})`,
    );
    await crm.createLead(
      f.owner.id,
      c.lead.parse({
        operationId: randomUUID(),
        organizationId: f.org.id,
        branchId: f.branch.id,
        name: 'Synthetic lead',
        phone: contact.phone,
        stage: 'new',
        note: '',
        followUpAt: null,
      }),
    );
  }
  const campaign = await crm.createCampaign(
    f.owner.id,
    c.campaign.parse({
      operationId: randomUUID(),
      organizationId: f.org.id,
      branchId: f.branch.id,
      title: 'Synthetic offer',
      body: 'Synthetic campaign content',
      stage: 'all',
    }),
  );
  const preview = await crm.preview(f.owner.id, String(campaign.id));
  assert.equal(preview.count, 1);
  await db.execute(
    sql`UPDATE account_preferences SET marketing_consent=false WHERE user_id=${yes.id}`,
  );
  await assert.rejects(() =>
    crm.send(f.owner.id, String(campaign.id), {
      operationId: randomUUID(),
      revision: preview.revision,
      audienceHash: preview.audienceHash,
    }),
  );
  await db.execute(
    sql`UPDATE account_preferences SET marketing_consent=true WHERE user_id=${yes.id}`,
  );
  const fresh = await crm.preview(f.owner.id, String(campaign.id)),
    input = {
      operationId: randomUUID(),
      revision: fresh.revision,
      audienceHash: fresh.audienceHash,
    };
  const results = await Promise.all([
    crm.send(f.owner.id, String(campaign.id), input),
    crm.send(f.owner.id, String(campaign.id), input),
  ]);
  assert.deepEqual(results[0], results[1]);
  assert.equal(results[0].delivered, 1);
  const messages = await rows(
    db,
    sql`SELECT user_id FROM sport_notifications WHERE source_key LIKE ${`campaign:${String(campaign.id)}:%`}`,
  );
  assert.deepEqual(
    messages.map((r) => r.user_id),
    [yes.id],
  );
  await assert.rejects(() =>
    crm.send(f.outsider.id, String(campaign.id), {
      ...input,
      operationId: randomUUID(),
    }),
  );
});
void test('a pending deletion account cannot create CRM data', async () => {
  const f = await fixture(),
    contact = await person();
  await db.execute(
    sql`UPDATE users SET deletion_pending=true WHERE id=${f.owner.id}`,
  );
  await assert.rejects(() =>
    crm.createLead(
      f.owner.id,
      c.lead.parse({
        operationId: randomUUID(),
        organizationId: f.org.id,
        branchId: f.branch.id,
        name: 'Synthetic lead',
        phone: contact.phone,
        stage: 'new',
        note: '',
        followUpAt: null,
      }),
    ),
  );
});
void test('offers enforce budget, quote freshness and immutable previous order amounts', async () => {
  const f = await sale(),
    a = await person(),
    b = await person(),
    input = {
      operationId: randomUUID(),
      occurrenceId: f.occurrence.id,
      discountBasisPoints: 2000,
      maxUses: 1,
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      revision: 0,
      active: true,
    };
  await assert.rejects(() => discovery.saveOffer(f.outsider.id, input));
  await discovery.saveOffer(f.owner.id, input);
  const [qa, qb] = await Promise.all([
    commerce.quote(a.id, {
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
    }),
    commerce.quote(b.id, {
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
    }),
  ]);
  assert.equal(qa.amountMinor, '80000');
  const requests = await Promise.allSettled([
    commerce.checkout(a.id, {
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
      quoteId: qa.id,
      idempotencyKey: randomUUID(),
    }),
    commerce.checkout(b.id, {
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
      quoteId: qb.id,
      idempotencyKey: randomUUID(),
    }),
  ]);
  assert.equal(requests.filter((r) => r.status === 'fulfilled').length, 1);
  const [order] = await rows<{ amount_minor: string }>(
    db,
    sql`SELECT amount_minor::text FROM sport_orders WHERE service_id=${f.service.id}`,
  );
  assert.equal(order.amount_minor, '80000');
  await discovery.saveOffer(f.owner.id, {
    ...input,
    operationId: randomUUID(),
    revision: 1,
    discountBasisPoints: 3000,
    maxUses: 2,
  });
  const [old] = await rows<{ amount_minor: string }>(
    db,
    sql`SELECT amount_minor::text FROM sport_orders WHERE service_id=${f.service.id}`,
  );
  assert.equal(old.amount_minor, '80000');
  const recommendations = await discovery.recommend({
    q: 'Synthetic',
    level: 'beginner',
    offersOnly: 'true',
    branchId: f.branch.id,
  });
  assert.equal(recommendations.items.length, 1);
  assert.equal(recommendations.items[0].amount_minor, '70000');
  await db.execute(
    sql`UPDATE clubs SET publication_status='hidden' WHERE id=${f.org.id}`,
  );
  assert.equal(
    (
      await discovery.recommend({
        q: '',
        level: 'any',
        offersOnly: 'false',
        branchId: f.branch.id,
      })
    ).items.length,
    0,
  );
});
void test('network credit requires both organizations, prevents overspend and refunds to the same account once', async () => {
  const f = await sale(),
    issuer = await fixture(),
    athlete = await person();
  const n = await credits.create(issuer.owner.id, {
    operationId: randomUUID(),
    organizationId: issuer.org.id,
    name: 'Synthetic network',
    terms: 'Synthetic credit network conditions.',
  });
  const networkId = String(n.id);
  await credits.member(issuer.owner.id, networkId, {
    operationId: randomUUID(),
    organizationId: f.org.id,
    action: 'invite',
  });
  await credits.grant(issuer.owner.id, networkId, {
    operationId: randomUUID(),
    userId: athlete.id,
    amountMinor: '100000',
    receipt: randomUUID(),
    reason: 'Synthetic manual receipt funding',
  });
  const order = await commerce.checkout(athlete.id, {
    serviceId: f.service.id,
    occurrenceId: f.occurrence.id,
    idempotencyKey: randomUUID(),
  });
  const pay = {
    operationId: randomUUID(),
    networkId,
    orderId: String(order.id),
  };
  await assert.rejects(() => credits.pay(athlete.id, pay));
  await credits.member(f.owner.id, networkId, {
    operationId: randomUUID(),
    organizationId: f.org.id,
    action: 'accept',
  });
  const [first, second] = await Promise.all([
    credits.pay(athlete.id, pay),
    credits.pay(athlete.id, pay),
  ]);
  assert.deepEqual(
    JSON.parse(JSON.stringify(first)),
    JSON.parse(JSON.stringify(second)),
  );
  assert.equal((await credits.mine(athlete.id)).accounts[0].balance_minor, '0');
  const [r] = await rows<{ id: string; revision: number }>(
    db,
    sql`SELECT id,revision FROM sport_reservations WHERE order_id=${order.id}`,
  );
  await commerce.cancel(athlete.id, r.id, r.revision, '100000', randomUUID());
  await commerce.runJobs();
  await commerce.runJobs();
  const own = await credits.mine(athlete.id);
  assert.equal(own.accounts[0].balance_minor, '100000');
  assert.equal(own.entries.filter((e) => e.kind === 'refund').length, 1);
  await assert.rejects(() =>
    credits.grant(f.owner.id, networkId, {
      operationId: randomUUID(),
      userId: athlete.id,
      amountMinor: '100000',
      receipt: randomUUID(),
      reason: 'Unapproved funding attempt',
    }),
  );
});
void test('open game claims one court reservation, caps players and confirms only after every share is paid', async () => {
  const f = await sale('court'),
    organizer = await person(),
    player = await person(),
    extra = await person(),
    games = new GamesService(database, commerce);
  const created = await games.create(organizer.id, {
    operationId: randomUUID(),
    serviceId: f.service.id,
    occurrenceId: f.occurrence.id,
    title: 'Synthetic game',
    playerCount: 2,
    public: true,
    acceptedTerms: true,
  });
  const join = await games.join(player.id, created.id, {
    operationId: randomUUID(),
    acceptedTerms: true,
  });
  await assert.rejects(() =>
    games.join(extra.id, created.id, {
      operationId: randomUUID(),
      acceptedTerms: true,
    }),
  );
  const own = await games.detail(organizer.id, created.id);
  assert.equal(own.shares.length, 2);
  assert.equal(own.ownShare?.amount_minor, '50000');
  const pay = async (user: string, order: string) => {
    await commerce.startPayment(user, order, 'success', randomUUID());
    await commerce.verifyPayment(user, order);
  };
  await pay(organizer.id, own.ownShare.order_id);
  await games.reconcile(created.id);
  assert.equal(
    (await games.detail(player.id, created.id)).status,
    'recruiting',
  );
  await pay(player.id, join.orderId);
  await Promise.all([games.reconcile(created.id), games.reconcile(created.id)]);
  assert.equal((await games.detail(player.id, created.id)).status, 'confirmed');
  const [count] = await rows<{ n: number }>(
    db,
    sql`SELECT count(*)::int n FROM sport_reservations r JOIN growth_games g ON g.order_id=r.order_id WHERE g.id=${created.id}`,
  );
  assert.equal(count.n, 1);
  const report = await commerce.report(f.owner.id, f.org.id, f.branch.id);
  assert.equal(report.sales_minor, '100000');
  assert.equal(report.collected_minor, '100000');
  const advanced = await new AdvancedBusinessService(database, config).overview(
    f.owner.id,
    'business',
    { organizationId: f.org.id, branchId: f.branch.id },
  );
  assert.equal(advanced.report?.sold_minor, '100000');
  assert.equal(advanced.report?.collected_minor, '100000');
  assert.equal(advanced.comparison?.[0]?.sold_minor, '100000');

  await games.cancel(organizer.id, created.id, {
    operationId: randomUUID(),
    acceptedTerms: true,
  });
  for (let i = 0; i < 4; i++) {
    await db.execute(
      sql`UPDATE sport_outbox SET due_at=now(),lease_until=null WHERE processed_at IS NULL`,
    );
    await commerce.runJobs();
  }
  const refunds = await rows<{ refunded_minor: string }>(
    db,
    sql`SELECT o.refunded_minor::text FROM sport_orders o JOIN growth_game_shares sh ON sh.order_id=o.id WHERE sh.game_id=${created.id}`,
  );
  assert.deepEqual(
    refunds.map((r) => r.refunded_minor),
    ['50000', '50000'],
  );
  const parent = await rows<{ state: string }>(
    db,
    sql`SELECT r.state FROM sport_refunds r JOIN growth_games g ON g.order_id=r.order_id WHERE g.id=${created.id}`,
  );
  assert.equal(parent[0].state, 'succeeded');
});
void test('group shares consume only one offer use and preserve remaining offer budget', async () => {
  const f = await sale('court'),
    games = new GamesService(database, commerce),
    actor = await person();
  const offer = {
    operationId: randomUUID(),
    occurrenceId: f.occurrence.id,
    discountBasisPoints: 1000,
    maxUses: 2,
    endsAt: new Date(Date.now() + 3600000).toISOString(),
    revision: 0,
    active: true,
  };
  await discovery.saveOffer(f.owner.id, offer);
  const created = await games.create(actor.id, {
    operationId: randomUUID(),
    serviceId: f.service.id,
    occurrenceId: f.occurrence.id,
    title: 'Synthetic discounted group',
    playerCount: 2,
    public: false,
    acceptedTerms: true,
  });
  assert.equal(
    (await games.detail(actor.id, created.id)).ownShare?.amount_minor,
    '45000',
  );
  assert.equal(
    (await offerPrice(db, f.occurrence.id, '100000')).amount,
    '90000',
  );
  await discovery.saveOffer(f.owner.id, {
    ...offer,
    operationId: randomUUID(),
    revision: 1,
    maxUses: 1,
  });
});
void test('every group participant needs the service documents, including expiry checks', async () => {
  const requirement = 'Synthetic clearance',
    f = await sale('court', [requirement]),
    organizer = await person(),
    player = await person(),
    games = new GamesService(database, commerce);
  await db.execute(
    sql`INSERT INTO sport_documents(user_id,service_id,name,object_key,status) VALUES(${organizer.id},${f.service.id},${requirement},'synthetic-only/organizer.pdf','approved')`,
  );
  const g = await games.create(organizer.id, {
    operationId: randomUUID(),
    serviceId: f.service.id,
    occurrenceId: f.occurrence.id,
    title: 'Synthetic restricted court',
    playerCount: 2,
    public: true,
    acceptedTerms: true,
  });
  const join = () =>
    games.join(player.id, g.id, {
      operationId: randomUUID(),
      acceptedTerms: true,
    });
  await assert.rejects(join);
  await db.execute(
    sql`INSERT INTO sport_documents(user_id,service_id,name,object_key,status,expires_at) VALUES(${player.id},${f.service.id},${requirement},'synthetic-only/player.pdf','approved',now()-interval '1 day')`,
  );
  await assert.rejects(join);
  await db.execute(
    sql`UPDATE sport_documents SET expires_at=now()+interval '1 day' WHERE user_id=${player.id} AND service_id=${f.service.id}`,
  );
  assert.ok((await join()).orderId);
});
void test('an incomplete group expires and refunds a paid share exactly once', async () => {
  const f = await sale('court'),
    organizer = await person(),
    games = new GamesService(database, commerce),
    created = await games.create(organizer.id, {
      operationId: randomUUID(),
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
      title: 'Synthetic incomplete game',
      playerCount: 2,
      public: true,
      acceptedTerms: true,
    });
  const detail = await games.detail(organizer.id, created.id);
  await commerce.startPayment(
    organizer.id,
    detail.ownShare.order_id,
    'success',
    randomUUID(),
  );
  await commerce.verifyPayment(organizer.id, detail.ownShare.order_id);
  await db.execute(
    sql`UPDATE growth_games SET deadline=now()-interval '1 second' WHERE id=${created.id}`,
  );
  await games.reconcile(created.id);
  await games.reconcile(created.id);
  await commerce.runJobs();
  assert.equal(
    (await games.detail(organizer.id, created.id)).status,
    'cancelled',
  );
  const [refund] = await rows<{ amount: string; n: number }>(
    db,
    sql`SELECT sum(amount_minor)::text amount,count(*)::int n FROM sport_refunds WHERE order_id=${detail.ownShare.order_id} AND state='succeeded'`,
  );
  assert.equal(refund.amount, '50000');
  assert.equal(refund.n, 1);
});
void test('background reconciliation skips unfunded holds instead of starving funded groups', async () => {
  const games = new GamesService(database, commerce);
  for (let i = 0; i < 25; i++) {
    const f = await sale('court'),
      actor = await person();
    const g = await games.create(actor.id, {
      operationId: randomUUID(),
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
      title: 'Synthetic unfunded group',
      playerCount: 2,
      public: false,
      acceptedTerms: true,
    });
    await db.execute(
      sql`UPDATE growth_games SET deadline=now()+interval '2 minutes' WHERE id=${g.id}`,
    );
  }
  const f = await sale('court'),
    a = await person(),
    b = await person();
  const g = await games.create(a.id, {
    operationId: randomUUID(),
    serviceId: f.service.id,
    occurrenceId: f.occurrence.id,
    title: 'Synthetic funded group',
    playerCount: 2,
    public: false,
    acceptedTerms: true,
  });
  const own = (await games.detail(a.id, g.id)).ownShare!,
    second = await games.join(b.id, g.id, {
      operationId: randomUUID(),
      acceptedTerms: true,
    });
  for (const [actor, order] of [
    [a.id, own.order_id],
    [b.id, second.orderId],
  ]) {
    await commerce.startPayment(actor, order, 'success', randomUUID());
    await commerce.verifyPayment(actor, order);
  }
  await games.runDue();
  assert.equal((await games.detail(a.id, g.id)).status, 'confirmed');
});
void test('food catalog has real composition data and logs canonical values with source ownership', async () => {
  const nutrition = new NutritionService(database),
    actor = await person(),
    stranger = await person();
  const foods = nutrition.foods({ q: 'برنج سفید', page: 1 });
  assert.equal(foods.items[0].id, '168878');
  const input = {
    operationId: randomUUID(),
    eatenOn: '2026-10-24',
    meal: 'lunch' as const,
    grams: 150,
    locale: 'fa' as const,
  };
  await nutrition.addFood(actor.id, '168878', input);
  await nutrition.addFood(actor.id, '168878', input);
  const day = await nutrition.day(actor.id, '2026-10-24');
  assert.equal(day.totals.calories, '195.00');
  assert.equal(day.entries.length, 1);
  assert.equal(day.entries[0].food_id, '168878');
  assert.equal(
    (await nutrition.day(stranger.id, '2026-10-24')).entries.length,
    0,
  );
  assert.equal(
    foodEntry.safeParse({ ...input, per100g: { calories: 0 } }).success,
    false,
  );
  assert.throws(() => nutrition.addFood(actor.id, 'not-a-food', input));
});
void test('native push is native-session bound, future-only, deduplicated and revoked on logout', async () => {
  class Sender extends NativePushSender {
    sent: { device: string; notice: string }[] = [];
    override configuration() {
      return { android: true, ios: false };
    }
    override send(d: NativeDevice, id: string) {
      this.sent.push({ device: d.id, notice: id });
      return Promise.resolve('accepted' as const);
    }
  }
  const sender = new Sender(config),
    native = new NativePushService(database, sender);
  async function principal(transport: 'native' | 'web'): Promise<Principal> {
    const personId = await person();
    const [user] = await db
      .select()
      .from(schema.users)
      .where(sql`id=${personId.id}`);
    const [session] = await db
      .insert(schema.authSessions)
      .values({
        userId: user.id,
        client: 'application',
        transport,
        tokenHash: randomUUID(),
        device: 'Synthetic native test',
        expiresAt: new Date(Date.now() + 3600000),
      })
      .returning();
    return { user, session };
  }
  const p = await principal('native'),
    other = await principal('native'),
    web = await principal('web');
  await deliverSportsNotification(db, {
    userId: p.user.id,
    title: 'Synthetic historical',
    body: '',
    href: '/notifications',
    sourceKey: randomUUID(),
  });
  const input = {
    platform: 'android' as const,
    token: 'synthetic-native-device-' + randomUUID(),
    locale: 'fa' as const,
  };
  const registration = await native.register(p, input);
  await assert.rejects(() => native.register(other, input));
  await assert.rejects(() =>
    native.register(web, {
      ...input,
      token: 'synthetic-web-device-' + randomUUID(),
    }),
  );
  assert.equal((await native.drain()).processed, 0);
  await deliverSportsNotification(db, {
    userId: p.user.id,
    title: 'Synthetic future',
    body: 'private content must not reach sender',
    href: '/notifications',
    sourceKey: 'native-future-' + registration.id,
  });
  await Promise.all([native.drain(), native.drain()]);
  assert.equal(sender.sent.length, 1);
  await native.drain();
  assert.equal(sender.sent.length, 1);
  await db.execute(
    sql`UPDATE auth_sessions SET revoked_at=now() WHERE id=${p.session.id}`,
  );
  assert.equal((await native.status(p)).device, null);
  const jobs = await rows(
    db,
    sql`SELECT id FROM native_push_deliveries WHERE device_id=${registration.id}`,
  );
  assert.equal(jobs.length, 0);
});
