import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { translate } from '@repo/i18n/backend';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { rows } from '../commerce/commerce.service';
import { trainingCommand } from './training.service';
import { planContent } from './training.contracts';
import * as c from './adaptive.contracts';
import {
  recommend,
  type AdaptiveExercise,
  type AdaptiveHistory,
} from './adaptive.policy';

@Injectable()
export class AdaptiveTrainingService {
  constructor(private readonly database: DatabaseService) {}
  async generate(
    actor: string,
    input: z.infer<typeof c.generate>,
    locale: 'fa' | 'en' = 'fa',
  ) {
    return trainingCommand(
      this.database.db,
      actor,
      input.operationId,
      ['recommend', input, locale],
      async (tx) => {
        const [clock] = await rows<{ current_at: Date }>(
          tx,
          sql`SELECT clock_timestamp() AS current_at`,
        );
        const library = await rows<AdaptiveExercise>(
          tx,
          sql`SELECT id,equipment,tags FROM training_exercises WHERE NOT archived ORDER BY id`,
        );
        const historyRows = await rows<{
          id: string;
          started_at: Date;
          ended_at: Date;
          logs: AdaptiveHistory['logs'];
        }>(
          tx,
          sql`SELECT id,started_at,ended_at,logs FROM training_sessions WHERE athlete_id=${actor} AND state='completed' AND ended_at<=${clock.current_at} AND ended_at>=${new Date(clock.current_at.getTime() - 90 * 86400000)} ORDER BY ended_at DESC,id LIMIT 100`,
        );
        const history = historyRows.map((r) => ({
          id: r.id,
          startedAt: r.started_at,
          endedAt: r.ended_at,
          logs: r.logs,
        }));
        const result = recommend(
          input.preferences,
          library,
          history,
          clock.current_at,
        );
        const content = result.movements.length
          ? planContent.parse({
              title: translate('Training.adaptivePlan', locale),
              note: translate('Training.adaptivePlanNote', locale),
              days: [
                {
                  name: translate('Training.adaptiveDay', locale),
                  exercises: result.movements.map((m) => ({
                    id: randomUUID(),
                    exerciseId: m.exerciseId,
                    sets: m.sets,
                    reps: m.reps,
                    seconds: m.seconds,
                    load: m.load,
                    restSeconds: m.restSeconds,
                    note: '',
                    group: 'single',
                    groupId: '',
                  })),
                },
              ],
            })
          : null;
        const [saved] = await rows<{ id: string; expires_at: Date }>(
          tx,
          sql`INSERT INTO training_recommendations(athlete_id,preferences,result,content) VALUES(${actor},${JSON.stringify(input.preferences)}::jsonb,${JSON.stringify(result)}::jsonb,${JSON.stringify(content)}::jsonb) RETURNING id,expires_at`,
        );
        return {
          id: saved.id,
          expiresAt: saved.expires_at,
          ...result,
          content,
        };
      },
    );
  }
  async accept(actor: string, id: string, input: z.infer<typeof c.accept>) {
    return trainingCommand(
      this.database.db,
      actor,
      input.operationId,
      ['acceptRecommendation', id, input],
      async (tx) => {
        const [r] = await rows<{
          content: unknown;
          accepted_plan_id: string | null;
          valid: boolean;
        }>(
          tx,
          sql`SELECT content,accepted_plan_id,expires_at>clock_timestamp() AS valid FROM training_recommendations WHERE id=${id} AND athlete_id=${actor} FOR UPDATE`,
        );
        if (!r) throw new NotFoundException('Training.notFound');
        if (r.accepted_plan_id) {
          const [assignment] = await rows<{ id: string }>(
            tx,
            sql`SELECT a.id FROM training_assignments a JOIN training_versions v ON v.id=a.version_id WHERE v.plan_id=${r.accepted_plan_id} AND a.athlete_id=${actor} ORDER BY v.version DESC LIMIT 1`,
          );
          return { planId: r.accepted_plan_id, assignmentId: assignment.id };
        }
        if (!r.valid || r.content === null)
          throw new ConflictException('Training.adaptiveExpired');
        const content = planContent.parse(r.content);
        const ids = content.days.flatMap((d) =>
          d.exercises.map((e) => e.exerciseId),
        );
        const valid = await rows(
          tx,
          sql`SELECT id FROM training_exercises WHERE id IN (${sql.join(
            ids.map((x) => sql`${x}`),
            sql`,`,
          )}) AND NOT archived FOR SHARE`,
        );
        if (valid.length !== ids.length)
          throw new ConflictException('Training.adaptiveExpired');
        const [plan] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO training_plans(owner_id,athlete_id,title,draft) VALUES(${actor},${actor},${content.title},${JSON.stringify(content)}::jsonb) RETURNING id`,
        );
        const [version] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO training_versions(plan_id,version,content,effective_from) VALUES(${plan.id},1,${JSON.stringify(content)}::jsonb,(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date) RETURNING id`,
        );
        const [assignment] = await rows<{ id: string }>(
          tx,
          sql`INSERT INTO training_assignments(version_id,athlete_id) VALUES(${version.id},${actor}) RETURNING id`,
        );
        await tx.execute(
          sql`UPDATE training_recommendations SET accepted_plan_id=${plan.id} WHERE id=${id}`,
        );
        return { planId: plan.id, assignmentId: assignment.id };
      },
    );
  }
}
