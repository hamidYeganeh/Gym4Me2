import { provisionDemoPh23 } from './provision-demo-ph23';
import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { eq, inArray, sql } from 'drizzle-orm';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import * as schema from '../src/database/schema';
import { seedUiCatalog } from '../test/ui.catalog-fixture';
import { seedUiSports } from '../test/ui.sports-fixture';
import { CommerceService } from '../src/modules/commerce/commerce.service';
import { StorageService } from '../src/modules/clubs/storage.service';
import { validateEnvironment } from '../src/config/environment';

config({ path: resolve(__dirname, '../.env'), quiet: true });
async function provisionDemoCoach(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7088, 8)');
    const existing = await client.query<{ id: string; user_id: string | null }>(
      `SELECT u.id,a.user_id FROM users u LEFT JOIN gym4me_demo_accounts a ON a.user_id=u.id
       WHERE u.phone='+989000000008'`,
    );
    if (existing.rows[0] && !existing.rows[0].user_id)
      throw new Error('Refusing to replace an existing non-demo account');
    const user =
      existing.rows[0] ??
      (
        await client.query<{ id: string }>(
          `INSERT INTO users(phone,display_name,phone_verified_at)
       VALUES('+989000000008','نیلوفر رضایی',now()) RETURNING id`,
        )
      ).rows[0];
    await client.query(
      `INSERT INTO gym4me_demo_accounts(user_id,phone,label)
       VALUES($1,'+989000000008','مربی') ON CONFLICT(user_id) DO NOTHING`,
      [user.id],
    );
    await client.query(
      `INSERT INTO coach_profiles(user_id,biography)
       VALUES($1,'تمرین قدرتی و آمادگی جسمانی با برنامهٔ منظم و پیگیری هفتگی شاگردان')
       ON CONFLICT(user_id) DO NOTHING`,
      [user.id],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
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
    const users = await pool.query<{ count: number }>(
      'select count(*)::int as count from users',
    );
    // Never attach demo authentication to an existing user database.
    const marker = await pool.query<{ marker: string | null }>(
      "select to_regclass('public.gym4me_demo_installation') as marker",
    );
    if (marker.rows[0].marker) {
      const status = await pool.query<{ ready: boolean }>(
        "select ready from gym4me_demo_installation where id = 'isolated-demo-v1'",
      );
      if (status.rows[0]?.ready === true && users.rows[0].count > 0) {
        await provisionDemoCoach(pool);
        await provisionDemoPh23();
        const existing = await pool.query(
          'select phone, label from gym4me_demo_accounts order by label',
        );
        console.log(JSON.stringify({ accounts: existing.rows, otp: '11111' }));
        return;
      }
    }
    if (users.rows[0].count !== 0)
      throw new Error('Refusing to seed a non-empty user database');
    if (marker.rows[0].marker)
      await pool.query(
        "update gym4me_demo_installation set ready = false where id = 'isolated-demo-v1'",
      );
    else
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
    // Presentation data belongs only to the new catalog created in this run.
    const clubIds = catalog.clubs.map((club) => club.id);
    const branchIds = catalog.clubs.flatMap((club) => club.branches);
    const branches = sql.join(
      branchIds.map((id) => sql`${id}`),
      sql`, `,
    );
    await db.execute(
      sql`UPDATE countries SET name='ایران',code=CASE WHEN NOT EXISTS(SELECT 1 FROM countries other WHERE other.code='IR' AND other.id<>${catalog.countryId}) THEN 'IR' ELSE code END WHERE id=${catalog.countryId}`,
    );
    await db
      .update(schema.provinces)
      .set({ name: 'تهران' })
      .where(eq(schema.provinces.id, catalog.provinceId));
    await db
      .update(schema.clubs)
      .set({
        description:
          'فضای تمرین روشن و مجهز با برنامه‌های متنوع، مربیان همراه و تجهیزات کامل.',
      })
      .where(inArray(schema.clubs.id, clubIds));
    await db.execute(
      sql`UPDATE equipments SET name='تردمیل' WHERE id IN(SELECT equipment_id FROM branch_equipments WHERE branch_id IN(${branches}))`,
    );
    await db.execute(
      sql`UPDATE amenities SET name=replace(name,' آزمایشی','') WHERE id IN(SELECT amenity_id FROM branch_amenities WHERE branch_id IN(${branches}))`,
    );
    await db.execute(
      sql`UPDATE accessibility_features SET name=replace(name,' آزمایشی','') WHERE id IN(SELECT feature_id FROM branch_accessibility WHERE branch_id IN(${branches}))`,
    );
    await db.execute(
      sql`UPDATE branch_equipments SET description='تجهیزات هوازی و آمادگی جسمانی' WHERE branch_id IN(${branches})`,
    );
    await db.execute(
      sql`UPDATE club_tariff_versions SET conditions='هماهنگی با پذیرش پیش از مراجعه و همراه داشتن لباس ورزشی مناسب الزامی است.' WHERE group_id IN(SELECT id FROM club_tariff_groups WHERE branch_id IN(${branches}))`,
    );
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
        .set({
          phone: person.phone,
          displayName: [
            'حمید یگانه',
            'سارا نادری',
            'آرین رضایی',
            'مدیریت جیم‌فورمی',
          ][index],
        })
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
            manager: 'مهدی کاویانی',
            receptionist: 'نیما کاظمی',
            accountant: 'نگار احمدی',
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
    await seedUiSports(
      db,
      app.get(CommerceService),
      catalog.clubs,
      catalog.people,
      app.get(StorageService),
      {
        presentation: {
          coachName: 'گروه مربیان آفتاب',
          terms:
            'لغو تا ۱۲ ساعت پیش از شروع بدون هزینه است. همراه داشتن لباس ورزشی مناسب ضروری است. در این پرداخت پولی از حساب بانکی کسر نمی‌شود.',
        },
      },
    );
    await db.execute(
      sql`update gym4me_demo_installation set ready = true where id = 'isolated-demo-v1'`,
    );
    const coachPool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
    try {
      await provisionDemoCoach(coachPool);
    } finally {
      await coachPool.end();
    }
    await provisionDemoPh23();
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
