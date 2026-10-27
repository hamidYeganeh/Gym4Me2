import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { before, after, test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { sql, eq } from 'drizzle-orm';
import webpush from 'web-push';
import { WebPushService } from '../src/modules/push/push.service';
import {
  WebPushSender,
  type PushTarget,
  type PushOutcome,
} from '../src/modules/push/push.sender';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseService } from '../src/database/database.service';
import {
  validateEnvironment,
  type Environment,
} from '../src/config/environment';
import * as schema from '../src/database/schema';
import type { Db, Tx } from '../src/modules/clubs/club.repository';
import { StorageService } from '../src/modules/clubs/storage.service';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { SportsConversationService } from '../src/modules/commerce/conversations.service';
import { SportsInvitationService } from '../src/modules/commerce/invitations.service';
import { SamanMockPaymentAdapter } from '../src/modules/commerce/sandbox-payment';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import { deliverSportsNotification } from '../src/modules/commerce/notification-delivery';
import { deliverTimeSensitiveNotification } from '../src/modules/commerce/time-sensitive-notifications';
import {
  deliverOrderNotification,
  type OrderNoticeKind,
} from '../src/modules/commerce/order-notifications';
import { scheduleReservationReminders } from '../src/modules/commerce/scheduled-notifications';

// Small real-PostgreSQL suite: no browser fixture, live SMS, S3 or DI test server.
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_notification_guard_test';
const destination = new URL(databaseUrl);
if (
  !['127.0.0.1', 'localhost'].includes(destination.hostname) ||
  !destination.pathname.endsWith('_notification_guard_test')
)
  throw new Error(
    'Requires an isolated local _notification_guard_test database.',
  );
const config = new ConfigService<Environment, true>(
  validateEnvironment({
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    DB_POOL_MAX: 6,
    DB_CONNECTION_TIMEOUT_MS: 3000,
    DB_STATEMENT_TIMEOUT_MS: 10000,
  }),
);
const database = new DatabaseService(config),
  db = database.db;
const storage = new StorageService(config);
const commerce = new CommerceService(
  database,
  new SamanMockPaymentAdapter(config),
);
const conversations = new SportsConversationService(database, storage);
const invitations = new SportsInvitationService(database, commerce);
const organizationId = randomUUID(),
  branchId = randomUUID();
const userIds: string[] = [];
let owner: string;
const policy = {
  cancellationHours: 0,
  lateRefundBasisPoints: 10000,
  noShowConsumesSession: false,
  consumeOn: 'attendance' as const,
  freezeDays: 0,
  depositBasisPoints: 0,
  guestAllowance: 0,
  transferable: false,
  terms: 'Isolated notification integration test policy.',
};
async function person() {
  const [user] = await db
    .insert(schema.users)
    .values({
      phone: `+989${randomInt(100000000, 999999999)}`,
      displayName: 'Notification test',
      phoneVerifiedAt: new Date(),
    })
    .returning();
  userIds.push(user.id);
  return user.id;
}
const notice = (userId: string) => ({
  userId,
  title: 'Isolated notice',
  body: 'Test-only context',
  href: '/notifications',
  sourceKey: randomUUID(),
});
async function state(
  db: Db | Tx,
  userId: string,
  value: 'active' | 'pending' | 'deleted' | 'suspended',
) {
  await db.execute(
    sql`UPDATE users SET status=${value === 'suspended' ? 'suspended' : 'active'},deletion_pending=${value === 'pending'},deleted_at=${value === 'deleted' ? sql`now()` : null} WHERE id=${userId}`,
  );
}
async function countNotices(userId: string) {
  const result = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int count FROM sport_notifications WHERE user_id=${userId}`,
  );
  return result.rows[0].count;
}
async function service(
  options: {
    amountMinor?: string;
    approvalRequired?: boolean;
    kind?: 'class' | 'membership';
    sessionCount?: number;
  } = {},
) {
  const created = await commerce.createService(
    owner,
    serviceSchema.parse({
      organizationId,
      branchId,
      title: 'Notification class',
      kind: 'class',
      amountMinor: '0',
      policy,
      ...options,
    }),
  );
  await commerce.publish(owner, created.id, 1);
  return created;
}
async function session(participants: string[]) {
  const created = await service(),
    start = Date.now() + 86400000;
  const slot = await commerce.schedule(owner, created.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: participants.length + 1,
  });
  const orders: Awaited<ReturnType<CommerceService['checkout']>>[] = [];
  for (const userId of participants)
    orders.push(
      await commerce.checkout(userId, {
        serviceId: created.id,
        occurrenceId: slot.id,
        idempotencyKey: randomUUID(),
      }),
    );
  const chat = await conversations.start(owner, slot.id);
  return { id: String(chat.id), orders };
}
async function waitForWaiters(holder: number, expected: number) {
  for (let attempt = 0; attempt < 200; attempt++) {
    // Independent autocommit reads avoid a cached pg_stat_activity snapshot.
    const waiting = await db.execute<{ count: number }>(
      sql`SELECT count(*)::int count FROM pg_stat_activity WHERE ${holder}=ANY(pg_blocking_pids(pid))`,
    );
    if (waiting.rows[0].count >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail('Expected database lock waiters did not arrive.');
}
before(async () => {
  await database.onModuleInit();
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  owner = await person();
  await db.insert(schema.organizations).values({
    id: organizationId,
    name: 'Notification test',
    slug: `notice-${randomUUID()}`,
    status: 'approved',
  });
  await db
    .insert(schema.organizationMembers)
    .values({ organizationId, userId: owner, role: 'owner' });
  await db.insert(schema.clubs).values({
    id: organizationId,
    ownerId: owner,
    publicationStatus: 'published',
  });
  await db.insert(schema.branches).values({
    id: branchId,
    organizationId,
    name: 'Test branch',
    slug: 'test',
  });
  await db
    .insert(schema.branchProfiles)
    .values({ branchId, clubId: organizationId });
});
after(async () => {
  try {
    const tables = await db.execute<{ quoted: string }>(
      sql`SELECT quote_ident(tablename) quoted FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'sport_%'`,
    );
    if (tables.rows.length)
      await db.execute(
        sql.raw(
          `TRUNCATE ${tables.rows.map((t) => t.quoted).join(',')} CASCADE`,
        ),
      );
    await db.execute(
      sql`DELETE FROM branch_profiles WHERE club_id=${organizationId}`,
    );
    await db.execute(
      sql`DELETE FROM branches WHERE organization_id=${organizationId}`,
    );
    await db.execute(sql`DELETE FROM clubs WHERE id=${organizationId}`);
    await db.execute(
      sql`DELETE FROM organization_members WHERE organization_id=${organizationId}`,
    );
    await db.execute(
      sql`DELETE FROM audit_events WHERE organization_id=${organizationId}`,
    );
    await db.execute(sql`DELETE FROM organizations WHERE id=${organizationId}`);
    for (const userId of userIds)
      await db.execute(sql`DELETE FROM users WHERE id=${userId}`);
  } finally {
    storage.onModuleDestroy();
    await database.onApplicationShutdown();
  }
});

void test('delivery applies all preferences, retries once and never recreates erased notices', async () => {
  const userId = await person(),
    input = notice(userId);
  const id = await deliverSportsNotification(db, input);
  assert.ok(id);
  await db.execute(
    sql`UPDATE sport_notifications SET read_at=now() WHERE id=${id}`,
  );
  assert.equal(await deliverSportsNotification(db, input), null);
  assert.equal(await countNotices(userId), 1);
  await db.execute(
    sql`INSERT INTO sport_notification_preferences(user_id,messages,invitations,reminders) VALUES(${userId},false,false,false)`,
  );
  for (const preference of ['messages', 'invitations', 'reminders'] as const)
    assert.equal(
      await deliverSportsNotification(db, { ...notice(userId), preference }),
      null,
    );
  assert.ok(await deliverSportsNotification(db, notice(userId))); // essential transactional update
  for (const value of ['pending', 'suspended', 'deleted'] as const) {
    await state(db, userId, value);
    assert.equal(await deliverSportsNotification(db, notice(userId)), null);
  }
  await db.execute(
    sql`DELETE FROM sport_notifications WHERE user_id=${userId}`,
  );
  assert.equal(await deliverSportsNotification(db, input), null);
  assert.equal(await countNotices(userId), 0);
  assert.equal(await deliverSportsNotification(db, notice(randomUUID())), null);
});

void test('actual messages notify active members but skip inactive and opted-out members', async () => {
  const sender = await person(),
    active = await person(),
    excluded = await person();
  const chat = await session([sender, active, excluded]);
  for (const value of ['pending', 'suspended', 'deleted'] as const) {
    await state(db, excluded, value);
    await conversations.send(
      sender,
      chat.id,
      `Private message ${value}`,
      randomUUID(),
    );
    assert.equal(await countNotices(excluded), 0);
  }
  assert.equal(await countNotices(active), 3);
  const contexts = await db.execute<{ body: string }>(
    sql`SELECT body FROM sport_notifications WHERE user_id=${active}`,
  );
  assert.ok(contexts.rows.every((n) => n.body === 'Notification class'));
  await state(db, excluded, 'active');
  await db.execute(
    sql`INSERT INTO sport_notification_preferences(user_id,messages) VALUES(${excluded},false)`,
  );
  await conversations.send(sender, chat.id, 'Opted-out member', randomUUID());
  assert.equal(await countNotices(excluded), 0);
});

void test(
  'two senders queued together can notify each other without exclusive-account deadlocks',
  { timeout: 15000 },
  async () => {
    const first = await person(),
      second = await person(),
      chat = await session([first, second]);
    let attempts: Promise<unknown>[] = [];
    await db.transaction(async (tx) => {
      const [holder] = await rows<{ pid: number }>(
        tx,
        sql`SELECT pg_backend_pid() pid`,
      );
      await tx.execute(
        sql`SELECT id FROM sport_conversations WHERE id=${chat.id} FOR UPDATE`,
      );
      attempts = [
        conversations.send(first, chat.id, 'From first', randomUUID()),
        conversations.send(second, chat.id, 'From second', randomUUID()),
      ];
      // Both senders have reached the conversation after acquiring their account locks.
      await waitForWaiters(holder.pid, 2);
    });
    await Promise.all(attempts);
    assert.equal(await countNotices(first), 1);
    assert.equal(await countNotices(second), 1);
  },
);

void test(
  'a notification queued behind erasure rechecks eligibility after the account lock',
  { timeout: 15000 },
  async () => {
    const userId = await person(),
      input = notice(userId);
    await deliverSportsNotification(db, notice(userId));
    let delivery: Promise<string | null> | undefined;
    await db.transaction(async (tx) => {
      const [holder] = await rows<{ pid: number }>(
        tx,
        sql`SELECT pg_backend_pid() pid`,
      );
      await tx.execute(sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`);
      delivery = deliverSportsNotification(db, input);
      await waitForWaiters(holder.pid, 1);
      await state(tx, userId, 'deleted');
      await tx.execute(
        sql`DELETE FROM sport_notifications WHERE user_id=${userId}`,
      );
    });
    assert.equal(await delivery, null);
    assert.equal(await countNotices(userId), 0);
  },
);

void test(
  'erasure queued behind delivery removes the committed notice',
  { timeout: 15000 },
  async () => {
    const userId = await person();
    let erasure: Promise<void> | undefined;
    await db.transaction(async (tx) => {
      const [holder] = await rows<{ pid: number }>(
        tx,
        sql`SELECT pg_backend_pid() pid`,
      );
      assert.ok(await deliverSportsNotification(tx, notice(userId)));
      erasure = db.transaction(async (deletion) => {
        await deletion.execute(
          sql`SELECT id FROM users WHERE id=${userId} FOR UPDATE`,
        );
        await state(deletion, userId, 'deleted');
        await deletion.execute(
          sql`DELETE FROM sport_notifications WHERE user_id=${userId}`,
        );
      });
      await waitForWaiters(holder.pid, 1);
    });
    await erasure;
    assert.equal(await countNotices(userId), 0);
  },
);

void test('outbox acknowledges suppressed updates without recreating notices or changing paid orders', async () => {
  const userId = await person(),
    chat = await session([userId]);
  const order = chat.orders[0];
  await state(db, userId, 'pending');
  let processed = false;
  for (let tick = 0; tick < 10 && !processed; tick++) {
    await commerce.runJobs();
    const jobs = await db.execute<{ processed: boolean }>(
      sql`SELECT processed_at IS NOT NULL processed FROM sport_outbox WHERE aggregate_id=${order.id} AND kind='order.confirmed'`,
    );
    processed = jobs.rows.length > 0 && jobs.rows.every((job) => job.processed);
  }
  assert.ok(processed);
  assert.equal(await countNotices(userId), 0);
  assert.equal((await commerce.myOrder(userId, order.id)).status, 'paid');
});

void test('immediate outbox work is due by the database clock and explicit schedules are preserved', async () => {
  const aggregate = randomUUID(),
    immediateKey = randomUUID(),
    futureKey = randomUUID();
  await commerce.event(db, 'reservation.changed', aggregate, immediateKey);
  const future = new Date(Date.now() + 86400000);
  await commerce.event(db, 'reservation.changed', aggregate, futureKey, future);
  const values = await db.execute<{
    source_key: string;
    due: boolean;
    due_at: Date;
  }>(
    sql`SELECT source_key,due_at<=clock_timestamp() due,due_at FROM sport_outbox WHERE source_key IN(${immediateKey},${futureKey})`,
  );
  assert.equal(
    values.rows.find((row) => row.source_key === immediateKey)?.due,
    true,
  );
  const scheduled = values.rows.find((row) => row.source_key === futureKey);
  assert.equal(scheduled?.due, false);
  assert.equal(new Date(scheduled.due_at).toISOString(), future.toISOString());
});

void test('invitations honor opt-out and replay does not later create a notice', async () => {
  const userId = await person();
  await session([userId]);
  const target = await service();
  await db.execute(
    sql`INSERT INTO sport_notification_preferences(user_id,invitations) VALUES(${userId},false)`,
  );
  const input = { serviceId: target.id, userId, idempotencyKey: randomUUID() };
  const created = await invitations.create(owner, input);
  assert.equal(await countNotices(userId), 0);
  await db.execute(
    sql`UPDATE sport_notification_preferences SET invitations=true WHERE user_id=${userId}`,
  );
  const replay = await invitations.create(owner, input);
  assert.equal(replay.id, created.id);
  assert.equal(await countNotices(userId), 0);
});

type TimedJob = Parameters<typeof deliverTimeSensitiveNotification>[1];
async function reminder(reservationId: string) {
  const result = await db.execute<{ id: string; payload: TimedJob['payload'] }>(
    sql`SELECT id,payload FROM sport_outbox WHERE kind='reservation.reminder' AND aggregate_id=${reservationId} AND processed_at IS NULL`,
  );
  assert.equal(result.rows.length, 1, 'Exactly one pending reminder');
  return {
    ...result.rows[0],
    aggregateId: reservationId,
    kind: 'reservation.reminder' as const,
  };
}
async function jobNotices(job: TimedJob) {
  return rows<{ id: string; read_at: Date | null }>(
    db,
    sql`SELECT id,read_at FROM sport_notifications WHERE source_key LIKE ${`${job.id}:%`}`,
  );
}
async function booking(
  near = false,
  approvalRequired = false,
  amountMinor = '0',
) {
  const userId = await person(),
    created = await service({ approvalRequired, amountMinor });
  const start = Date.now() + (near ? 20 * 60000 : 86400000);
  const slot = await commerce.schedule(owner, created.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 1,
  });
  const order = await commerce.checkout(userId, {
    serviceId: created.id,
    occurrenceId: slot.id,
    idempotencyKey: randomUUID(),
  });
  const reservationId = String(order.reservations[0].id);
  return { userId, created, slot, order, reservationId };
}
async function drain(job: { id: string }) {
  for (let tick = 0; tick < 10; tick++) {
    await commerce.runJobs();
    const [result] = await rows<{
      processed: boolean;
      last_error: string | null;
    }>(
      db,
      sql`SELECT processed_at IS NOT NULL processed,last_error FROM sport_outbox WHERE id=${job.id}`,
    );
    assert.equal(result.last_error, null);
    if (result.processed) return;
  }
  assert.fail('The bounded worker ticks did not acknowledge this job');
}

void test('reminders use the session clock and approval schedules exactly one current job', async () => {
  const reserved = await booking(false, true);
  assert.equal(reserved.order.reservations[0].status, 'pending_approval');
  const before = await rows(
    db,
    sql`SELECT id FROM sport_outbox WHERE kind='reservation.reminder' AND aggregate_id=${reserved.reservationId}`,
  );
  assert.equal(before.length, 0);
  await db.transaction((tx) =>
    commerce.approveHostedOrder(tx, reserved.order.id),
  );
  const job = await reminder(reserved.reservationId);
  assert.equal(job.payload.occurrenceId, reserved.slot.id);
  const [due] = await rows<{ correct: boolean }>(
    db,
    sql`SELECT j.due_at=o.start_at-interval '1 hour' correct FROM sport_outbox j JOIN sport_occurrences o ON o.id=${reserved.slot.id} WHERE j.id=${job.id}`,
  );
  assert.equal(due.correct, true);
  await db.transaction((tx) =>
    scheduleReservationReminders(tx, reserved.order.id),
  );
  assert.equal((await reminder(reserved.reservationId)).id, job.id);
  // Even a prematurely dispatched job cannot remind a session outside its window.
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
});

void test('reschedule retires a leased old job, changes its due date and can revisit a session', async () => {
  const reserved = await booking();
  const old = await reminder(reserved.reservationId);
  await db.execute(
    sql`UPDATE sport_outbox SET lease_until=now()+interval '1 minute' WHERE id=${old.id}`,
  );
  const start = Date.now() + 20 * 60000;
  const target = await commerce.schedule(owner, reserved.created.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 1,
  });
  const moved = await commerce.reschedule(
    reserved.userId,
    reserved.reservationId,
    Number(reserved.order.reservations[0].revision),
    target.id,
    randomUUID(),
  );
  const current = await reminder(reserved.reservationId);
  assert.notEqual(current.id, old.id);
  assert.equal(current.payload.occurrenceId, target.id);
  await deliverTimeSensitiveNotification(db, old); // already leased worker snapshot
  assert.equal((await jobNotices(old)).length, 0);
  await drain(current);
  const [read] = await jobNotices(current);
  assert.ok(read);
  await db.execute(
    sql`UPDATE sport_notifications SET read_at=now() WHERE id=${read.id}`,
  );
  const away = await commerce.reschedule(
    reserved.userId,
    reserved.reservationId,
    Number(moved.reservations[0].revision),
    reserved.slot.id,
    randomUUID(),
  );
  assert.equal((await jobNotices(current)).length, 1, 'Keep read history');
  const awayJob = await reminder(reserved.reservationId);
  assert.equal(awayJob.payload.occurrenceId, reserved.slot.id);
  const commandKey = randomUUID();
  const returned = await commerce.reschedule(
    reserved.userId,
    reserved.reservationId,
    Number(away.reservations[0].revision),
    target.id,
    commandKey,
  );
  const returnedJob = await reminder(reserved.reservationId);
  assert.notEqual(returnedJob.id, current.id);
  await commerce.reschedule(
    reserved.userId,
    reserved.reservationId,
    Number(away.reservations[0].revision),
    target.id,
    commandKey,
  );
  assert.equal((await reminder(reserved.reservationId)).id, returnedJob.id);
  await drain(returnedJob);
  assert.equal((await jobNotices(returnedJob)).length, 1);
  await commerce.cancel(
    reserved.userId,
    reserved.reservationId,
    Number(returned.reservations[0].revision),
  );
  assert.equal(
    (await jobNotices(returnedJob)).length,
    0,
    'Remove unread obsolete reminder',
  );
  assert.equal(
    (await jobNotices(current)).length,
    1,
    'Read history remains after cancellation',
  );
});

void test('failed reschedule leaves the original pending reminder and booking intact', async () => {
  const reserved = await booking(),
    original = await reminder(reserved.reservationId),
    second = await person(),
    start = Date.now() + 2 * 86400000;
  const target = await commerce.schedule(owner, reserved.created.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 1,
  });
  await commerce.checkout(second, {
    serviceId: reserved.created.id,
    occurrenceId: target.id,
    idempotencyKey: randomUUID(),
  });
  await assert.rejects(
    commerce.reschedule(
      reserved.userId,
      reserved.reservationId,
      Number(reserved.order.reservations[0].revision),
      target.id,
      randomUUID(),
    ),
  );
  assert.equal((await reminder(reserved.reservationId)).id, original.id);
  assert.equal(
    (await commerce.booking(reserved.userId, reserved.reservationId))
      .occurrence_id,
    reserved.slot.id,
  );
});

void test('cancelled bookings cannot receive an already dispatched reminder', async () => {
  const reserved = await booking(true),
    job = await reminder(reserved.reservationId);
  await commerce.cancel(
    reserved.userId,
    reserved.reservationId,
    Number(reserved.order.reservations[0].revision),
  );
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
  await drain(job);
});

void test('admission retires unread reminders without marking class attendance, and repeated QR does not recreate them', async () => {
  const reserved = await booking(true),
    job = await reminder(reserved.reservationId);
  await drain(job);
  assert.equal((await jobNotices(job)).length, 1);
  const ticket = await commerce.ticket(reserved.userId, reserved.reservationId);
  await commerce.checkIn(owner, ticket.token, 'Notification attendance test');
  await commerce.checkIn(owner, ticket.token, 'Repeated QR');
  const attendance = await db.execute<{ count: number }>(
    sql`SELECT count(*)::int count FROM sport_attendance WHERE reservation_id=${reserved.reservationId}`,
  );
  assert.equal(attendance.rows[0].count, 0);
  assert.equal((await jobNotices(job)).length, 0);
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
});

void test('worker honors reminder opt-out and does not replay suppressed work after opting in', async () => {
  const reserved = await booking(true),
    job = await reminder(reserved.reservationId);
  await db.execute(
    sql`INSERT INTO sport_notification_preferences(user_id,reminders) VALUES(${reserved.userId},false)`,
  );
  await drain(job);
  assert.equal((await jobNotices(job)).length, 0);
  await db.execute(
    sql`UPDATE sport_notification_preferences SET reminders=true WHERE user_id=${reserved.userId}`,
  );
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
});

void test('worker marks past sessions absent without delivering an obsolete reminder', async () => {
  const reserved = await booking(true),
    job = await reminder(reserved.reservationId);
  // Controlled clock fixture: move this owned session into the past, never the host clock.
  await db.execute(
    sql`UPDATE sport_occurrences SET start_at=now()-interval '2 hours',end_at=now()-interval '1 hour' WHERE id=${reserved.slot.id}`,
  );
  await drain(job);
  assert.equal((await jobNotices(job)).length, 0);
  assert.equal(
    (await commerce.booking(reserved.userId, reserved.reservationId)).status,
    'no_show',
  );
});

void test(
  'host cancellation queued behind delivery removes the resulting unread reminder',
  { timeout: 15000 },
  async () => {
    const reserved = await booking(true),
      job = await reminder(reserved.reservationId);
    let delivery: Promise<unknown> | undefined,
      cancellation: Promise<unknown> | undefined;
    await db.transaction(async (account) => {
      const [holder] = await rows<{ pid: number }>(
        account,
        sql`SELECT pg_backend_pid() pid`,
      );
      await account.execute(
        sql`SELECT id FROM users WHERE id=${reserved.userId} FOR UPDATE`,
      );
      delivery = deliverTimeSensitiveNotification(db, job);
      await waitForWaiters(holder.pid, 1); // delivery holds occurrence/reservation locks, waits for account
      const [deliveryProcess] = await rows<{ pid: number }>(
        db,
        sql`SELECT pid FROM pg_stat_activity WHERE ${holder.pid}=ANY(pg_blocking_pids(pid))`,
      );
      cancellation = db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT id FROM sport_occurrences WHERE id=${reserved.slot.id} FOR UPDATE`,
        );
        await commerce.cancelHostedOrder(
          tx,
          reserved.order.id,
          'Host cancellation test',
        );
        await tx.execute(
          sql`UPDATE sport_occurrences SET status='cancelled' WHERE id=${reserved.slot.id}`,
        );
      });
      await waitForWaiters(deliveryProcess.pid, 1);
    });
    await Promise.all([delivery, cancellation]);
    assert.equal((await jobNotices(job)).length, 0);
  },
);

async function queuedOffer() {
  const userId = await person(),
    created = await service();
  const start = Date.now() + 86400000;
  const slot = await commerce.schedule(owner, created.id, {
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    capacity: 1,
  });
  await commerce.waitlist(userId, slot.id);
  // Older durable work postpones offer delivery without replacing the worker.
  await db.execute(
    sql`INSERT INTO sport_outbox(kind,aggregate_id,payload,source_key,due_at) SELECT 'test.noop',${slot.id},'{}'::jsonb,gen_random_uuid()::text,now()-interval '1 day' FROM generate_series(1,40)`,
  );
  await commerce.runJobs();
  const [offer] = await rows<{ id: string; order_id: string }>(
    db,
    sql`SELECT id,order_id FROM sport_waitlist WHERE user_id=${userId} AND occurrence_id=${slot.id} AND status='offered'`,
  );
  assert.ok(offer);
  const [job] = await rows<{
    id: string;
    payload: TimedJob['payload'];
    processed_at: Date | null;
  }>(
    db,
    sql`SELECT id,payload,processed_at FROM sport_outbox WHERE aggregate_id=${offer.id} AND kind='waitlist.offered'`,
  );
  assert.equal(job.processed_at, null);
  return {
    userId,
    offer,
    job: { ...job, aggregateId: offer.id, kind: 'waitlist.offered' as const },
  };
}

void test('accepted offers remove unread notices and a worker replay does not send a new offer', async () => {
  const { userId, offer, job } = await queuedOffer();
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 1);
  const accepted = await commerce.acceptOffer(userId, offer.id);
  assert.equal(accepted.status, 'paid');
  assert.equal(accepted.payments.length, 0);
  assert.equal((await jobNotices(job)).length, 0);
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
});

void test('expired offers are acknowledged without a late capacity notification', async () => {
  const { offer, job } = await queuedOffer();
  await db.execute(
    sql`UPDATE sport_waitlist SET offer_expires_at=now()-interval '1 second' WHERE id=${offer.id}`,
  );
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
  await drain(job);
});

void test('withdrawal preserves read offer history while suppressing leased work', async () => {
  const { userId, offer, job } = await queuedOffer();
  await deliverTimeSensitiveNotification(db, job);
  const [notice] = await jobNotices(job);
  assert.ok(notice);
  await db.execute(
    sql`UPDATE sport_notifications SET read_at=now() WHERE id=${notice.id}`,
  );
  await commerce.withdraw(userId, offer.id);
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 1);
  assert.ok((await jobNotices(job))[0].read_at);
});

void test('cancelled offer orders retire unread notices even before the waitlist status changes', async () => {
  const { offer, job } = await queuedOffer();
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 1);
  await db.transaction((tx) =>
    commerce.cancelHostedOrder(tx, offer.order_id, 'Cancelled offer test'),
  );
  await deliverTimeSensitiveNotification(db, job);
  assert.equal((await jobNotices(job)).length, 0);
});

void test('migration retargets legacy pending reminders without changing delivered history', async () => {
  const reserved = await booking(),
    deliveredKey = randomUUID(),
    legacyKey = randomUUID();
  await db.execute(sql`INSERT INTO sport_outbox(kind,aggregate_id,source_key,payload,due_at,processed_at) VALUES
    ('reservation.reminder',${reserved.reservationId},${deliveredKey},'{}',now()-interval '1 day',now()),
    ('reservation.reminder',${reserved.reservationId},${legacyKey},'{}',now()-interval '1 day',null)`);
  const migration = await readFile(
    resolve(
      __dirname,
      '../database/migrations/0030_sports_reminder_context.sql',
    ),
    'utf8',
  );
  await db.execute(sql.raw(migration.split('--> statement-breakpoint')[0]));
  const [pending] = await rows<{ occurrence_id: string; correct: boolean }>(
    db,
    sql`SELECT j.payload->>'occurrenceId' occurrence_id,j.due_at=o.start_at-interval '1 hour' correct FROM sport_outbox j JOIN sport_occurrences o ON o.id=${reserved.slot.id} WHERE j.source_key=${legacyKey}`,
  );
  assert.equal(pending.occurrence_id, reserved.slot.id);
  assert.equal(pending.correct, true);
  const [delivered] = await rows<{ payload: unknown }>(
    db,
    sql`SELECT payload FROM sport_outbox WHERE source_key=${deliveredKey}`,
  );
  assert.deepEqual(delivered.payload, {});
});

type OrderJob = Parameters<typeof deliverOrderNotification>[1];
async function orderJob(orderId: string, kind: OrderNoticeKind) {
  const jobs = await rows<{ id: string; payload: OrderJob['payload'] }>(
    db,
    sql`SELECT id,payload FROM sport_outbox WHERE aggregate_id=${orderId} AND kind=${kind} AND processed_at IS NULL`,
  );
  assert.equal(jobs.length, 1, `Exactly one pending ${kind} job`);
  return { ...jobs[0], aggregateId: orderId, kind };
}
async function orderJobNotices(job: OrderJob, userId: string) {
  return rows<{ id: string; title: string }>(
    db,
    sql`SELECT id,title FROM sport_notifications WHERE source_key=${`${job.id}:${userId}`}`,
  );
}
async function paidBooking() {
  const reserved = await booking(false, false, '1000000');
  await commerce.startPayment(
    reserved.userId,
    reserved.order.id,
    'success',
    randomUUID(),
  );
  const paid = await commerce.verifyPayment(reserved.userId, reserved.order.id);
  assert.equal(paid.status, 'paid');
  return { ...reserved, order: paid };
}

void test('approval notices reflect current state and unread pending requests are retired on approval', async () => {
  const reserved = await booking(false, true),
    pending = await orderJob(reserved.order.id, 'order.confirmed');
  await deliverOrderNotification(db, pending);
  assert.match(
    (await orderJobNotices(pending, reserved.userId))[0].title,
    /انتظار تأیید/,
  );
  await db.transaction((tx) =>
    commerce.approveHostedOrder(tx, reserved.order.id),
  );
  assert.equal((await orderJobNotices(pending, reserved.userId)).length, 0);
  const confirmed = await orderJob(reserved.order.id, 'order.confirmed');
  await deliverOrderNotification(db, confirmed);
  assert.equal(
    (await orderJobNotices(confirmed, reserved.userId))[0].title,
    'خرید شما ثبت شد',
  );
  await deliverOrderNotification(db, pending);
  assert.equal((await orderJobNotices(pending, reserved.userId)).length, 0);
});

void test('cancelled orders retire queued confirmations and zero-money cancellations create no refund work', async () => {
  const reserved = await booking(),
    job = await orderJob(reserved.order.id, 'order.confirmed');
  await commerce.cancel(
    reserved.userId,
    reserved.reservationId,
    Number(reserved.order.reservations[0].revision),
  );
  await deliverOrderNotification(db, job);
  assert.equal((await orderJobNotices(job, reserved.userId)).length, 0);
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT id FROM sport_outbox WHERE aggregate_id=${reserved.order.id} AND kind='refund.process'`,
      )
    ).length,
    0,
  );
  // Old releases may already have persisted a zero-refund job; it must ack silently.
  await commerce.event(db, 'refund.process', reserved.order.id, randomUUID());
  const legacy = await orderJob(reserved.order.id, 'refund.process');
  await drain(legacy);
  assert.equal((await orderJobNotices(legacy, reserved.userId)).length, 0);
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT id FROM sport_notifications WHERE user_id=${reserved.userId} AND source_key LIKE 'refund:%'`,
      )
    ).length,
    0,
  );
});

void test('membership activation has its own notice and a single active entitlement', async () => {
  const userId = await person(),
    created = await service({ kind: 'membership', sessionCount: 4 });
  const order = await commerce.checkout(userId, {
    serviceId: created.id,
    idempotencyKey: randomUUID(),
  });
  const job = await orderJob(order.id, 'order.confirmed');
  await deliverOrderNotification(db, job);
  await deliverOrderNotification(db, job);
  const notices = await orderJobNotices(job, userId);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].title, 'عضویت شما فعال شد');
  const memberships = await rows<{ status: string; granted: number }>(
    db,
    sql`SELECT status,granted FROM sport_memberships WHERE order_id=${order.id}`,
  );
  assert.deepEqual(memberships, [{ status: 'active', granted: 4 }]);
});

void test('cancellation preserves read confirmation history and removes unread confirmation notices', async () => {
  const read = await booking(),
    unread = await booking();
  const first = await orderJob(read.order.id, 'order.confirmed'),
    second = await orderJob(unread.order.id, 'order.confirmed');
  await deliverOrderNotification(db, first);
  await deliverOrderNotification(db, second);
  await db.execute(
    sql`UPDATE sport_notifications SET read_at=now() WHERE source_key=${`${first.id}:${read.userId}`}`,
  );
  await commerce.cancel(
    read.userId,
    read.reservationId,
    Number(read.order.reservations[0].revision),
  );
  await commerce.cancel(
    unread.userId,
    unread.reservationId,
    Number(unread.order.reservations[0].revision),
  );
  assert.equal((await orderJobNotices(first, read.userId)).length, 1);
  assert.equal((await orderJobNotices(second, unread.userId)).length, 0);
});

void test('successful refunds emit one notice per refund across different jobs and preserve the financial total', async () => {
  const reserved = await paidBooking();
  await commerce.cancel(
    reserved.userId,
    reserved.reservationId,
    Number(reserved.order.reservations[0].revision),
  );
  const job = await orderJob(reserved.order.id, 'refund.process');
  assert.ok(job.payload.refundId);
  // The record is still requested; success must never be announced early.
  await deliverOrderNotification(db, job);
  const key = `refund:${job.payload.refundId}:${reserved.userId}`;
  const notices = () =>
    rows(db, sql`SELECT id FROM sport_notifications WHERE source_key=${key}`);
  assert.equal((await notices()).length, 0);
  await drain(job);
  assert.equal((await notices()).length, 1);
  await commerce.event(
    db,
    'refund.process',
    reserved.order.id,
    randomUUID(),
    undefined,
    job.payload,
  );
  const replay = await orderJob(reserved.order.id, 'refund.process');
  await drain(replay);
  assert.equal((await notices()).length, 1);
  const order = await commerce.myOrder(reserved.userId, reserved.order.id);
  assert.equal(order.status, 'refunded');
  assert.equal(order.refunded_minor, '1000000');
  const [total] = await rows<{ count: number }>(
    db,
    sql`SELECT count(*)::int count FROM sport_journals WHERE order_id=${order.id} AND source_key=${`refund:${job.payload.refundId}`}`,
  );
  assert.equal(total.count, 1);
});

void test('refund payload cannot deliver or process a refund belonging to another order', async () => {
  const reserved = await paidBooking(),
    other = await booking();
  await commerce.cancel(
    reserved.userId,
    reserved.reservationId,
    Number(reserved.order.reservations[0].revision),
  );
  const real = await orderJob(reserved.order.id, 'refund.process');
  // Keep the legitimate job out of this batch so it cannot hide a scope failure.
  await db.execute(
    sql`UPDATE sport_outbox SET due_at=now()+interval '1 day' WHERE id=${real.id}`,
  );
  await commerce.event(
    db,
    'refund.process',
    other.order.id,
    randomUUID(),
    undefined,
    real.payload,
  );
  const incorrect = await orderJob(other.order.id, 'refund.process');
  await deliverOrderNotification(db, incorrect);
  assert.equal(await countNotices(other.userId), 0);
  await drain(incorrect);
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT id FROM sport_notifications WHERE user_id=${other.userId} AND source_key LIKE 'refund:%'`,
      )
    ).length,
    0,
  );
  assert.equal(
    (await commerce.myOrder(other.userId, other.order.id)).refunded_minor,
    '0',
  );
  const [untouched] = await rows<{ state: string }>(
    db,
    sql`SELECT state FROM sport_refunds WHERE id=${real.payload.refundId}`,
  );
  assert.equal(untouched.state, 'requested');
  await db.execute(
    sql`UPDATE sport_outbox SET due_at=now() WHERE id=${real.id}`,
  );
});

void test('legacy job notices survive retries without a duplicate canonical refund notice', async () => {
  const reserved = await paidBooking();
  await commerce.cancel(
    reserved.userId,
    reserved.reservationId,
    Number(reserved.order.reservations[0].revision),
  );
  const real = await orderJob(reserved.order.id, 'refund.process');
  await state(db, reserved.userId, 'pending');
  await drain(real); // Complete the refund with delivery suppressed by account state.
  await state(db, reserved.userId, 'active');
  await commerce.event(db, 'refund.process', reserved.order.id, randomUUID());
  const legacy = await orderJob(reserved.order.id, 'refund.process');
  await deliverSportsNotification(db, {
    userId: reserved.userId,
    title: 'Legacy committed refund notice',
    body: '',
    href: `/orders/detail?id=${reserved.order.id}`,
    sourceKey: `${legacy.id}:${reserved.userId}`,
  });
  await drain(legacy);
  assert.equal((await orderJobNotices(legacy, reserved.userId)).length, 1);
  assert.equal(
    (
      await rows(
        db,
        sql`SELECT id FROM sport_notifications WHERE source_key=${`refund:${real.payload.refundId}:${reserved.userId}`}`,
      )
    ).length,
    0,
  );
});

void test('late payment review notice disappears after its actual refund completes', async () => {
  const reserved = await booking(false, false, '1000000');
  await commerce.startPayment(
    reserved.userId,
    reserved.order.id,
    'late',
    randomUUID(),
  );
  await db.execute(
    sql`UPDATE sport_orders SET expires_at=now()-interval '1 second' WHERE id=${reserved.order.id}`,
  );
  const reviewed = await commerce.verifyPayment(
    reserved.userId,
    reserved.order.id,
    true,
  );
  assert.equal(reviewed.status, 'review');
  const late = await orderJob(reserved.order.id, 'payment.late'),
    refund = await orderJob(reserved.order.id, 'refund.process');
  await deliverOrderNotification(db, late);
  assert.equal(
    (await orderJobNotices(late, reserved.userId))[0].title,
    'پرداخت شما نیاز به بررسی دارد',
  );
  await drain(refund);
  assert.equal((await orderJobNotices(late, reserved.userId)).length, 0);
  await deliverOrderNotification(db, late);
  assert.equal((await orderJobNotices(late, reserved.userId)).length, 0);
  assert.equal(
    (await commerce.myOrder(reserved.userId, reserved.order.id)).refunded_minor,
    '1000000',
  );
});

void test(
  'confirmation queued behind cancellation cannot outlive the order lock',
  { timeout: 15000 },
  async () => {
    const reserved = await booking(),
      job = await orderJob(reserved.order.id, 'order.confirmed');
    let delivery: Promise<unknown> | undefined;
    await db.transaction(async (tx) => {
      const [holder] = await rows<{ pid: number }>(
        tx,
        sql`SELECT pg_backend_pid() pid`,
      );
      await tx.execute(
        sql`SELECT id FROM sport_orders WHERE id=${reserved.order.id} FOR UPDATE`,
      );
      delivery = deliverOrderNotification(db, job);
      await waitForWaiters(holder.pid, 1);
      await commerce.cancelHostedOrder(
        tx,
        reserved.order.id,
        'Queued notification cancellation',
      );
    });
    await delivery;
    assert.equal((await orderJobNotices(job, reserved.userId)).length, 0);
  },
);

void test(
  'cancellation queued behind confirmation removes its unread notice after commit',
  { timeout: 15000 },
  async () => {
    const reserved = await booking(),
      job = await orderJob(reserved.order.id, 'order.confirmed');
    let delivery: Promise<unknown> | undefined,
      cancellation: Promise<unknown> | undefined;
    await db.transaction(async (tx) => {
      const [holder] = await rows<{ pid: number }>(
        tx,
        sql`SELECT pg_backend_pid() pid`,
      );
      await tx.execute(
        sql`SELECT id FROM users WHERE id=${reserved.userId} FOR UPDATE`,
      );
      delivery = deliverOrderNotification(db, job);
      await waitForWaiters(holder.pid, 1);
      const [sender] = await rows<{ pid: number }>(
        db,
        sql`SELECT pid FROM pg_stat_activity WHERE ${holder.pid}=ANY(pg_blocking_pids(pid))`,
      );
      cancellation = db.transaction((cancel) =>
        commerce.cancelHostedOrder(
          cancel,
          reserved.order.id,
          'Cancellation after delivery',
        ),
      );
      await waitForWaiters(sender.pid, 1);
    });
    await Promise.all([delivery, cancellation]);
    assert.equal((await orderJobNotices(job, reserved.userId)).length, 0);
  },
);

// Real PostgreSQL Web Push queue tests. The browser-vendor HTTP seam is replaced;
// no subscription or private payload leaves this disposable test database.
async function pushDevice() {
  const userId = await person();
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  const [session] = await db
    .insert(schema.authSessions)
    .values({
      userId,
      client: 'application',
      transport: 'web',
      device: 'Isolated push test',
      tokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + 3600000),
    })
    .returning();
  const principal = { user, session };
  const key = webpush.generateVAPIDKeys();
  const pushConfig = new ConfigService<Environment, true>(
    validateEnvironment({
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
      PUSH_PROVIDER: 'web-push',
      WEB_PUSH_PUBLIC_KEY: key.publicKey,
      WEB_PUSH_PRIVATE_KEY: key.privateKey,
    }),
  );
  const sent: { id: string; notificationId: string }[] = [];
  let outcome: PushOutcome = 'accepted';
  const sender = {
    send: (target: PushTarget, notificationId: string) => {
      sent.push({ id: target.id, notificationId });
      return Promise.resolve(outcome);
    },
  } as WebPushSender;
  const service = new WebPushService(database, pushConfig, sender);
  const input = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/' + randomUUID(),
    keys: {
      p256dh: key.publicKey,
      auth: Buffer.alloc(16, 1).toString('base64url'),
    },
    locale: 'fa' as const,
  };
  await service.subscribe(principal, input);
  return {
    principal,
    service,
    sent,
    input,
    setOutcome: (next: PushOutcome) => {
      outcome = next;
    },
  };
}

void test('push queues only future eligible notices, sends once and never replays on subscribe', async () => {
  const p = await pushDevice();
  try {
    const id = await deliverSportsNotification(db, notice(p.principal.user.id));
    assert.ok(id);
    await Promise.all([p.service.drain(), p.service.drain()]);
    assert.equal(p.sent.length, 1);
    assert.equal(p.sent[0].notificationId, id);
    await p.service.drain();
    assert.equal(p.sent.length, 1);
    await p.service.subscribe(p.principal, p.input);
    await p.service.drain();
    assert.equal(p.sent.length, 1);
  } finally {
    await p.service.unsubscribe(p.principal);
  }
});
void test('a different account cannot take over a live browser endpoint', async () => {
  const a = await pushDevice(),
    b = await pushDevice();
  try {
    await assert.rejects(
      b.service.subscribe(b.principal, a.input),
      /pushDeviceAlreadyRegistered/,
    );
    await deliverSportsNotification(db, notice(a.principal.user.id));
    await a.service.drain();
    assert.equal(a.sent.length, 1);
    assert.equal(
      (await a.service.status(a.principal)).subscriptionId,
      a.sent[0].id,
    );
  } finally {
    await a.service.unsubscribe(a.principal);
    await b.service.unsubscribe(b.principal);
  }
});
void test('push rechecks preference withdrawal and notice retirement before vendor delivery', async () => {
  const p = await pushDevice(),
    id = p.principal.user.id;
  try {
    await deliverSportsNotification(db, {
      ...notice(id),
      preference: 'messages',
    });
    await db.execute(
      sql`INSERT INTO sport_notification_preferences(user_id,messages) VALUES(${id},false)`,
    );
    await p.service.drain();
    assert.equal(p.sent.length, 0);
    const readId = await deliverSportsNotification(db, notice(id));
    await db.execute(
      sql`UPDATE sport_notifications SET read_at=now() WHERE id=${readId}`,
    );
    const deletedId = await deliverSportsNotification(db, notice(id));
    await db.execute(
      sql`DELETE FROM sport_notifications WHERE id=${deletedId}`,
    );
    await p.service.drain();
    assert.equal(p.sent.length, 0);
  } finally {
    await p.service.unsubscribe(p.principal);
  }
});
void test('logout and account deletion revoke devices and cascade pending push work', async () => {
  const a = await pushDevice();
  await deliverSportsNotification(db, notice(a.principal.user.id));
  await db.execute(
    sql`UPDATE auth_sessions SET revoked_at=now() WHERE id=${a.principal.session.id}`,
  );
  assert.equal((await a.service.status(a.principal)).subscriptionId, null);
  await a.service.drain();
  assert.equal(a.sent.length, 0);
  const b = await pushDevice();
  await deliverSportsNotification(db, notice(b.principal.user.id));
  await state(db, b.principal.user.id, 'pending');
  assert.equal((await b.service.status(b.principal)).subscriptionId, null);
  await b.service.drain();
  assert.equal(b.sent.length, 0);
});
void test('transient push failures remain durable and expired vendor subscriptions are removed', async () => {
  const p = await pushDevice();
  try {
    p.setOutcome('retry');
    await deliverSportsNotification(db, notice(p.principal.user.id));
    await p.service.drain();
    assert.equal(p.sent.length, 1);
    const { rows } = await db.execute<{
      attempts: number;
      finished_at: Date | null;
    }>(
      sql`SELECT attempts,finished_at FROM web_push_deliveries d JOIN web_push_subscriptions s ON s.id=d.subscription_id WHERE s.session_id=${p.principal.session.id}`,
    );
    assert.equal(rows[0].attempts, 1);
    assert.equal(rows[0].finished_at, null);
    p.setOutcome('accepted');
    await db.execute(
      sql`UPDATE web_push_deliveries d SET due_at=now() FROM web_push_subscriptions s WHERE s.id=d.subscription_id AND s.session_id=${p.principal.session.id}`,
    );
    await p.service.drain();
    assert.equal(p.sent.length, 2);
    p.setOutcome('expired');
    await deliverSportsNotification(db, notice(p.principal.user.id));
    await p.service.drain();
    assert.equal((await p.service.status(p.principal)).subscriptionId, null);
  } finally {
    await p.service.unsubscribe(p.principal);
  }
});
void test('the real server test is device-scoped and rate limited', async () => {
  const p = await pushDevice();
  try {
    assert.equal((await p.service.test(p.principal)).status, 'accepted');
    assert.equal(p.sent.length, 1);
    await assert.rejects(p.service.test(p.principal), /pushTestWait/);
  } finally {
    await p.service.unsubscribe(p.principal);
  }
});
void test('server test never describes a permanent vendor failure as queued', async () => {
  const p = await pushDevice();
  try {
    p.setOutcome('failed');
    assert.equal((await p.service.test(p.principal)).status, 'failed');
  } finally {
    await p.service.unsubscribe(p.principal);
  }
});
