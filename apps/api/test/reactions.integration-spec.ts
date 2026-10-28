import { NotFoundException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import type { DatabaseService } from '../src/database/database.service';
import {
  reactionSchema,
  ReviewReactionsService,
} from '../src/modules/reviews/reactions';

// This suite requires a disposable, explicitly selected test database.
const url = process.env.TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('review reaction persistence', () => {
  let pool: Pool;
  let service: ReviewReactionsService;
  const actor = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const review = '00000000-0000-4000-8000-000000000003';
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('Dedicated _test database required');
    pool = new Pool({ connectionString: url, max: 1 });
    // Validate the complete migration chain, including the new reaction tables.
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(__dirname, '../database/migrations'),
    });
    // Small isolated fixtures exercise the service without unrelated catalog setup.
    await pool.query('CREATE SCHEMA reaction_fixture');
    await pool.query('SET search_path TO reaction_fixture');
    await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY);
      CREATE TABLE club_reviews(id uuid PRIMARY KEY, status text);
      CREATE TABLE sport_reservations(id uuid PRIMARY KEY, status text);
      CREATE TABLE coaching_reviews(id uuid PRIMARY KEY, reservation_id uuid, published boolean, hidden boolean);
      INSERT INTO users VALUES ('${actor}'), ('${other}');
      INSERT INTO club_reviews VALUES ('${review}', 'published');
      INSERT INTO sport_reservations VALUES ('${review}', 'completed');
      INSERT INTO coaching_reviews VALUES ('${review}', '${review}', true, false);`);
    await pool.query(
      await readFile(
        resolve(__dirname, '../database/migrations/0059_review_reactions.sql'),
        'utf8',
      ),
    );
    service = new ReviewReactionsService({
      db: drizzle(pool),
    } as unknown as DatabaseService);
  }, 30000);
  afterAll(async () => {
    if (pool) {
      await pool.query('DROP SCHEMA IF EXISTS reaction_fixture CASCADE');
      await pool.end();
    }
  });
  it.each(['club', 'coach'] as const)(
    '%s allows users without bookings, counts idempotently, and scopes removal',
    async (kind) => {
      await service.set(kind, review, actor, { emoji: '❤️', active: true });
      await service.set(kind, review, actor, { emoji: '❤️', active: true });
      expect(await service.list(kind, review)).toEqual([
        { emoji: '❤️', count: 1, mine: false },
      ]);
      expect(await service.list(kind, review, actor)).toEqual([
        { emoji: '❤️', count: 1, mine: true },
      ]);
      await service.set(kind, review, other, { emoji: '❤️', active: false });
      expect((await service.list(kind, review))[0].count).toBe(1);
      await service.set(kind, review, other, { emoji: '❤️', active: true });
      expect((await service.list(kind, review))[0].count).toBe(2);
      await service.set(kind, review, actor, { emoji: '❤️', active: false });
      expect(await service.list(kind, review, actor)).toEqual([
        { emoji: '❤️', count: 1, mine: false },
      ]);
    },
  );
  it('rejects hidden reviews and incomplete coach sessions', async () => {
    await pool.query("UPDATE club_reviews SET status='hidden'");
    await expect(
      service.set('club', review, actor, { emoji: '👍', active: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await pool.query("UPDATE sport_reservations SET status='booked'");
    await expect(service.list('coach', review)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await pool.query(
      "UPDATE sport_reservations SET status='completed'; UPDATE coaching_reviews SET hidden=true",
    );
    await expect(service.list('coach', review)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it('validates the emoji and explicit desired state', () => {
    expect(
      reactionSchema.safeParse({ emoji: 'invalid', active: true }).success,
    ).toBe(false);
    expect(reactionSchema.safeParse({ emoji: '❤️' }).success).toBe(false);
  });
});
