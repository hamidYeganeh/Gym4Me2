import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../clubs/storage.service';
import { rows } from '../commerce/commerce.service';
import { coachingWrite } from './practice.service';

export const sampleInput = z
  .object({
    title: z.string().trim().max(120).default(''),
    revision: z.coerce.number().int().positive().optional(),
  })
  .strict();
export const sampleAction = z
  .object({
    revision: z.number().int().positive(),
    action: z.enum(['swap', 'up', 'down', 'delete']),
  })
  .strict();
type Sample = {
  id: string;
  coach_id: string;
  position: number;
  title: string;
  before_key: string;
  after_key: string;
  revision: number;
};
type Uploads = {
  before?: Express.Multer.File[];
  after?: Express.Multer.File[];
};

@Injectable()
export class CoachSamplesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
  ) {}
  private async lock(tx: import('../clubs/club.repository').Tx, actor: string) {
    const [coach] = await rows(
      tx,
      sql`SELECT user_id FROM coaching_practices WHERE user_id=${actor} FOR UPDATE`,
    );
    if (!coach) throw new NotFoundException('Coaching.activateFirst');
  }
  async own(actor: string) {
    const samples = await rows<Sample>(
      this.database.db,
      sql`SELECT * FROM coach_samples WHERE coach_id=${actor} ORDER BY position`,
    );
    return Promise.all(
      samples.map(async (s) => ({
        id: s.id,
        title: s.title,
        revision: s.revision,
        before: (await this.storage.preview(s.before_key)).url,
        after: (await this.storage.preview(s.after_key)).url,
      })),
    );
  }
  async publicList(username: string) {
    const samples = await rows<Sample>(
      this.database.db,
      sql`SELECT s.id,s.title,s.revision FROM coach_samples s JOIN coaching_practices p ON p.user_id=s.coach_id JOIN users u ON u.id=p.user_id WHERE p.public_id=${username} AND p.published AND p.review_status='approved' AND p.review_expires_at>now() AND u.profile_public AND u.status='active' AND NOT u.deletion_pending AND u.deleted_at IS NULL ORDER BY s.position`,
    );
    return samples.map((s) => ({
      id: s.id,
      title: s.title,
      revision: s.revision,
      before: `coaching/samples/${s.id}/before?revision=${s.revision}`,
      after: `coaching/samples/${s.id}/after?revision=${s.revision}`,
    }));
  }
  async media(id: string, side: 'before' | 'after') {
    const [s] = await rows<Sample>(
      this.database.db,
      sql`SELECT s.* FROM coach_samples s JOIN coaching_practices p ON p.user_id=s.coach_id JOIN users u ON u.id=p.user_id WHERE s.id=${id} AND p.published AND p.review_status='approved' AND p.review_expires_at>now() AND u.profile_public AND u.status='active' AND NOT u.deletion_pending AND u.deleted_at IS NULL`,
    );
    if (!s) throw new NotFoundException();
    return this.storage.get(side === 'before' ? s.before_key : s.after_key);
  }
  async save(
    actor: string,
    id: string | undefined,
    input: z.infer<typeof sampleInput>,
    files: Uploads = {},
  ) {
    const prepared: Partial<Record<'before' | 'after', Buffer>> = {};
    for (const side of ['before', 'after'] as const) {
      const file = files[side]?.[0];
      if (!file) continue;
      if (
        file.size > 4 * 1024 * 1024 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      )
        throw new BadRequestException('Practice.invalidFile');
      try {
        // Decode, bound dimensions, and re-encode: no original EXIF or active content is published.
        const image = sharp(file.buffer, {
          limitInputPixels: 24_000_000,
          animated: false,
        });
        const metadata = await image.metadata();
        if (
          !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
          (metadata.pages ?? 1) > 1
        )
          throw new Error('Unsupported image');
        prepared[side] = await image
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer();
      } catch {
        throw new BadRequestException('Practice.invalidFile');
      }
    }
    if (!id && (!prepared.before || !prepared.after))
      throw new BadRequestException('CoachSamples.bothRequired');
    const added: string[] = [],
      obsolete: string[] = [];
    try {
      const result = await coachingWrite(
        this.database.db,
        actor,
        async (tx) => {
          await this.lock(tx, actor);
          const all = await rows<Sample>(
            tx,
            sql`SELECT * FROM coach_samples WHERE coach_id=${actor} ORDER BY position FOR UPDATE`,
          );
          const old = id ? all.find((s) => s.id === id) : undefined;
          if (id && !old) throw new NotFoundException();
          if (old && old.revision !== input.revision)
            throw new ConflictException('Practice.conflict');
          if (!old && all.length >= 5)
            throw new ConflictException('CoachSamples.limit');
          const sampleId = old?.id ?? randomUUID();
          const keys = {
            before: old?.before_key ?? '',
            after: old?.after_key ?? '',
          };
          for (const side of ['before', 'after'] as const)
            if (prepared[side]) {
              const key = `coaching/samples/${actor}/${sampleId}/${randomUUID()}.webp`;
              added.push(key);
              await this.storage.put(key, prepared[side], 'image/webp');
              if (keys[side]) obsolete.push(keys[side]);
              keys[side] = key;
            }
          if (old)
            await tx.execute(
              sql`UPDATE coach_samples SET title=${input.title},before_key=${keys.before},after_key=${keys.after},revision=revision+1 WHERE id=${sampleId}`,
            );
          else
            await tx.execute(
              sql`INSERT INTO coach_samples(id,coach_id,position,title,before_key,after_key) VALUES(${sampleId},${actor},${all.length},${input.title},${keys.before},${keys.after})`,
            );
          return { id: sampleId };
        },
      );
      await Promise.all(
        obsolete.map((key) => this.storage.delete(key).catch(() => undefined)),
      );
      return result;
    } catch (error) {
      await Promise.all(
        added.map((key) => this.storage.delete(key).catch(() => undefined)),
      );
      throw error;
    }
  }
  async action(actor: string, id: string, input: z.infer<typeof sampleAction>) {
    const obsolete: string[] = [];
    await coachingWrite(this.database.db, actor, async (tx) => {
      await this.lock(tx, actor);
      const all = await rows<Sample>(
        tx,
        sql`SELECT * FROM coach_samples WHERE coach_id=${actor} ORDER BY position FOR UPDATE`,
      );
      const s = all.find((s) => s.id === id);
      if (!s) throw new NotFoundException();
      if (s.revision !== input.revision)
        throw new ConflictException('Practice.conflict');
      if (input.action === 'delete') {
        await tx.execute(sql`DELETE FROM coach_samples WHERE id=${id}`);
        await tx.execute(
          sql`UPDATE coach_samples SET position=position-1,revision=revision+1 WHERE coach_id=${actor} AND position>${s.position}`,
        );
        obsolete.push(s.before_key, s.after_key);
      } else if (input.action === 'swap') {
        await tx.execute(
          sql`UPDATE coach_samples SET before_key=after_key,after_key=before_key,revision=revision+1 WHERE id=${id}`,
        );
      } else {
        const next = all.find(
          (n) => n.position === s.position + (input.action === 'up' ? -1 : 1),
        );
        if (next)
          await tx.execute(
            sql`UPDATE coach_samples SET position=CASE WHEN id=${id} THEN ${next.position}::integer ELSE ${s.position}::integer END,revision=revision+1 WHERE id IN (${id},${next.id})`,
          );
      }
    });
    await Promise.all(
      obsolete.map((key) => this.storage.delete(key).catch(() => undefined)),
    );
    return { success: true };
  }
}
