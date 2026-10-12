import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import { branches, organizations, users } from '../src/database/schema';

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test';
if (!new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error(
    'Integration tests require a dedicated database ending in _test',
  );
}
const database = new DatabaseService(
  new ConfigService(
    validateEnvironment({ DATABASE_URL: databaseUrl, NODE_ENV: 'test' }),
  ),
);
const organizationId = randomUUID();
const secondOrganizationId = randomUUID();
const userId = randomUUID();
const prefix = `infra-${randomUUID()}`;

before(async () => {
  await database.onModuleInit();
  const options = {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  };
  await migrate(database.db, options);
  await migrate(database.db, options);
  await database.db.insert(organizations).values([
    { id: organizationId, name: 'Infrastructure test', slug: prefix },
    {
      id: secondOrganizationId,
      name: 'Other test organization',
      slug: `${prefix}-other`,
    },
  ]);
});

after(async () => {
  try {
    for (const id of [organizationId, secondOrganizationId]) {
      await database.db.delete(branches).where(eq(branches.organizationId, id));
      await database.db.delete(organizations).where(eq(organizations.id, id));
    }
    await database.db.delete(users).where(eq(users.id, userId));
  } finally {
    await database.onApplicationShutdown();
  }
});

void test('readiness checks the migrated PostgreSQL schema', async () => {
  await database.checkReadiness();
});

void test('a failed transaction rolls back all of its writes', async () => {
  const failure = new Error('Intentional rollback');
  await assert.rejects(
    database.db.transaction(async (tx) => {
      await tx.insert(users).values({ id: userId, phone: '+989000000001' });
      await tx
        .insert(branches)
        .values({ organizationId, name: 'Rolled back', slug: 'rollback' });
      throw failure;
    }),
    (error) => error === failure,
  );
  assert.equal(
    (await database.db.select().from(users).where(eq(users.id, userId))).length,
    0,
  );
  assert.equal(
    (
      await database.db
        .select()
        .from(branches)
        .where(eq(branches.organizationId, organizationId))
    ).length,
    0,
  );
});

void test('branch slugs are unique within an organization, not across organizations', async () => {
  await database.db
    .insert(branches)
    .values({ organizationId, name: 'Main', slug: 'main' });
  await assert.rejects(async () => {
    await database.db
      .insert(branches)
      .values({ organizationId, name: 'Duplicate', slug: 'main' });
  });
  await database.db.insert(branches).values({
    organizationId: secondOrganizationId,
    name: 'Main',
    slug: 'main',
  });
});

void test('a branch cannot refer to an organization that does not exist', async () => {
  await assert.rejects(async () => {
    await database.db
      .insert(branches)
      .values({ organizationId: randomUUID(), name: 'Orphan', slug: 'orphan' });
  });
});
