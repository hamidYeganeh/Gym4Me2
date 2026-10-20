import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { eq, sql } from 'drizzle-orm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import * as schema from '../src/database/schema';
import { seedUiCatalog } from '../test/ui.catalog-fixture';
import { seedUiSports } from '../test/ui.sports-fixture';
import { seedCatalogHours } from '../test/ui.catalog-hours-fixture';
import { CommerceService } from '../src/modules/commerce/commerce.service';
import { StorageService } from '../src/modules/clubs/storage.service';
import { validateEnvironment } from '../src/config/environment';

config({ path: resolve(__dirname, '../.env'), quiet: true });
async function main() {
  const env = validateEnvironment(process.env);
  if (
    !env.DEMO_MODE ||
    process.env.DEMO_PROVISION_CONFIRM !== 'gym4me-demo-postgres'
  )
    throw new Error(
      'Explicit isolated demo provisioning confirmation required',
    );
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  try {
    // Never attach demo authentication to an existing user database.
    const marker = await pool.query<{ marker: string | null }>(
      "select to_regclass('public.gym4me_demo_installation') as marker",
    );
    if (marker.rows[0].marker) {
      const status = await pool.query<{ ready: boolean }>(
        "select ready from gym4me_demo_installation where id = 'isolated-demo-v1'",
      );
      if (status.rows[0]?.ready === true) {
        const existing = await pool.query(
          'select phone, label from gym4me_demo_accounts order by label',
        );
        console.log(JSON.stringify({ accounts: existing.rows, otp: '11111' }));
        return;
      }
    }
    const users = await pool.query<{ count: number }>(
      'select count(*)::int as count from users',
    );
    if (users.rows[0].count !== 0)
      throw new Error('Refusing to seed a non-empty user database');
    if (!marker.rows[0].marker)
      await pool.query(`begin;
      create table gym4me_demo_installation (id text primary key, ready boolean not null default false);
      insert into gym4me_demo_installation(id) values ('isolated-demo-v1');
      create table gym4me_demo_accounts (
        user_id uuid primary key references users(id) on delete cascade,
        phone text unique not null, label text not null);
      create table gym4me_demo_media (
        key text primary key, body bytea not null, content_type text not null,
        modified_at timestamptz not null default now());
      commit;`);
  } finally {
    await pool.end();
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const db = app.get(DatabaseService).db;
    const catalog = await seedUiCatalog(db, env.AUTH_APPLICATION_ORIGIN, true);
    const labels = [
      'مالک باشگاه آفتاب',
      'مالک باشگاه سپیدار',
      'ورزشکار',
      'ادمین',
    ];
    // These are reserved synthetic demo identifiers, never SMS recipients.
    for (const [index, person] of catalog.people.entries()) {
      person.phone = `+98900000000${index + 1}`;
      await db
        .update(schema.users)
        .set({ phone: person.phone })
        .where(eq(schema.users.id, person.id));
      await db.execute(
        sql`insert into gym4me_demo_accounts(user_id, phone, label) values (${person.id}, ${person.phone}, ${labels[index]})`,
      );
    }
    for (const [index, role] of (
      ['manager', 'receptionist', 'accountant'] as const
    ).entries()) {
      const phone = `+98900000000${index + 5}`;
      const [person] = await db
        .insert(schema.users)
        .values({
          phone,
          displayName: {
            manager: 'مدیر آزمایشی',
            receptionist: 'پذیرش آزمایشی',
            accountant: 'حسابدار آزمایشی',
          }[role],
          phoneVerifiedAt: new Date(),
        })
        .returning();
      const [membership] = await db
        .insert(schema.organizationMembers)
        .values({
          organizationId: catalog.clubs[0].id,
          userId: person.id,
          role,
          allBranches: false,
        })
        .returning();
      await db.insert(schema.organizationMemberBranches).values({
        organizationId: catalog.clubs[0].id,
        memberId: membership.id,
        branchId: catalog.clubs[0].branches[0],
      });
      await db.execute(
        sql`insert into gym4me_demo_accounts(user_id, phone, label) values (${person.id}, ${phone}, ${role})`,
      );
    }
    await seedCatalogHours(db, catalog.clubs[0].branches[0]);
    await seedUiSports(
      db,
      app.get(CommerceService),
      catalog.clubs,
      catalog.people,
      app.get(StorageService),
    );
    await db.execute(
      sql`update gym4me_demo_installation set ready = true where id = 'isolated-demo-v1'`,
    );
    const accounts = await db.execute(
      sql`select phone, label from gym4me_demo_accounts order by phone`,
    );
    console.log(JSON.stringify({ accounts: accounts.rows, otp: '11111' }));
  } finally {
    await app.close();
  }
}
void main().catch((error: unknown) => {
  // No database URL, credentials, SQL parameters or driver diagnostics in logs.
  console.error(
    error instanceof Error && /Refusing|Explicit|Incomplete/.test(error.message)
      ? error.message
      : 'Demo provisioning failed; inspect the isolated demo database',
  );
  process.exitCode = 1;
});
