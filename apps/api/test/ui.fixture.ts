import { seedUiCatalog } from './ui.catalog-fixture';
import { mkdirSync, writeFileSync } from 'node:fs';
// Isolated local UI verification. No production database or live SMS adapter.
import { BadRequestException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { eq, or } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { randomBytes, randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import * as s from '../src/database/schema';
import { AuthModule } from '../src/modules/auth/auth.module';
import { KavenegarService } from '../src/modules/auth/kavenegar.service';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { SystemModule } from '../src/modules/system/system.module';
import { configureApi } from '../src/platform/http/configure-api';
async function main() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ??
    'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test';
  const destination = new URL(databaseUrl);
  if (
    !destination.pathname.endsWith('_test') ||
    !['localhost', '127.0.0.1'].includes(destination.hostname)
  )
    throw new Error('Local _test database required.');
  const phone = `+9890${randomInt(100000000).toString().padStart(8, '0')}`;
  const allowedPhones = new Set([phone]);
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () =>
            validateEnvironment({
              NODE_ENV: 'test',
              DATABASE_URL: databaseUrl,
              AUTH_SECRET: randomBytes(48).toString('hex'),
              RETENTION_ENABLED: 'false',
              AUTH_APPLICATION_ORIGIN: 'http://127.0.0.1:7081',
              AUTH_BUSINESS_ORIGIN: 'http://127.0.0.1:7083',
              AUTH_ADMIN_ORIGIN: 'http://127.0.0.1:7082',
              S3_ENDPOINT: 'http://127.0.0.1:8333',
              S3_ACCESS_KEY_ID: 'gym4me_local',
              S3_SECRET_ACCESS_KEY: 'gym4me_local_storage',
              S3_BUCKET: 'gym4me-test',
            }),
        ],
      }),
      AuthModule,
      WorkspacesModule,
      SystemModule,
    ],
  })
    .overrideProvider(KavenegarService)
    .useValue({
      sendOtp: (number: string, code: string) => {
        if (!allowedPhones.has(number))
          throw new BadRequestException('Backend.requestFailed');
        console.log(`LOCAL QA OTP: ${code}`);
        return Promise.resolve();
      },
    })
    .compile();
  const app = module.createNestApplication();
  const db = module.get(DatabaseService).db;
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  const catalog = await seedUiCatalog(db);
  catalog.people.forEach((person) => allowedPhones.add(person.phone));
  const artifactDir = resolve(__dirname, '../../../.artifacts');
  mkdirSync(artifactDir, { recursive: true, mode: 0o700 });
  writeFileSync(
    resolve(artifactDir, 'ui-fixture.json'),
    JSON.stringify(
      {
        phone,
        clubs: catalog.clubs,
        people: catalog.people.map(({ phone, displayName }) => ({
          phone,
          displayName,
        })),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  configureApi(app, {
    corsOrigins: [
      'http://127.0.0.1:7081',
      'http://127.0.0.1:7082',
      'http://127.0.0.1:7083',
    ],
    docsEnabled: true,
  });
  await app.listen(7088, '127.0.0.1');
  console.log(
    `LOCAL UI FIXTURE READY: phone ${phone}. Open http://127.0.0.1:7081/login. SMS is mocked; all writes use gym4me_test.`,
  );
  let stopped = false;
  const stop = async () => {
    if (stopped) return;
    stopped = true;
    try {
      await catalog.cleanup();
      const [user] = await db
        .select({ id: s.users.id })
        .from(s.users)
        .where(eq(s.users.phone, phone));
      if (user) {
        await db
          .delete(s.auditEvents)
          .where(
            or(
              eq(s.auditEvents.actorId, user.id),
              eq(s.auditEvents.targetId, user.id),
            ),
          );
        await db.delete(s.users).where(eq(s.users.id, user.id));
      }
      await db.delete(s.otpChallenges).where(eq(s.otpChallenges.phone, phone));
    } finally {
      await app.close();
    }
  };
  process.once('SIGINT', () => {
    void stop();
  });
  process.once('SIGTERM', () => {
    void stop();
  });
}
void main().catch(() => {
  console.error(
    'Local UI fixture failed. Production data and SMS were not used.',
  );
  process.exitCode = 1;
});
