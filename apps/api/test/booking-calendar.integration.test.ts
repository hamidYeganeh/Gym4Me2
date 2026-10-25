import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { bookingDayFilter } from '../src/modules/commerce/booking-page';

const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('Dedicated _test database required.');
const pool = new Pool({ connectionString: url });
const db = drizzle(pool);
after(() => pool.end());
const events = sql`(VALUES (1,'2026-10-24T20:29:59.999Z'::timestamptz),(2,'2026-10-24T20:30:00Z'::timestamptz),(3,'2026-10-25T08:00:00Z'::timestamptz)) AS q(id,start_at)`;
void test('calendar day filtering uses Tehran midnight before pagination', async () => {
  const previous = await db.execute<{ id: number }>(
    sql`SELECT id FROM ${events} WHERE ${bookingDayFilter('2026-10-24')} ORDER BY start_at`,
  );
  assert.deepEqual(
    previous.rows.map((r) => r.id),
    [1],
  );
  const next = await db.execute<{ id: number }>(
    sql`SELECT id FROM ${events} WHERE ${bookingDayFilter('2026-10-25')} ORDER BY start_at LIMIT 1`,
  );
  assert.deepEqual(
    next.rows.map((r) => r.id),
    [2],
  );
  const all = await db.execute<{ id: number }>(
    sql`SELECT id FROM ${events} WHERE ${bookingDayFilter()} ORDER BY start_at`,
  );
  assert.deepEqual(
    all.rows.map((r) => r.id),
    [1, 2, 3],
  );
});
void test('historical days use Tehran daylight-saving rules rather than a fixed offset', async () => {
  const result = await db.execute<{ id: number }>(
    sql`SELECT id FROM (VALUES (1,'2019-07-24T19:29:59Z'::timestamptz),(2,'2019-07-24T19:30:00Z'::timestamptz)) q(id,start_at) WHERE ${bookingDayFilter('2019-07-25')}`,
  );
  assert.deepEqual(
    result.rows.map((r) => r.id),
    [2],
  );
});
