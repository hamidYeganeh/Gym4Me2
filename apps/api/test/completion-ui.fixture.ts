import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { randomUUID, randomInt } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { SystemModule } from '../src/modules/system/system.module';
import { KavenegarService } from '../src/modules/auth/kavenegar.service';
import { configureApi } from '../src/platform/http/configure-api';
import {
  CommerceService,
  rows,
} from '../src/modules/commerce/commerce.service';
import { serviceSchema } from '../src/modules/commerce/commerce.contracts';
import { PrivacyService } from '../src/modules/profile/privacy.service';
import { CrmService } from '../src/modules/growth/crm.service';
import { GrowthDiscoveryService } from '../src/modules/growth/discovery.service';
import { TrainingService } from '../src/modules/training/training.service';
import { planContent } from '../src/modules/training/training.contracts';
import { NetworkCreditService } from '../src/modules/growth/credit.service';
async function main() {
  const url = process.env.COMPLETION_UI_DATABASE_URL;
  if (
    !url ||
    new URL(url).hostname !== '127.0.0.1' ||
    !new URL(url).pathname.endsWith('_completion_ui_test')
  )
    throw new Error('Isolated local completion UI database required');
  const artifacts = resolve('../../.artifacts/completion');
  mkdirSync(artifacts, { recursive: true, mode: 0o700 });
  const allowed = new Set<string>();
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () =>
            validateEnvironment({
              DATABASE_URL: url,
              NODE_ENV: 'test',
              AUTH_SECRET: randomUUID() + randomUUID(),
              AUTH_APPLICATION_ORIGIN: 'http://localhost:7094',
              AUTH_BUSINESS_ORIGIN: 'http://localhost:7093',
              AUTH_ADMIN_ORIGIN: 'http://localhost:7095',
              PUBLIC_API_ORIGIN: 'http://127.0.0.1:7098',
              RETENTION_ENABLED: 'false',
            }),
        ],
      }),
      WorkspacesModule,
      SystemModule,
    ],
  })
    .overrideProvider(KavenegarService)
    .useValue({
      sendOtp: (phone: string, code: string) => {
        if (!allowed.has(phone)) throw new Error('Synthetic accounts only');
        writeFileSync(
          resolve(artifacts, 'otp.json'),
          JSON.stringify({ phone, code }),
          { mode: 0o600 },
        );
        return Promise.resolve();
      },
    })
    .compile();
  const database = module.get(DatabaseService),
    db = database.db;
  await migrate(db, { migrationsFolder: resolve('database/migrations') });
  async function person(name: string) {
    const phone = `+9890${randomInt(10000000, 99999999)}`;
    allowed.add(phone);
    const [u] = await rows<{ id: string; phone: string }>(
      db,
      sql`INSERT INTO users(phone,display_name,phone_verified_at) VALUES(${phone},${name},now()) RETURNING id,phone`,
    );
    const policy = module.get(PrivacyService).policy();
    await db.execute(
      sql`INSERT INTO account_preferences(user_id,accepted_policy_version,accepted_at,adult_confirmed_at,confirmed_minimum_age,marketing_consent) VALUES(${u.id},${policy.version},now(),now(),${policy.minimumAge},true)`,
    );
    return u;
  }
  const owner = await person('Synthetic branch owner'),
    athlete = await person('Synthetic athlete');
  const [org] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO organizations(name,slug,status) VALUES('باشگاه آزمایشی تکمیل',${randomUUID()},'approved') RETURNING id`,
  );
  await db.execute(
    sql`INSERT INTO organization_members(organization_id,user_id,role,all_branches) VALUES(${org.id},${owner.id},'owner',true)`,
  );
  await db.execute(
    sql`INSERT INTO clubs(id,owner_id,publication_status) VALUES(${org.id},${owner.id},'published')`,
  );
  const [branch] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO branches(organization_id,name,slug) VALUES(${org.id},'شعبه آزمایشی',${randomUUID()}) RETURNING id`,
  );
  await db.execute(
    sql`INSERT INTO branch_profiles(club_id,branch_id) VALUES(${org.id},${branch.id})`,
  );
  const commerce = module.get(CommerceService),
    policy = {
      cancellationHours: 1,
      lateRefundBasisPoints: 5000,
      noShowConsumesSession: false,
      consumeOn: 'attendance',
      freezeDays: 0,
      depositBasisPoints: 0,
      guestAllowance: 0,
      transferable: false,
      terms: 'شرایط ساختگی آزمون مرورگر؛ هیچ وجه واقعی دریافت نمی‌شود.',
    };
  const service = await commerce.createService(
    owner.id,
    serviceSchema.parse({
      organizationId: org.id,
      branchId: branch.id,
      title: 'کلاس آزمایشی تازه‌کار',
      description: 'آزمون جست‌وجو و ظرفیت کلاس',
      kind: 'class',
      level: 'beginner',
      amountMinor: '200000',
      policy,
    }),
  );
  await commerce.publish(owner.id, service.id, 1);
  const occurrence = await commerce.schedule(owner.id, service.id, {
    startAt: new Date(Date.now() + 86400000).toISOString(),
    endAt: new Date(Date.now() + 90000000).toISOString(),
    capacity: 8,
  });
  await module.get(GrowthDiscoveryService).saveOffer(owner.id, {
    operationId: randomUUID(),
    occurrenceId: occurrence.id,
    discountBasisPoints: 2000,
    maxUses: 4,
    endsAt: new Date(Date.now() + 7200000).toISOString(),
    revision: 0,
    active: true,
  });
  const courtResource = await commerce.createResource(
    owner.id,
    org.id,
    branch.id,
    'زمین آزمایشی بازی',
    [],
    randomUUID(),
  );
  const court = await commerce.createService(
    owner.id,
    serviceSchema.parse({
      organizationId: org.id,
      branchId: branch.id,
      title: 'زمین آزمایشی بازی گروهی',
      kind: 'court',
      resourceIds: [courtResource.id],
      amountMinor: '300000',
      policy,
    }),
  );
  await commerce.publish(owner.id, court.id, 1);
  const courtOccurrence = await commerce.schedule(owner.id, court.id, {
    startAt: new Date(Date.now() + 172800000).toISOString(),
    endAt: new Date(Date.now() + 176400000).toISOString(),
    capacity: 1,
  });
  await module.get(CrmService).createLead(owner.id, {
    operationId: randomUUID(),
    organizationId: org.id,
    branchId: branch.id,
    name: 'مخاطب آزمایشی',
    phone: athlete.phone,
    stage: 'trial',
    note: 'پیگیری ساختگی برای آزمون رابط',
    followUpAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const credit = module.get(NetworkCreditService),
    network = await credit.create(owner.id, {
      operationId: randomUUID(),
      organizationId: org.id,
      name: 'شبکه آزمایشی',
      terms: 'اعتبار ساختگی مخصوص آزمون رابط و بدون دریافت وجه واقعی.',
    });
  await credit.grant(owner.id, String(network.id), {
    operationId: randomUUID(),
    userId: athlete.id,
    amountMinor: '1000000',
    receipt: randomUUID(),
    reason: 'Synthetic browser fixture credit, no money received',
  });
  const training = module.get(TrainingService),
    plan = randomUUID();
  await training.save(athlete.id, {
    id: plan,
    operationId: randomUUID(),
    revision: 0,
    isTemplate: false,
    relationshipId: null,
    content: planContent.parse({
      title: 'برنامه آزمایشی خانه',
      note: 'داده ساختگی برای آزمون PDF و اجرای تمرین.',
      nutrition: 'متن نمونه تغذیه برای آزمون فایل؛ توصیه غذایی واقعی نیست.',
      days: [
        {
          name: 'روز اول',
          exercises: [
            {
              id: randomUUID(),
              exerciseId: 'squat',
              sets: 2,
              reps: 8,
              seconds: null,
              load: null,
              restSeconds: 45,
              note: 'آزمون نمایش ویدیو و زیرنویس',
              group: 'single',
              groupId: '',
            },
          ],
        },
      ],
    }),
  });
  await training.publish(athlete.id, plan, {
    operationId: randomUUID(),
    revision: 1,
    effectiveFrom: '2026-01-01',
  });
  writeFileSync(
    resolve(artifacts, 'ui.json'),
    JSON.stringify({
      owner,
      athlete,
      organizationId: org.id,
      branchId: branch.id,
      serviceId: service.id,
      occurrenceId: occurrence.id,
      courtServiceId: court.id,
      courtOccurrenceId: courtOccurrence.id,
    }),
    { mode: 0o600 },
  );
  const app = module.createNestApplication();
  configureApi(app, {
    corsOrigins: ['http://localhost:7093', 'http://localhost:7094'],
    docsEnabled: false,
  });
  await app.listen(7098, '127.0.0.1');
  console.log(
    'Completion UI fixture ready on 7098; all accounts and payments are synthetic.',
  );
  const stop = async () => {
    await app.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void stop());
  process.once('SIGINT', () => void stop());
}
void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
