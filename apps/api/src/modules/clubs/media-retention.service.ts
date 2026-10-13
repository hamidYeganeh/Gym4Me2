import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNotNull, lt, sql } from 'drizzle-orm';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { StorageService } from './storage.service';
import type { Tx } from './club.repository';

@Injectable()
export class MediaRetentionService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private async lockClub(tx: Tx, clubId: string) {
    // Same ordering as catalog writes. Recheck references while holding the lock.
    await tx
      .select({ id: s.organizations.id })
      .from(s.organizations)
      .where(eq(s.organizations.id, clubId))
      .for('update');
    await tx
      .select({ id: s.clubs.id })
      .from(s.clubs)
      .where(eq(s.clubs.id, clubId))
      .for('update');
  }

  async run(apply = false, now = new Date()) {
    const result = {
      applied: apply,
      skipped: false,
      eligibleMedia: 0,
      eligibleObjects: 0,
      deletedMedia: 0,
      deletedObjects: 0,
    };
    if (!this.storage.configured())
      return { ...result, applied: false, skipped: true };
    const cutoff = new Date(
      now.getTime() -
        this.config.get('MEDIA_ORPHAN_GRACE_DAYS', { infer: true }) * 86400000,
    );
    const candidates = await this.database.db
      .select({ id: s.clubMedia.id, clubId: s.clubMedia.organizationId })
      .from(s.clubMedia)
      .where(
        and(
          isNotNull(s.clubMedia.objectKey),
          lt(s.clubMedia.createdAt, cutoff),
          sql`not exists(select 1 from clubs where cover_id = ${s.clubMedia.id} or logo_id = ${s.clubMedia.id}) and not exists(select 1 from club_gallery where media_id = ${s.clubMedia.id})`,
        ),
      )
      .orderBy(s.clubMedia.createdAt)
      .limit(1000);
    for (const candidate of candidates) {
      await this.database.db.transaction(async (tx) => {
        await this.lockClub(tx, candidate.clubId);
        const [media] = await tx
          .select()
          .from(s.clubMedia)
          .where(eq(s.clubMedia.id, candidate.id))
          .for('update');
        if (!media?.objectKey || media.createdAt >= cutoff) return;
        const references =
          await tx.execute(sql`select 1 from clubs where cover_id = ${media.id} or logo_id = ${media.id}
          union all select 1 from club_gallery where media_id = ${media.id} limit 1`);
        if (references.rows.length) return;
        result.eligibleMedia++;
        if (!apply) return;
        // Unreferenced files only. On storage failure the metadata survives for retry.
        await this.storage.delete(media.objectKey);
        await tx.delete(s.clubMedia).where(eq(s.clubMedia.id, media.id));
        await tx.insert(s.auditEvents).values({
          organizationId: candidate.clubId,
          action: 'media.expired',
          targetId: media.id,
        });
        result.deletedMedia++;
      });
    }
    // Recover uploads whose object PUT succeeded but metadata never committed.
    // Uploads use fresh UUID keys; the grace period protects in-flight uploads.
    for await (const object of this.storage.objects()) {
      const match =
        /^clubs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.webp$/i.exec(
          object.key,
        );
      if (!match || object.modifiedAt >= cutoff) continue;
      await this.database.db.transaction(async (tx) => {
        await this.lockClub(tx, match[1]);
        const [media] = await tx
          .select({ id: s.clubMedia.id })
          .from(s.clubMedia)
          .where(eq(s.clubMedia.objectKey, object.key));
        if (media) return;
        result.eligibleObjects++;
        if (apply) {
          await this.storage.delete(object.key);
          result.deletedObjects++;
        }
      });
    }
    return result;
  }
}
