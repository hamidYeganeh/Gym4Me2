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
import { LegacyGroupReconciliationService } from '../src/modules/commerce/legacy-group-reconciliation.service';
import { CrmService } from '../src/modules/growth/crm.service';
import {
  rows,
  CommerceService,
} from '../src/modules/commerce/commerce.service';
import { SamanMockPaymentAdapter } from '../src/modules/commerce/sandbox-payment';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import { GrowthDiscoveryService } from '../src/modules/growth/discovery.service';
import * as c from '../src/modules/growth/growth.contracts';
import { NativePushService } from '../src/modules/push/native-push.service';
import {
  NativePushSender,
  type NativeDevice,
} from '../src/modules/push/native-push.sender';
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
  discovery = new GrowthDiscoveryService(database);
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
// Pre-v1 records are seeded directly: there is no game creation API in main.
async function legacyGroup(paidPlayers: number) {
  const f = await sale('court');
  const players = [await person(), await person()];
  const parent = await commerce.checkout(
    players[0].id,
    {
      serviceId: f.service.id,
      occurrenceId: f.occurrence.id,
      idempotencyKey: randomUUID(),
    },
    'online',
    true,
  );
  const id = randomUUID();
  await db.execute(
    sql`INSERT INTO growth_games(id,organizer_id,order_id,occurrence_id,title,player_count,deadline,public) VALUES(${id},${players[0].id},${parent.id},${f.occurrence.id},'Historical group',2,${parent.expires_at},false)`,
  );
  const shareOrders: string[] = [];
  for (let i = 0; i < 2; i++) {
    if (i >= paidPlayers) {
      await db.execute(
        sql`INSERT INTO growth_game_shares(game_id,slot,amount_minor) VALUES(${id},${i + 1},50000)`,
      );
      continue;
    }
    const [order] = await rows<{ id: string }>(
      db,
      sql`INSERT INTO sport_orders(user_id,organization_id,service_id,version_id,amount_minor,snapshot,idempotency_key,request_hash,expires_at) SELECT ${players[i].id},organization_id,service_id,version_id,50000,snapshot||${JSON.stringify({ kind: 'split_share', groupId: id, approvalRequired: false })}::jsonb,${randomUUID()},${randomUUID()},expires_at FROM sport_orders WHERE id=${parent.id} RETURNING id`,
    );
    await db.execute(
      sql`INSERT INTO growth_game_shares(game_id,slot,amount_minor,user_id,order_id) VALUES(${id},${i + 1},50000,${players[i].id},${order.id})`,
    );
    await commerce.startPayment(
      players[i].id,
      order.id,
      'success',
      randomUUID(),
    );
    await commerce.verifyPayment(players[i].id, order.id);
    shareOrders.push(order.id);
  }
  return { id, parent, shareOrders };
}
void test('v1 still reconciles fully paid legacy groups once without a creation endpoint', async () => {
  const group = await legacyGroup(2);
  const service = new LegacyGroupReconciliationService(database, commerce);
  await Promise.all([service.reconcile(group.id), service.reconcile(group.id)]);
  const [state] = await rows<{ status: string }>(
    db,
    sql`SELECT status FROM growth_games WHERE id=${group.id}`,
  );
  assert.equal(state.status, 'confirmed');
  const [bookings] = await rows<{ n: number }>(
    db,
    sql`SELECT count(*)::int n FROM sport_reservations WHERE order_id=${group.parent.id}`,
  );
  assert.equal(bookings.n, 1);
  const [payments] = await rows<{ n: number }>(
    db,
    sql`SELECT count(*)::int n FROM sport_payments WHERE order_id=${group.parent.id} AND provider='team_split' AND state='verified'`,
  );
  assert.equal(payments.n, 1);
});
void test('v1 expires an incomplete legacy group and refunds its paid share exactly once', async () => {
  const group = await legacyGroup(1);
  await db.execute(
    sql`UPDATE growth_games SET deadline=now()-interval '1 second' WHERE id=${group.id}`,
  );
  const service = new LegacyGroupReconciliationService(database, commerce);
  await service.runDue();
  await service.runDue();
  await commerce.runJobs();
  const [state] = await rows<{ status: string }>(
    db,
    sql`SELECT status FROM growth_games WHERE id=${group.id}`,
  );
  assert.equal(state.status, 'cancelled');
  const [refund] = await rows<{ amount: string; n: number }>(
    db,
    sql`SELECT sum(amount_minor)::text amount,count(*)::int n FROM sport_refunds WHERE order_id=${group.shareOrders[0]} AND state='succeeded'`,
  );
  assert.equal(refund.amount, '50000');
  assert.equal(refund.n, 1);
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
