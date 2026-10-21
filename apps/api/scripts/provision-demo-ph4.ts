import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { rows } from '../src/modules/commerce/commerce.service';
import { TrainingService } from '../src/modules/training/training.service';
import { CollaborationService } from '../src/modules/training/collaboration.service';
import { type PlanContent } from '../src/modules/training/training.contracts';

/** Add synthetic examples once; never reset user edits or revive ended relationships. */
export async function provisionDemoPh4() {
  if (
    process.env.DEMO_MODE !== 'true' ||
    process.env.DEMO_PROVISION_CONFIRM !== 'gym4me-demo-postgres'
  )
    throw new Error(
      'Explicit isolated demo provisioning confirmation required',
    );
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  try {
    const db = app.get(DatabaseService).db;
    const [marker] = await rows(
      db,
      sql`SELECT ready FROM gym4me_demo_installation WHERE id='isolated-demo-v1'`,
    );
    if (!marker?.ready)
      throw new Error('Requires an already provisioned isolated demo');
    const accounts = await rows<{ user_id: string; phone: string }>(
      db,
      sql`SELECT user_id,phone FROM gym4me_demo_accounts WHERE phone IN ('+989000000003','+989000000008')`,
    );
    const athlete = accounts.find((a) => a.phone.endsWith('003'))?.user_id;
    const coach = accounts.find((a) => a.phone.endsWith('008'))?.user_id;
    if (!athlete || !coach) throw new Error('Synthetic demo accounts missing');
    await db.execute(
      sql`INSERT INTO coaching_relationships(coach_id,student_id,status) SELECT ${coach},${athlete},'active' WHERE NOT EXISTS(SELECT 1 FROM coaching_relationships WHERE coach_id=${coach} AND student_id=${athlete})`,
    );
    const [relation] = await rows<{ id: string; status: string }>(
      db,
      sql`SELECT id,status FROM coaching_relationships WHERE coach_id=${coach} AND student_id=${athlete} ORDER BY created_at DESC LIMIT 1`,
    );
    const training = app.get(TrainingService),
      collaboration = app.get(CollaborationService);
    const content: PlanContent = {
      title: 'شروع ساده · برنامهٔ نمونه',
      note: 'دادهٔ ساختگی دمو؛ متناسب با توان خود تمرین کنید.',
      days: [
        {
          name: 'روز اول · تمام بدن',
          exercises: [
            {
              id: 'c4100000-0000-4000-8000-000000000001',
              exerciseId: 'squat',
              sets: 2,
              reps: 10,
              seconds: null,
              load: null,
              restSeconds: 60,
              note: 'حرکت را آرام و در دامنهٔ راحت انجام دهید.',
              group: 'single',
              groupId: '',
            },
            {
              id: 'c4100000-0000-4000-8000-000000000002',
              exerciseId: 'plank',
              sets: 2,
              reps: null,
              seconds: 20,
              load: null,
              restSeconds: 45,
              note: 'تنفس را نگه ندارید.',
              group: 'single',
              groupId: '',
            },
          ],
        },
      ],
    };
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    for (const item of [
      {
        id: 'c4100000-0000-4000-8000-000000000010',
        actor: athlete,
        relationshipId: null,
        isTemplate: false,
        title: 'برنامهٔ شخصی نمونه',
      },
      {
        id: 'c4100000-0000-4000-8000-000000000011',
        actor: coach,
        relationshipId: null,
        isTemplate: true,
        title: 'الگوی شروع مربی',
      },
      ...(relation?.status === 'active'
        ? [
            {
              id: 'c4100000-0000-4000-8000-000000000012',
              actor: coach,
              relationshipId: relation.id,
              isTemplate: false,
              title: 'برنامهٔ نمونهٔ مربی برای شما',
            },
          ]
        : []),
    ]) {
      if (
        (await rows(db, sql`SELECT id FROM training_plans WHERE id=${item.id}`))
          .length
      )
        continue;
      await training.save(item.actor, {
        id: item.id,
        revision: 0,
        relationshipId: item.relationshipId,
        isTemplate: item.isTemplate,
        content: { ...content, title: item.title },
        operationId: randomUUID(),
      });
      if (!item.isTemplate)
        await training.publish(item.actor, item.id, {
          revision: 1,
          effectiveFrom: today,
          operationId: randomUUID(),
        });
    }
    if (
      relation?.status === 'active' &&
      !(
        await rows(
          db,
          sql`SELECT id FROM training_messages WHERE relationship_id=${relation.id} LIMIT 1`,
        )
      ).length
    )
      await collaboration.send(coach, relation.id, {
        body: 'سلام! برنامهٔ نمونه آماده است. از «تمرین امروز» شروع کنید و پایان هفته گزارش کوتاهتان را بفرستید. این گفت‌وگو فقط برای شما و مربی است.',
        workoutId: null,
        operationId: randomUUID(),
      });
    console.log('PH4 synthetic examples ready; existing data preserved.');
  } finally {
    await app.close();
  }
}
if (require.main === module)
  void provisionDemoPh4().catch(() => {
    console.error('PH4 demo provisioning failed; no credentials logged.');
    process.exitCode = 1;
  });
