import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { before, after, test } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { DatabaseService } from '../src/database/database.service';
import {
  validateEnvironment,
  type Environment,
} from '../src/config/environment';
import { AdaptiveTrainingService } from '../src/modules/training/adaptive.service';
import { TrainingService } from '../src/modules/training/training.service';
import { rows } from '../src/modules/commerce/commerce.service';
import { planContent } from '../src/modules/training/training.contracts';
import { NutritionService } from '../src/modules/training/nutrition.service';
import {
  ExerciseVideoService,
  exerciseVideo,
} from '../src/modules/training/exercise-video.service';
import * as s from '../src/database/schema';
const url =
  process.env.SELECTED_TEST_DATABASE_URL ??
  'postgresql://gym4me@127.0.0.1:55434/gym4me_selected_test';
if (
  !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) ||
  !new URL(url).pathname.endsWith('_selected_test')
)
  throw new Error('An isolated local _selected_test database is required');
const config = new ConfigService<Environment, true>(
  validateEnvironment({ DATABASE_URL: url, NODE_ENV: 'test' }),
);
const database = new DatabaseService(config),
  db = database.db;
const service = new AdaptiveTrainingService(database),
  training = new TrainingService(database),
  nutrition = new NutritionService(database);
const videos = new ExerciseVideoService(database);
const settings = {
  goal: 'general' as const,
  experience: 'beginner' as const,
  minutes: 30,
  equipment: ['bodyweight' as const],
  avoidMuscles: [],
  excludeExercises: [],
};
async function person() {
  const [u] = await db
    .insert(s.users)
    .values({
      phone: `+989${randomInt(100000000, 999999999)}`,
      displayName: 'Synthetic adaptive test',
      phoneVerifiedAt: new Date(),
    })
    .returning();
  return u.id;
}
before(async () => {
  await database.onModuleInit();
  await migrate(db, {
    migrationsFolder: resolve(__dirname, '../database/migrations'),
  });
});
after(async () => {
  await database.onApplicationShutdown();
});
void test('food log totals, repeat requests, ownership and day boundaries are consistent', async () => {
  const actor = await person(),
    other = await person(),
    operationId = randomUUID();
  const input = {
    operationId,
    eatenOn: '2026-10-24',
    meal: 'lunch' as const,
    name: 'Synthetic label',
    grams: 150,
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
  };
  const a = await nutrition.add(actor, input),
    b = await nutrition.add(actor, input);
  assert.equal(a.id, b.id);
  const day = await nutrition.day(actor, input.eatenOn);
  assert.equal(Number(day.totals.calories), 195);
  assert.equal(Number(day.totals.protein), 4.05);
  assert.equal(day.totals.entries, 1);
  assert.equal((await nutrition.day(other, input.eatenOn)).totals.entries, 0);
  assert.equal((await nutrition.day(actor, '2026-10-25')).totals.entries, 0);
  await assert.rejects(() => nutrition.add(actor, { ...input, grams: 200 }));
  await assert.rejects(() =>
    nutrition.remove(other, String(a.id), {
      operationId: randomUUID(),
      revision: 1,
    }),
  );
  await assert.rejects(() =>
    nutrition.remove(actor, String(a.id), {
      operationId: randomUUID(),
      revision: 2,
    }),
  );
  const remove = { operationId: randomUUID(), revision: 1 };
  await nutrition.remove(actor, String(a.id), remove);
  await nutrition.remove(actor, String(a.id), remove);
  assert.equal((await nutrition.day(actor, input.eatenOn)).totals.entries, 0);
});
void test('nutrition notes are versioned with the assigned plan and remain private', async () => {
  const athlete = await person(),
    stranger = await person();
  const preview = await service.generate(athlete, {
    operationId: randomUUID(),
    preferences: settings,
  });
  const content = planContent.parse({
    ...preview.content,
    nutrition: 'Synthetic meal plan: breakfast, lunch, dinner.',
  });
  const id = randomUUID();
  await training.save(athlete, {
    id,
    operationId: randomUUID(),
    revision: 0,
    relationshipId: null,
    isTemplate: false,
    content,
  });
  await training.publish(athlete, id, {
    operationId: randomUUID(),
    revision: 1,
    effectiveFrom: '2026-01-01',
  });
  const workspace = await training.workspace(athlete);
  assert.equal(
    (workspace.assignments[0].content as typeof content).nutrition,
    content.nutrition,
  );
  await assert.rejects(() => training.plan(stranger, id));
});
void test('only administrators can change exercise video metadata, with revision and URL validation', async () => {
  const actor = await person(),
    other = await person();
  const [exercise] = await rows<{ video_revision: number }>(
    db,
    sql`SELECT video_revision FROM training_exercises WHERE id='squat'`,
  );
  const input = exerciseVideo.parse({
    operationId: randomUUID(),
    revision: exercise.video_revision,
    videoUrl: 'https://example.org/synthetic-demo.mp4',
    videoSource: 'Synthetic metadata test; no media requested',
    reason: 'Isolated exercise video test',
  });
  await assert.rejects(() => videos.save(other, 'squat', input));
  assert.equal(
    exerciseVideo.safeParse({ ...input, videoUrl: 'javascript:alert(1)' })
      .success,
    false,
  );
  assert.equal(
    exerciseVideo.safeParse({ ...input, videoSource: null }).success,
    false,
  );
  await db.execute(sql`INSERT INTO platform_admins(user_id) VALUES(${actor})`);
  try {
    const saved = await videos.save(actor, 'squat', input);
    assert.equal(saved.revision, input.revision + 1);
    assert.deepEqual(await videos.save(actor, 'squat', input), saved);
    await assert.rejects(() =>
      videos.save(actor, 'squat', { ...input, operationId: randomUUID() }),
    );
  } finally {
    await db.execute(
      sql`UPDATE training_exercises SET video_url=NULL,video_source=NULL WHERE id='squat'`,
    );
    await db.execute(sql`DELETE FROM platform_admins WHERE user_id=${actor}`);
  }
});
void test('preview and acceptance preserve ownership, repeatability and the existing workout flow', async () => {
  const athlete = await person(),
    stranger = await person(),
    operationId = randomUUID();
  const preview = await service.generate(
    athlete,
    { operationId, preferences: settings },
    'en',
  );
  assert.equal(preview.status, 'ready');
  assert.equal(preview.content?.title, 'Suggested personal workout');
  const repeat = await service.generate(
    athlete,
    { operationId, preferences: settings },
    'en',
  );
  assert.equal(repeat.id, preview.id);
  await assert.rejects(() =>
    service.generate(
      athlete,
      { operationId, preferences: { ...settings, minutes: 15 } },
      'en',
    ),
  );
  await assert.rejects(() =>
    service.accept(stranger, preview.id, { operationId: randomUUID() }),
  );
  const [first, second] = await Promise.all([
    service.accept(athlete, preview.id, { operationId: randomUUID() }),
    service.accept(athlete, preview.id, { operationId: randomUUID() }),
  ]);
  assert.equal(first.planId, second.planId);
  assert.equal(first.assignmentId, second.assignmentId);
  const [count] = await rows<{ n: number }>(
    db,
    sql`SELECT count(*)::int n FROM training_plans WHERE owner_id=${athlete}`,
  );
  assert.equal(count.n, 1);
  const current = await training.workspace(athlete);
  assert.equal(current.assignments.length, 1);
  assert.ok(preview.content);
  const snapshot = preview.content,
    movement = snapshot.days[0].exercises[0];
  const workout = await training.sync(athlete, {
    id: randomUUID(),
    revision: 0,
    assignmentId: first.assignmentId,
    dayIndex: 0,
    state: 'in_progress',
    shared: false,
    startedAt: new Date().toISOString(),
    operationId: randomUUID(),
    logs: [
      {
        prescriptionId: movement.id,
        exerciseId: movement.exerciseId,
        set: 1,
        reps: movement.reps,
        seconds: movement.seconds,
        load: null,
        rpe: 6,
        done: true,
      },
    ],
  });
  assert.equal(planContent.parse(workout.snapshot).title, snapshot.title);
});
void test('expired, empty and archived-exercise suggestions cannot create a plan', async () => {
  const athlete = await person();
  const p = await service.generate(athlete, {
    operationId: randomUUID(),
    preferences: settings,
  });
  await db.execute(
    sql`UPDATE training_recommendations SET expires_at=now()-interval '1 minute' WHERE id=${p.id}`,
  );
  await assert.rejects(() =>
    service.accept(athlete, p.id, { operationId: randomUUID() }),
  );
  const empty = await service.generate(athlete, {
    operationId: randomUUID(),
    preferences: {
      ...settings,
      avoidMuscles: [
        'legs',
        'chest',
        'arms',
        'back',
        'core',
        'shoulders',
        'cardio',
      ],
    },
  });
  assert.equal(empty.status, 'noExercises');
  await assert.rejects(() =>
    service.accept(athlete, empty.id, { operationId: randomUUID() }),
  );
  const fresh = await service.generate(athlete, {
    operationId: randomUUID(),
    preferences: settings,
  });
  const exercise = fresh.movements[0].exerciseId;
  try {
    await db.execute(
      sql`UPDATE training_exercises SET archived=true WHERE id=${exercise}`,
    );
    await assert.rejects(() =>
      service.accept(athlete, fresh.id, { operationId: randomUUID() }),
    );
  } finally {
    await db.execute(
      sql`UPDATE training_exercises SET archived=false WHERE id=${exercise}`,
    );
  }
  const [n] = await rows<{ n: number }>(
    db,
    sql`SELECT count(*)::int n FROM training_plans WHERE owner_id=${athlete}`,
  );
  assert.equal(n.n, 0);
});
void test('another athlete history cannot influence a suggestion and account deletion blocks acceptance', async () => {
  const athlete = await person(),
    peer = await person();
  await db.execute(
    sql`INSERT INTO training_sessions(id,athlete_id,snapshot,logs,day_index,state,started_at,ended_at) VALUES(${randomUUID()},${peer},'{}'::jsonb,${JSON.stringify([{ exerciseId: 'squat', done: true, reps: 10, seconds: null, load: null, rpe: 9 }])}::jsonb,0,'completed',now()-interval '2 hours',now()-interval '1 hour')`,
  );
  const p = await service.generate(athlete, {
    operationId: randomUUID(),
    preferences: settings,
  });
  assert.deepEqual(p.recentlyTrained, []);
  await db.execute(
    sql`UPDATE users SET deletion_pending=true WHERE id=${athlete}`,
  );
  await assert.rejects(() =>
    service.accept(athlete, p.id, { operationId: randomUUID() }),
  );
});
