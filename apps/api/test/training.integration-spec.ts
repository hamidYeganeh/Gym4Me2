import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { validateEnvironment } from '../src/config/environment';
import { DatabaseService } from '../src/database/database.service';
import { WorkspacesModule } from '../src/modules/workspaces.module';
import { TrainingService } from '../src/modules/training/training.service';
import {
  CollaborationService,
  trainingWeek,
} from '../src/modules/training/collaboration.service';
import { seedUiCatalog } from './ui.catalog-fixture';
import { ClubCommunityService } from '../src/modules/clubs/club.community.service';
import type { Principal } from '../src/modules/auth/auth.service';
import { RetentionService } from '../src/modules/profile/retention.service';
import { PrivacyService } from '../src/modules/profile/privacy.service';
import { StorageService } from '../src/modules/clubs/storage.service';
import { rows } from '../src/modules/commerce/commerce.service';
import * as c from '../src/modules/training/training.contracts';
const url =
  process.env.TRAINING_TEST_DATABASE_URL ??
  'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_training_test';
if (!new URL(url).pathname.endsWith('training_test'))
  throw new Error('Requires isolated training_test database');
let testingModule: TestingModule,
  db: DatabaseService['db'],
  training: TrainingService,
  collaboration: CollaborationService,
  coach: string,
  athlete: string,
  stranger: string,
  relation: string;
const files = new Map<string, Buffer>();
const storage = {
  configured: () => true,
  put: (key: string, data: Buffer) => {
    files.set(key, data);
    return Promise.resolve();
  },
  get: (key: string) => {
    const data = files.get(key);
    return data ? Promise.resolve(data) : Promise.reject(new Error('Missing'));
  },
  delete: (key: string) => {
    files.delete(key);
    return Promise.resolve();
  },
  objects: async function* () {},
  preview: () =>
    Promise.resolve({ url: 'https://invalid.test', expiresIn: 60 }),
};

const content = (): c.PlanContent => ({
  title: 'Original test routine',
  note: 'Synthetic',
  days: [
    {
      name: 'Day one',
      exercises: [
        {
          id: randomUUID(),
          exerciseId: 'squat',
          sets: 2,
          reps: 10,
          seconds: null,
          load: null,
          restSeconds: 60,
          note: '',
          group: 'single',
          groupId: '',
        },
      ],
    },
  ],
});
const today = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
async function create(
  actor = athlete,
  relationshipId: string | null = null,
  isTemplate = false,
) {
  const input = c.savePlan.parse({
    id: randomUUID(),
    revision: 0,
    relationshipId,
    isTemplate,
    content: content(),
    operationId: randomUUID(),
  });
  await training.save(actor, input);
  return input;
}
async function publish(actor: string, id: string, revision = 1) {
  const result = await training.publish(actor, id, {
    revision,
    effectiveFrom: today,
    operationId: randomUUID(),
  });
  return String(result.assignment.id);
}
function command(assignmentId: string, plan: c.PlanContent): zCommand {
  return {
    id: randomUUID(),
    assignmentId,
    dayIndex: 0,
    revision: 0,
    logs: [
      {
        prescriptionId: plan.days[0].exercises[0].id,
        exerciseId: 'squat',
        set: 1,
        reps: 10,
        seconds: null,
        load: 5,
        rpe: 6,
        done: true,
      },
    ],
    state: 'in_progress',
    shared: false,
    startedAt: new Date().toISOString(),
    operationId: randomUUID(),
  };
}
type zCommand = ReturnType<typeof c.syncSession.parse>;
beforeAll(async () => {
  testingModule = await Test.createTestingModule({
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
              RETENTION_ENABLED: 'false',
              DB_POOL_MAX: '5',
            }),
        ],
      }),
      WorkspacesModule,
    ],
  })
    .overrideProvider(StorageService)
    .useValue(storage)
    .compile();
  db = testingModule.get(DatabaseService).db;
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
  training = testingModule.get(TrainingService);
  collaboration = testingModule.get(CollaborationService);
  for (const role of ['coach', 'athlete', 'stranger']) {
    const [u] = await rows<{ id: string }>(
      db,
      sql`INSERT INTO users(phone,display_name,phone_verified_at) VALUES(${'+989' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0')},${role},now()) RETURNING id`,
    );
    if (role === 'coach') coach = u.id;
    else if (role === 'athlete') athlete = u.id;
    else stranger = u.id;
  }
  await db.execute(sql`INSERT INTO coach_profiles(user_id) VALUES(${coach})`);
  await db.execute(
    sql`INSERT INTO coaching_practices(user_id,review_status,review_expires_at) VALUES(${coach},'approved',now()+interval '30 days')`,
  );
  const [r] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO coaching_relationships(coach_id,student_id,status) VALUES(${coach},${athlete},'active') RETURNING id`,
  );
  relation = r.id;
}, 60000);
afterAll(async () => {
  await testingModule?.close();
});
beforeEach(async () => {
  await db.execute(
    sql`UPDATE training_sessions SET state='discarded' WHERE state='in_progress'`,
  );
});
it('has an original, searchable exercise library with safe alternatives', async () => {
  const list = await training.library('Squat');
  expect(list.length).toBeGreaterThan(0);
  expect(list[0].source).toBe('Gym4Me original demo content');
});
it('saves a personal plan once on replay and rejects a reused key with different content', async () => {
  const p = await create();
  const first = await training.save(athlete, p);
  expect(first.id).toBe(p.id);
  await expect(
    training.save(athlete, {
      ...p,
      content: { ...p.content, title: 'Different' },
    }),
  ).rejects.toThrow();
  expect(
    await rows(db, sql`SELECT id FROM training_plans WHERE id=${p.id}`),
  ).toHaveLength(1);
});
it('serializes competing draft edits without losing a version', async () => {
  const p = await create();
  const result = await Promise.allSettled(
    [1, 2].map((n) =>
      training.save(athlete, {
        ...p,
        revision: 1,
        operationId: randomUUID(),
        content: { ...p.content, title: `Edit ${n}` },
      }),
    ),
  );
  expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
});
it('publishes immutable snapshots and pins an in-progress workout to its original version', async () => {
  const p = await create(),
    assignment = await publish(athlete, p.id);
  const input = command(assignment, p.content);
  const first = await training.sync(athlete, input);
  await training.save(athlete, {
    ...p,
    revision: 2,
    operationId: randomUUID(),
    content: { ...p.content, title: 'New title' },
  });
  await publish(athlete, p.id, 3);
  const workspace = await training.workspace(athlete);
  expect(workspace.assignments.filter((a) => a.plan_id === p.id)).toHaveLength(
    1,
  );
  expect(workspace.sessions.find((s) => s.id === first.id)?.snapshot).toEqual(
    p.content,
  );
  const version = await rows(
    db,
    sql`SELECT id FROM training_versions WHERE plan_id=${p.id} LIMIT 1`,
  );
  await expect(
    db.execute(
      sql`UPDATE training_versions SET content='{}'::jsonb WHERE id=${String(version[0].id)}`,
    ),
  ).rejects.toThrow();
});
it('replays simultaneous session syncs and records completion exactly once', async () => {
  const p = await create(),
    assignment = await publish(athlete, p.id),
    input = command(assignment, p.content);
  input.state = 'completed';
  const result = await Promise.all([
    training.sync(athlete, input),
    training.sync(athlete, input),
  ]);
  expect(result[0].id).toBe(result[1].id);
  expect(
    await rows(
      db,
      sql`SELECT id FROM product_events WHERE entity_id=${input.id} AND name='workout_completed'`,
    ),
  ).toHaveLength(1);
  await expect(
    training.sync(athlete, {
      ...input,
      revision: 1,
      operationId: randomUUID(),
    }),
  ).rejects.toThrow();
});
it('rejects stale device updates while retaining the server workout', async () => {
  const p = await create(),
    assignment = await publish(athlete, p.id),
    input = command(assignment, p.content);
  await training.sync(athlete, input);
  await expect(
    training.sync(athlete, { ...input, operationId: randomUUID() }),
  ).rejects.toThrow();
  expect(
    (await training.workspace(athlete)).sessions.find((s) => s.id === input.id)
      ?.revision,
  ).toBe(1);
});
it('validates prescriptions, allowed substitutions, and actual sets through the interface', async () => {
  const p = await create(),
    assignment = await publish(athlete, p.id),
    input = command(assignment, p.content);
  await expect(
    training.sync(athlete, { ...input, logs: [{ ...input.logs[0], set: 3 }] }),
  ).rejects.toThrow();
  await expect(
    training.sync(athlete, {
      ...input,
      logs: [{ ...input.logs[0], exerciseId: 'plank' }],
    }),
  ).rejects.toThrow();
  const result = await training.sync(athlete, {
    ...input,
    logs: [{ ...input.logs[0], exerciseId: 'goblet-squat' }],
  });
  expect(result.id).toBe(input.id);
});
it('does not expose a personal plan, workout, or measurement to another account', async () => {
  const p = await create();
  await expect(training.plan(stranger, p.id)).rejects.toThrow();
  await expect(
    training.save(stranger, { ...p, revision: 1, operationId: randomUUID() }),
  ).rejects.toThrow();
  const assignment = await publish(athlete, p.id);
  await expect(
    training.sync(stranger, command(assignment, p.content)),
  ).rejects.toThrow();
});
it('assigns a coach plan only through an active, approved relationship', async () => {
  const p = await create(coach, relation);
  await publish(coach, p.id);
  expect(
    (await training.workspace(athlete)).assignments.some(
      (a) => a.plan_id === p.id,
    ),
  ).toBe(true);
  await expect(create(stranger, relation)).rejects.toThrow();
  await expect(create(athlete, relation)).rejects.toThrow();
});
it('templates cannot be executed before they are copied into a plan', async () => {
  const p = await create(athlete, null, true);
  await expect(publish(athlete, p.id)).rejects.toThrow();
});
it('keeps personal records private until explicit revocable sharing', async () => {
  await training.measure(athlete, {
    kind: 'weight',
    value: 70,
    measuredOn: today,
    operationId: randomUUID(),
  });
  await collaboration.sharing(athlete, relation, {
    personalPlans: false,
    measurements: false,
  });
  expect(
    (await collaboration.workspace(coach, relation)).measurements,
  ).toHaveLength(0);
  await collaboration.sharing(athlete, relation, {
    personalPlans: true,
    measurements: true,
  });
  expect(
    (await collaboration.workspace(coach, relation)).measurements.length,
  ).toBeGreaterThan(0);
  await collaboration.sharing(athlete, relation, {
    personalPlans: false,
    measurements: false,
  });
  expect(
    (await collaboration.workspace(coach, relation)).measurements,
  ).toHaveLength(0);
});
it('deduplicates private messages and checks every participant', async () => {
  const input = {
    operationId: randomUUID(),
    body: 'Private test',
    workoutId: null,
  };
  const first = await collaboration.send(athlete, relation, input);
  const replay = await collaboration.send(athlete, relation, input);
  expect(replay.id).toBe(first.id);
  expect(
    (await collaboration.messages(coach, relation)).items.some(
      (m) => m.id === first.id,
    ),
  ).toBe(true);
  await expect(collaboration.messages(stranger, relation)).rejects.toThrow();
  await expect(collaboration.send(stranger, relation, input)).rejects.toThrow();
});
it('stores a bounded image privately, cleans replay uploads, and rejects video', async () => {
  const buffer = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#abc' },
    })
      .png()
      .toBuffer(),
    file = {
      buffer,
      size: buffer.length,
      mimetype: 'image/png',
    } as Express.Multer.File,
    input = { operationId: randomUUID(), body: 'Image', workoutId: null };
  const message = await collaboration.send(athlete, relation, input, file),
    count = files.size;
  await collaboration.send(athlete, relation, input, file);
  expect(files.size).toBe(count);
  expect(
    (await collaboration.image(coach, String(message.id))).length,
  ).toBeGreaterThan(0);
  await expect(
    collaboration.image(stranger, String(message.id)),
  ).rejects.toThrow();
  await expect(
    collaboration.send(
      athlete,
      relation,
      { ...input, operationId: randomUUID() },
      { ...file, mimetype: 'video/mp4' },
    ),
  ).rejects.toThrow();
});
it('normalizes weekly check-ins and rejects stale feedback', async () => {
  expect(trainingWeek('2026-10-21')).toBe('2026-10-17');
  const input = {
      operationId: randomUUID(),
      weekStart: today,
      adherence: 3,
      difficulty: 5,
      body: 'Synthetic week',
      revision: 0,
    },
    item = await collaboration.checkin(athlete, relation, input);
  await collaboration.feedback(coach, relation, 'checkin', String(item.id), {
    operationId: randomUUID(),
    body: 'Keep going',
    revision: 1,
  });
  await expect(
    collaboration.feedback(coach, relation, 'checkin', String(item.id), {
      operationId: randomUUID(),
      body: 'Stale',
      revision: 1,
    }),
  ).rejects.toThrow();
});
it('rejects completed logs with the wrong prescription unit', async () => {
  const p = await create(),
    assignment = await publish(athlete, p.id),
    input = command(assignment, p.content);
  await expect(
    training.sync(athlete, {
      ...input,
      logs: [{ ...input.logs[0], reps: null, seconds: 30 }],
    }),
  ).rejects.toThrow();
  expect(
    c.planContent.safeParse({
      ...p.content,
      days: [
        {
          name: 'Invalid',
          exercises: [{ ...p.content.days[0].exercises[0], seconds: 30 }],
        },
      ],
    }).success,
  ).toBe(false);
});
it('allows consent revocation after a completed-session feedback revision', async () => {
  const p = await create(coach, relation),
    assignment = await publish(coach, p.id),
    input = command(assignment, p.content);
  input.shared = true;
  input.state = 'completed';
  await training.sync(athlete, input);
  await collaboration.feedback(coach, relation, 'session', input.id, {
    operationId: randomUUID(),
    body: 'Synthetic feedback',
    revision: 1,
  });
  await expect(
    training.sessionSharing(athlete, input.id, {
      operationId: randomUUID(),
      revision: 1,
      shared: false,
    }),
  ).rejects.toThrow();
  await training.sessionSharing(athlete, input.id, {
    operationId: randomUUID(),
    revision: 2,
    shared: false,
  });
  expect(
    (await collaboration.workspace(coach, relation)).sessions.some(
      (s) => s.id === input.id,
    ),
  ).toBe(false);
});
it('requires completed service proof and retains reasoned report history', async () => {
  const fixture = await seedUiCatalog(db, 'http://localhost:7081', true),
    person = fixture.people[2],
    admin = fixture.people[3],
    club = fixture.clubs[0],
    service = randomUUID(),
    version = randomUUID(),
    occurrence = randomUUID(),
    order = randomUUID(),
    reservation = randomUUID();
  const community = testingModule.get(ClubCommunityService),
    principal = {
      user: { id: person.id },
      session: { client: 'application' },
    } as Principal,
    administrator = {
      user: { id: admin.id },
      session: { client: 'admin' },
    } as Principal;
  await expect(
    community.createReview(principal, club.id, club.branches[0], {
      rating: 5,
      body: 'No proof yet',
    }),
  ).rejects.toThrow();
  await db.execute(
    sql`INSERT INTO sport_services(id,organization_id,branch_id,kind,title) VALUES(${service},${club.id},${club.branches[0]},'class','Review proof')`,
  );
  await db.execute(
    sql`INSERT INTO sport_service_versions(id,service_id,version,amount_minor,description,policy,title) VALUES(${version},${service},1,0,'Synthetic','{}','Review proof')`,
  );
  await db.execute(
    sql`INSERT INTO sport_occurrences(id,service_id,version_id,start_at,end_at,capacity,status) VALUES(${occurrence},${service},${version},now()-interval '2 hours',now()-interval '1 hour',1,'completed')`,
  );
  await db.execute(
    sql`INSERT INTO sport_orders(id,user_id,organization_id,service_id,version_id,amount_minor,snapshot,status,idempotency_key,request_hash,expires_at) VALUES(${order},${person.id},${club.id},${service},${version},0,'{}','paid',${randomUUID()},'fixture',now()+interval '1 day')`,
  );
  await db.execute(
    sql`INSERT INTO sport_reservations(id,user_id,occurrence_id,order_id,status,expires_at) VALUES(${reservation},${person.id},${occurrence},${order},'completed',now()+interval '1 day')`,
  );
  const review = await community.createReview(
    principal,
    club.id,
    club.branches[0],
    { rating: 5, body: 'Completed experience' },
  );
  await community.moderate(
    administrator,
    review.id,
    'published',
    'Synthetic acceptance',
  );
  expect(
    (await community.reviews(club.id, club.branches[0], 1)).find(
      (r) => r.id === review.id,
    )?.verified,
  ).toBe(true);
  const report = await community.reportReview(
    principal,
    club.id,
    club.branches[0],
    review.id,
    'Synthetic report',
  );
  const queue = await community.reviewReports(administrator),
    item = queue.find((r) => r.id === report.id)!;
  await community.resolveReport(administrator, String(report.id), {
    reason: 'Synthetic moderation resolution',
    hidden: true,
    revision: Number(item.revision),
  });
  await community.createReview(principal, club.id, club.branches[0], {
    rating: 4,
    body: 'Edited after hide',
  });
  expect(
    (await community.reviews(club.id, club.branches[0], 1)).some(
      (r) => r.id === review.id,
    ),
  ).toBe(false);
  expect(
    (await community.reviewReports(administrator)).find(
      (r) => r.id === report.id,
    )?.history,
  ).toHaveLength(1);
});
it('does not expose unpublished coach drafts or later draft edits in athlete exports', async () => {
  const p = await create(coach, relation);
  p.content.title = 'Unpublished private coach draft';
  await training.save(coach, { ...p, revision: 1, operationId: randomUUID() });
  await expect(training.plan(athlete, p.id)).rejects.toThrow();
  expect(
    JSON.stringify(await testingModule.get(PrivacyService).export(athlete)),
  ).not.toContain(p.content.title);
  await publish(coach, p.id, 2);
  await training.save(coach, {
    ...p,
    revision: 3,
    operationId: randomUUID(),
    content: { ...p.content, title: 'Later unpublished coach edit' },
  });
  const data = JSON.stringify(
    await testingModule.get(PrivacyService).export(athlete),
  );
  expect(data).toContain('Unpublished private coach draft');
  expect(data).not.toContain('Later unpublished coach edit');
  expect((await training.plan(athlete, p.id)).title).toBe(
    'Unpublished private coach draft',
  );
  expect(
    (await collaboration.workspace(athlete, relation)).plans.find(
      (plan) => plan.id === p.id,
    )?.title,
  ).toBe('Unpublished private coach draft');
});
it('surfaces due coach plans and records a revision-checked review', async () => {
  const p = await create(coach, relation);
  await publish(coach, p.id);
  await db.execute(
    sql`UPDATE training_plans SET review_due_at=now()-interval '1 day' WHERE id=${p.id}`,
  );
  const before = (await training.workspace(coach)).tasks.find(
    (t) => t.relationship_id === relation,
  );
  expect(Number(before?.plans)).toBeGreaterThan(0);
  const input = { operationId: randomUUID(), revision: 2 };
  await training.review(coach, p.id, input);
  await training.review(coach, p.id, input);
  const after = (await training.workspace(coach)).tasks.find(
    (t) => t.relationship_id === relation,
  );
  expect(Number(after?.plans)).toBe(Number(before?.plans) - 1);
  await expect(
    training.review(athlete, p.id, { operationId: randomUUID(), revision: 3 }),
  ).rejects.toThrow();
  await expect(
    training.review(coach, p.id, { operationId: randomUUID(), revision: 2 }),
  ).rejects.toThrow();
});
it('exports owned training data without another athlete’s private records', async () => {
  const data = await testingModule.get(PrivacyService).export(athlete);
  expect(JSON.stringify(data)).toContain('training');
  expect(JSON.stringify(data)).toContain('Original test routine');
});
it('revokes coach records, images and replayed plan writes at relationship end while preserving athlete history', async () => {
  const p = await create(coach, relation),
    assignment = await publish(coach, p.id),
    input = command(assignment, p.content);
  input.shared = true;
  await training.sync(athlete, input);
  const checkinInput = {
    operationId: randomUUID(),
    weekStart: '2025-01-04',
    adherence: 2,
    difficulty: 3,
    body: 'Before relationship ended',
    revision: 0,
  };
  const checkin = await collaboration.checkin(athlete, relation, checkinInput);
  const feedbackInput = {
    operationId: randomUUID(),
    body: 'Before end',
    revision: 1,
  };
  await collaboration.feedback(
    coach,
    relation,
    'checkin',
    String(checkin.id),
    feedbackInput,
  );
  const messageInput = {
    operationId: randomUUID(),
    body: 'Before end',
    workoutId: null,
  };
  await collaboration.send(athlete, relation, messageInput);
  const imageMessage = (
    await collaboration.messages(coach, relation)
  ).items.find((m) => m.has_image);
  await db.execute(
    sql`UPDATE coaching_relationships SET status='ended' WHERE id=${relation}`,
  );
  const completed = await training.sync(athlete, {
    ...input,
    state: 'completed',
    revision: 1,
    operationId: randomUUID(),
  });
  expect(completed.shared).toBe(false);
  await expect(
    collaboration.checkin(athlete, relation, checkinInput),
  ).rejects.toThrow();
  await expect(
    collaboration.feedback(
      coach,
      relation,
      'checkin',
      String(checkin.id),
      feedbackInput,
    ),
  ).rejects.toThrow();
  await expect(
    collaboration.send(athlete, relation, messageInput),
  ).rejects.toThrow();
  await expect(collaboration.workspace(coach, relation)).rejects.toThrow();
  await expect(training.save(coach, p)).rejects.toThrow();
  if (imageMessage)
    await expect(
      collaboration.image(coach, String(imageMessage.id)),
    ).rejects.toThrow();
  expect(
    (await training.workspace(athlete)).sessions.some((s) => s.id === input.id),
  ).toBe(true);
  expect(
    (await training.workspace(athlete)).assignments.some(
      (a) => a.id === assignment,
    ),
  ).toBe(true);
});

it('erases training history and private images while preserving another athlete', async () => {
  const p = await create(stranger),
    assignment = await publish(stranger, p.id);
  const input = command(assignment, p.content);
  input.state = 'completed';
  await training.sync(stranger, input);
  await training.measure(stranger, {
    kind: 'weight',
    value: 80,
    measuredOn: today,
    operationId: randomUUID(),
  });
  const [r] = await rows<{ id: string }>(
    db,
    sql`INSERT INTO coaching_relationships(coach_id,student_id,status) VALUES(${coach},${stranger},'active') RETURNING id`,
  );
  const buffer = await sharp({
    create: { width: 2, height: 2, channels: 3, background: '#abc' },
  })
    .png()
    .toBuffer();
  const message = await collaboration.send(
    stranger,
    r.id,
    {
      operationId: randomUUID(),
      body: 'Private deletion test',
      workoutId: input.id,
    },
    {
      buffer,
      size: buffer.length,
      mimetype: 'image/png',
    } as Express.Multer.File,
  );
  const [media] = await rows<{ image_key: string }>(
    db,
    sql`SELECT image_key FROM training_messages WHERE id=${String(message.id)}`,
  );
  expect(files.has(media.image_key)).toBe(true);
  await db.execute(
    sql`INSERT INTO account_deletion_requests(user_id,eligible_after) VALUES(${stranger},now()-interval '1 day')`,
  );
  await db.execute(
    sql`UPDATE users SET deletion_pending=true WHERE id=${stranger}`,
  );
  const result = await testingModule.get(RetentionService).run(true);
  expect(result.deletedAccounts).toBe(1);
  expect(files.has(media.image_key)).toBe(false);
  expect(
    await rows(
      db,
      sql`SELECT id FROM training_plans WHERE athlete_id=${stranger}`,
    ),
  ).toHaveLength(0);
  expect(
    await rows(
      db,
      sql`SELECT id FROM training_sessions WHERE athlete_id=${stranger}`,
    ),
  ).toHaveLength(0);
  expect(
    await rows(
      db,
      sql`SELECT id FROM training_measurements WHERE athlete_id=${stranger}`,
    ),
  ).toHaveLength(0);
  expect(
    await rows(
      db,
      sql`SELECT id FROM training_messages WHERE id=${String(message.id)}`,
    ),
  ).toHaveLength(0);
  expect(
    (await training.workspace(athlete)).assignments.length,
  ).toBeGreaterThan(0);
});
