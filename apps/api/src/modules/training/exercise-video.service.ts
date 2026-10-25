import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { rows } from '../commerce/commerce.service';
import { trainingCommand } from './training.service';
export const exerciseVideo = z
  .object({
    operationId: z.uuid(),
    revision: z.number().int().positive(),
    videoUrl: z
      .url()
      .max(2000)
      .refine((v) => new URL(v).protocol === 'https:')
      .nullable(),
    videoSource: z.string().trim().min(2).max(500).nullable(),
    reason: z.string().trim().min(5).max(500),
  })
  .strict()
  .refine((v) => (v.videoUrl === null) === (v.videoSource === null));
@Injectable()
export class ExerciseVideoService {
  constructor(private readonly database: DatabaseService) {}
  async save(actor: string, id: string, input: z.infer<typeof exerciseVideo>) {
    return trainingCommand(
      this.database.db,
      actor,
      input.operationId,
      ['exerciseVideo', id, input],
      async (tx) => {
        const [e] = await rows<{ video_revision: number }>(
          tx,
          sql`SELECT video_revision FROM training_exercises WHERE id=${id} AND NOT archived FOR UPDATE`,
        );
        if (!e) throw new NotFoundException('Training.notFound');
        if (e.video_revision !== input.revision)
          throw new ConflictException('Training.conflict');
        await tx.execute(
          sql`UPDATE training_exercises SET video_url=${input.videoUrl},video_source=${input.videoSource},video_caption_fa=null,video_caption_en=null,video_revision=video_revision+1 WHERE id=${id}`,
        );
        await tx.execute(
          sql`INSERT INTO audit_events(actor_id,action,details) VALUES(${actor},'training.exerciseVideo',${JSON.stringify({ exerciseId: id, reason: input.reason, revision: input.revision + 1 })}::jsonb)`,
        );
        return { id, revision: input.revision + 1 };
      },
      async (tx) => {
        const admin = await rows(
          tx,
          sql`SELECT user_id FROM platform_admins WHERE user_id=${actor} FOR SHARE`,
        );
        if (!admin.length) throw new ForbiddenException('PH5.denied');
      },
    );
  }
}
