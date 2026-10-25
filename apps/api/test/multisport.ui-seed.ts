import 'reflect-metadata';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
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
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
const url = process.env.TEST_DATABASE_URL;
if (
  !url ||
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith('_multisport_ui_test')
)
  throw new Error('Dedicated local multisport UI database required');
const artifact = resolve(
  process.env.UI_FIXTURE_ARTIFACT_DIR ?? '../../.artifacts/multisport',
);
const data = JSON.parse(
  readFileSync(resolve(artifact, 'ui-fixture.json'), 'utf8'),
) as {
  clubs: { id: string; branches: string[] }[];
  people: { phone: string }[];
};
async function main() {
  const config = new ConfigService<Environment, true>(
      validateEnvironment({
        DATABASE_URL: url,
        NODE_ENV: 'test',
        AUTH_SECRET: 'synthetic-ui-seed-no-real-sms-or-identities-secret',
      }),
    ),
    database = new DatabaseService(config);
  await database.onModuleInit();
  const db = database.db,
    commerce = new CommerceService(
      database,
      new SamanMockPaymentAdapter(config),
    );
  try {
    const [owner] = await rows<{ id: string }>(
        db,
        sql`SELECT id FROM users WHERE phone=${data.people[0].phone}`,
      ),
      [athlete] = await rows<{ id: string }>(
        db,
        sql`SELECT id FROM users WHERE phone=${data.people[2].phone}`,
      );
    const org = data.clubs[0].id,
      branch = data.clubs[0].branches[0];
    await db.execute(
      sql`INSERT INTO coach_profiles(user_id) VALUES(${owner.id}) ON CONFLICT DO NOTHING`,
    );
    await db.execute(
      sql`INSERT INTO coaching_practices(user_id,review_status,review_expires_at,published) VALUES(${owner.id},'approved',now()+interval '1 year',true) ON CONFLICT(user_id) DO NOTHING`,
    );
    await db.execute(
      sql`INSERT INTO branch_coaches(branch_id,coach_id,status) VALUES(${branch},${owner.id},'active') ON CONFLICT DO NOTHING`,
    );
    await db.execute(
      sql`INSERT INTO coaching_relationships(coach_id,student_id,status) VALUES(${owner.id},${athlete.id},'active') ON CONFLICT DO NOTHING`,
    );
    const ids: Record<string, string> = {},
      sports: Record<string, string> = {};
    for (const [key, name] of [
      ['football', 'فوتبال'],
      ['swimming', 'شنا'],
      ['karate', 'کاراته'],
    ] as const) {
      const [sp] = await rows<{ id: string }>(
        db,
        sql`INSERT INTO sports(name,slug) VALUES(${name},${`ui-multisport-${key}-${randomUUID()}`}) RETURNING id`,
      );
      sports[key] = sp.id;
      await db.execute(
        sql`INSERT INTO branch_sports(branch_id,sport_id) VALUES(${branch},${sp.id})`,
      );
    }
    const policy = {
      cancellationHours: 12,
      lateRefundBasisPoints: 0,
      noShowConsumesSession: false,
      consumeOn: 'attendance',
      freezeDays: 7,
      depositBasisPoints: 0,
      guestAllowance: 0,
      transferable: false,
      terms:
        'این داده فقط برای آزمون رابط است. لغو تا دوازده ساعت قبل از شروع بدون هزینه است.',
    };
    for (const [key, title, kind, sport] of [
      ['footballRental', 'رزرو سانس فوتبال', 'court', 'football'],
      ['footballClass', 'کلاس فوتبال نوجوانان', 'class', 'football'],
      ['swimmingTicket', 'بلیط شنای آزاد', 'access', 'swimming'],
      ['swimmingClass', 'دورهٔ آموزش شنا', 'course', 'swimming'],
      ['karateClass', 'دورهٔ کاراته', 'course', 'karate'],
      ['program', 'برنامهٔ آماده‌سازی فوتبال', 'program', 'football'],
    ] as const) {
      const resources =
        kind === 'court'
          ? [
              (
                await commerce.createResource(
                  owner.id,
                  org,
                  branch,
                  'زمین فوتبال آزمایشی',
                  [],
                  randomUUID(),
                )
              ).id,
            ]
          : [];
      const s = await commerce.createService(
        owner.id,
        serviceSchema.parse({
          organizationId: org,
          branchId: branch,
          title,
          kind,
          sportId: sports[sport],
          amountMinor: '1200000',
          resourceIds: resources,
          coachUserId: kind === 'program' ? owner.id : null,
          offering: { audience: 'all', maxTickets: 10, entryAllowed: false },
          policy,
        }),
      );
      ids[key] = s.id;
      await commerce.publish(owner.id, s.id, 1);
      if (kind !== 'program') {
        const start = Date.now() + 86400000;
        await commerce.scheduleSeries(owner.id, s.id, {
          startAt: new Date(start).toISOString(),
          endAt: new Date(start + 3600000).toISOString(),
          capacity: kind === 'court' ? 1 : 15,
          count: kind === 'course' ? 4 : 2,
          intervalDays: 7,
          revision: 2,
          idempotencyKey: randomUUID(),
        });
      }
    }
    const m = await commerce.createService(
      owner.id,
      serviceSchema.parse({
        organizationId: org,
        branchId: branch,
        title: 'عضویت هشت جلسهٔ فوتبال',
        kind: 'membership',
        sportId: sports.football,
        amountMinor: '8000000',
        durationDays: 30,
        sessionCount: 8,
        offering: {
          includedServiceIds: [ids.footballClass],
          entryAllowed: false,
        },
        policy,
      }),
    );
    await commerce.publish(owner.id, m.id, 1);
    ids.membership = m.id;
    writeFileSync(
      resolve(artifact, 'multisport-seed.json'),
      JSON.stringify(
        {
          ids,
          sports,
          ownerPhone: data.people[0].phone,
          athletePhone: data.people[2].phone,
          org,
          branch,
        },
        null,
        2,
      ),
    );
    console.log('Synthetic multisport UI services ready.');
  } finally {
    await database.onApplicationShutdown();
  }
}
void main();
