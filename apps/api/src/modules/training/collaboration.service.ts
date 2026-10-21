import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../clubs/storage.service';
import { rows } from '../commerce/commerce.service';
import { coachingWrite } from '../coaching/practice.service';
import { deliverSportsNotification } from '../commerce/notification-delivery';
import { trainingCommand, trainingRelationship } from './training.service';
import * as c from './training.contracts';

export function trainingWeek(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7));
  return d.toISOString().slice(0, 10);
}
@Injectable()
export class CollaborationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
  ) {}
  private get db() {
    return this.database.db;
  }
  async workspace(actor: string, id: string) {
    return this.db.transaction(async (tx) => {
      const r = await trainingRelationship(tx, actor, id);
      const [sharing] = await rows(
        tx,
        sql`SELECT * FROM training_sharing WHERE relationship_id=${id}`,
      );
      const sessions = await rows(
        tx,
        sql`SELECT s.* FROM training_sessions s WHERE s.athlete_id=${r.student_id} AND (${r.student_id === actor} OR (s.shared AND s.relationship_id=${id}) OR (s.relationship_id IS NULL AND coalesce(${sharing?.personal_plans ?? false}::boolean,false))) ORDER BY s.started_at DESC LIMIT 100`,
      );
      const plans = await rows(
        tx,
        sql`SELECT p.id,v.content->>'title' AS title,p.revision,p.review_due_at,(p.owner_id=${actor}) AS can_review,v.content,v.version FROM training_plans p JOIN LATERAL(SELECT content,version FROM training_versions WHERE plan_id=p.id ORDER BY version DESC LIMIT 1) v ON true WHERE p.athlete_id=${r.student_id} AND (p.relationship_id=${id} OR (${sharing?.personal_plans ?? false} AND p.relationship_id IS NULL)) ORDER BY p.updated_at DESC LIMIT 50`,
      );
      const measurements =
        r.student_id === actor || sharing?.measurements
          ? await rows(
              tx,
              sql`SELECT * FROM training_measurements WHERE athlete_id=${r.student_id} ORDER BY measured_on DESC LIMIT 100`,
            )
          : [];
      const checkins = await rows(
        tx,
        sql`SELECT * FROM training_checkins WHERE relationship_id=${id} ORDER BY week_start DESC LIMIT 26`,
      );
      return {
        relationship: r,
        sharing: sharing ?? { personal_plans: false, measurements: false },
        sessions,
        plans,
        measurements,
        checkins,
      };
    });
  }
  async sharing(actor: string, id: string, input: z.infer<typeof c.share>) {
    return coachingWrite(this.db, actor, async (tx) => {
      const r = await trainingRelationship(tx, actor, id, true);
      if (r.student_id !== actor)
        throw new NotFoundException('Coaching.notFound');
      await tx.execute(
        sql`INSERT INTO training_sharing(relationship_id,personal_plans,measurements) VALUES(${id},${input.personalPlans},${input.measurements}) ON CONFLICT(relationship_id) DO UPDATE SET personal_plans=EXCLUDED.personal_plans,measurements=EXCLUDED.measurements`,
      );
      return { success: true };
    });
  }
  async messages(actor: string, id: string, before?: string) {
    return this.db.transaction(async (tx) => {
      await trainingRelationship(tx, actor, id);
      const items = await rows(
        tx,
        sql`SELECT m.id,m.sender_id,m.body,m.workout_id,(m.image_key IS NOT NULL) AS has_image,m.created_at FROM training_messages m WHERE m.relationship_id=${id} AND (${before ?? null}::uuid IS NULL OR (m.created_at,m.id)<(SELECT created_at,id FROM training_messages WHERE id=${before ?? null}::uuid AND relationship_id=${id})) ORDER BY m.created_at DESC,m.id DESC LIMIT 31`,
      );
      const [read] = await rows(
        tx,
        sql`SELECT read_at FROM training_reads WHERE relationship_id=${id} AND user_id<>${actor}`,
      );
      return {
        items: items.slice(0, 30),
        hasMore: items.length > 30,
        peerReadAt: read?.read_at ?? null,
      };
    });
  }
  async send(
    actor: string,
    id: string,
    input: z.infer<typeof c.message>,
    file?: Express.Multer.File,
  ) {
    await trainingRelationship(this.db, actor, id, true);
    let image: Buffer | undefined;
    if (file) {
      if (
        file.size > 3 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      )
        throw new BadRequestException('Backend.invalidImage');
      try {
        const processor = sharp(file.buffer, {
          limitInputPixels: 16000000,
          animated: false,
        });
        const info = await processor.metadata();
        if (
          (info.pages ?? 1) > 1 ||
          !['jpeg', 'png', 'webp'].includes(info.format ?? '')
        )
          throw new Error();
        image = await processor
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 75 })
          .toBuffer();
      } catch {
        throw new BadRequestException('Backend.invalidImage');
      }
    }
    const fileHash = image
      ? createHash('sha256').update(image).digest('hex')
      : null;
    // Each upload is tied to one command and remains private; no signed public image URL is returned.
    const key = image ? `training/${id}/${randomUUID()}.webp` : null;
    if (key && image) {
      await this.storage.put(key, image, 'image/webp');
    }
    try {
      const result = await trainingCommand(
        this.db,
        actor,
        input.operationId,
        ['message', id, input, fileHash],
        async (tx) => {
          const r = await trainingRelationship(tx, actor, id, true);
          const [quota] = await rows<{ count: string }>(
            tx,
            sql`SELECT count(*)::text AS count FROM training_messages WHERE sender_id=${actor} AND created_at>now()-interval '1 hour'`,
          );
          if (Number(quota.count) >= 100)
            throw new ConflictException('Training.messageLimit');
          if (input.workoutId) {
            const [s] = await rows(
              tx,
              sql`SELECT id FROM training_sessions WHERE id=${input.workoutId} AND athlete_id=${r.student_id} AND (${actor === r.student_id} OR (shared AND relationship_id=${id}) OR (relationship_id IS NULL AND EXISTS(SELECT 1 FROM training_sharing WHERE relationship_id=${id} AND personal_plans)))`,
            );
            if (!s) throw new NotFoundException('Training.notFound');
          }
          const [m] = await rows(
            tx,
            sql`INSERT INTO training_messages(relationship_id,sender_id,body,workout_id,image_key,image_type) VALUES(${id},${actor},${input.body},${input.workoutId},${key},${key ? 'image/webp' : null}) RETURNING id,sender_id,body,workout_id,(image_key IS NOT NULL) AS has_image,created_at`,
          );
          await deliverSportsNotification(tx, {
            userId: r.coach_id === actor ? r.student_id : r.coach_id,
            title: 'Training.newMessage',
            body: 'Training.openConversation',
            href: `/training/conversation?id=${id}`,
            sourceKey: `training-message:${String(m.id)}`,
            preference: 'messages',
          });
          return m;
        },
        (tx) => trainingRelationship(tx, actor, id, true),
      );
      if (key) {
        const [used] = await rows(
          this.db,
          sql`SELECT id FROM training_messages WHERE image_key=${key}`,
        );
        if (!used) await this.storage.delete(key);
      }
      return result;
    } catch (error) {
      if (key) {
        const [used] = await rows(
          this.db,
          sql`SELECT id FROM training_messages WHERE image_key=${key}`,
        );
        if (!used) await this.storage.delete(key);
      }
      throw error;
    }
  }
  async image(actor: string, messageId: string) {
    const [m] = await rows<{
      relationship_id: string;
      image_key: string | null;
    }>(
      this.db,
      sql`SELECT relationship_id,image_key FROM training_messages WHERE id=${messageId}`,
    );
    if (!m?.image_key) throw new NotFoundException('Training.notFound');
    await trainingRelationship(this.db, actor, m.relationship_id);
    const content = await this.storage.get(m.image_key);
    await trainingRelationship(this.db, actor, m.relationship_id);
    return content;
  }
  async read(actor: string, id: string) {
    return coachingWrite(this.db, actor, async (tx) => {
      await trainingRelationship(tx, actor, id);
      await tx.execute(
        sql`INSERT INTO training_reads(relationship_id,user_id) VALUES(${id},${actor}) ON CONFLICT(relationship_id,user_id) DO UPDATE SET read_at=greatest(training_reads.read_at,EXCLUDED.read_at)`,
      );
      return { success: true };
    });
  }
  async checkin(actor: string, id: string, input: z.infer<typeof c.weekly>) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['checkin', id, input],
      async (tx) => {
        const r = await trainingRelationship(tx, actor, id, true);
        if (r.student_id !== actor)
          throw new NotFoundException('Coaching.notFound');
        const week = trainingWeek(input.weekStart);
        const [old] = await rows(
          tx,
          sql`SELECT revision FROM training_checkins WHERE relationship_id=${id} AND week_start=${week} FOR UPDATE`,
        );
        if ((old?.revision ?? 0) !== input.revision)
          throw new ConflictException('Training.conflict');
        const [item] = await rows(
          tx,
          sql`INSERT INTO training_checkins(relationship_id,week_start,adherence,difficulty,body) VALUES(${id},${week},${input.adherence},${input.difficulty},${input.body}) ON CONFLICT(relationship_id,week_start) DO UPDATE SET adherence=EXCLUDED.adherence,difficulty=EXCLUDED.difficulty,body=EXCLUDED.body,feedback='',revision=training_checkins.revision+1,updated_at=now() RETURNING *`,
        );
        await deliverSportsNotification(tx, {
          userId: r.coach_id,
          title: 'Training.checkinReady',
          body: 'Training.openConversation',
          href: `/training/conversation?id=${id}`,
          sourceKey: `training-checkin:${String(item.id)}:${String(item.revision)}`,
          preference: 'reminders',
        });
        return item;
      },
      (tx) => trainingRelationship(tx, actor, id, true),
    );
  }
  async feedback(
    actor: string,
    id: string,
    target: 'session' | 'checkin',
    targetId: string,
    input: z.infer<typeof c.feedback>,
  ) {
    return trainingCommand(
      this.db,
      actor,
      input.operationId,
      ['feedback', id, target, targetId, input],
      async (tx) => {
        const r = await trainingRelationship(tx, actor, id, true);
        if (r.coach_id !== actor)
          throw new NotFoundException('Coaching.notFound');
        if (target === 'session') {
          const [s] = await rows(
            tx,
            sql`UPDATE training_sessions SET feedback=${input.body},reviewed_at=now(),revision=revision+1 WHERE id=${targetId} AND athlete_id=${r.student_id} AND revision=${input.revision} AND state='completed' AND ((shared AND relationship_id=${id}) OR (relationship_id IS NULL AND EXISTS(SELECT 1 FROM training_sharing WHERE relationship_id=${id} AND personal_plans))) RETURNING id`,
          );
          if (!s) throw new ConflictException('Training.conflict');
        } else {
          const [s] = await rows(
            tx,
            sql`UPDATE training_checkins SET feedback=${input.body},revision=revision+1,updated_at=now() WHERE id=${targetId} AND relationship_id=${id} AND revision=${input.revision} RETURNING id`,
          );
          if (!s) throw new ConflictException('Training.conflict');
        }
        await deliverSportsNotification(tx, {
          userId: r.student_id,
          title: 'Training.feedbackReady',
          body: 'Training.openConversation',
          href: `/training/conversation?id=${id}`,
          sourceKey: `training-feedback:${input.operationId}`,
          preference: 'messages',
        });
        return { success: true };
      },
      (tx) => trainingRelationship(tx, actor, id, true),
    );
  }
}
