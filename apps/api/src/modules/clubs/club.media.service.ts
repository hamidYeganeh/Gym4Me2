import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { lockClub, memberAccess } from './club.repository';
import { publicClub, publicBranchProfile } from './club.read-model';
import { StorageService } from './storage.service';
export type UploadImage = { buffer: Buffer; mimetype: string; size: number };
@Injectable()
export class ClubMediaService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  async upload(
    userId: string,
    clubId: string,
    file: UploadImage | undefined,
    alt?: string,
  ) {
    await this.database.db.transaction((tx) => lockClub(tx, userId, clubId));
    if (
      !file ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ||
      file.size > 10 * 1024 * 1024
    )
      throw new BadRequestException('Backend.invalidImage');
    let image: { data: Buffer; info: sharp.OutputInfo };
    try {
      const pipeline = sharp(file.buffer, {
        limitInputPixels: 40_000_000,
        animated: false,
      });
      const metadata = await pipeline.metadata();
      if (
        !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error('Unsupported image');
      image = await pipeline
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException('Backend.invalidImage');
    }
    const id = randomUUID();
    const objectKey = `clubs/${clubId}/${id}.webp`;
    await this.storage.put(objectKey, image.data, 'image/webp');
    try {
      return await this.database.db.transaction(async (tx) => {
        await lockClub(tx, userId, clubId);
        const [media] = await tx
          .insert(s.clubMedia)
          .values({
            id,
            organizationId: clubId,
            uploadedBy: userId,
            type: 'image',
            objectKey,
            contentType: 'image/webp',
            sizeBytes: image.data.length,
            width: image.info.width,
            height: image.info.height,
            alt: alt?.trim() || null,
            url: `${this.config.get('PUBLIC_API_ORIGIN', { infer: true }).replace(/\/$/, '')}/api/v1/catalog/media/${id}`,
          })
          .returning();
        await tx.insert(s.auditEvents).values({
          actorId: userId,
          organizationId: clubId,
          action: 'media.uploaded',
          targetId: id,
        });
        return media;
      });
    } catch (error) {
      await this.storage.delete(objectKey).catch(() => undefined);
      throw error;
    }
  }
  async publicContent(id: string) {
    const [media] = await this.database.db
      .select({ media: s.clubMedia })
      .from(s.clubMedia)
      .innerJoin(s.clubs, eq(s.clubs.id, s.clubMedia.organizationId))
      .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
      .where(
        and(
          eq(s.clubMedia.id, id),
          publicClub(),
          sql`(${s.clubs.coverId} = ${id} or ${s.clubs.logoId} = ${id} or exists (select 1 from club_gallery g where g.media_id = ${id} and g.branch_id is null))`,
        ),
      );
    if (media?.media.objectKey)
      return {
        body: await this.storage.get(media.media.objectKey),
        contentType: media.media.contentType ?? 'image/webp',
      };
    // Gallery media for secondary branches follows the same public completeness rules.
    const [branchMedia] = await this.database.db
      .select({ media: s.clubMedia })
      .from(s.clubGallery)
      .innerJoin(s.clubMedia, eq(s.clubMedia.id, s.clubGallery.mediaId))
      .innerJoin(
        s.branchProfiles,
        eq(s.branchProfiles.branchId, s.clubGallery.branchId),
      )
      .innerJoin(s.clubs, eq(s.clubs.id, s.clubGallery.clubId))
      .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
      .where(
        and(
          eq(s.clubMedia.id, id),
          publicClub(),
          publicBranchProfile(),
          isNull(s.branchProfiles.archivedAt),
        ),
      );
    if (!branchMedia?.media.objectKey)
      throw new NotFoundException('Backend.mediaNotFound');
    return {
      body: await this.storage.get(branchMedia.media.objectKey),
      contentType: branchMedia.media.contentType ?? 'image/webp',
    };
  }
  async preview(userId: string, clubId: string, id: string) {
    await memberAccess(this.database.db, userId, clubId);
    return this.previewForAdmin(clubId, id);
  }
  async previewForAdmin(clubId: string, id: string) {
    const [media] = await this.database.db
      .select()
      .from(s.clubMedia)
      .where(
        and(eq(s.clubMedia.id, id), eq(s.clubMedia.organizationId, clubId)),
      );
    if (!media) throw new NotFoundException('Backend.mediaNotFound');
    return media.objectKey
      ? this.storage.preview(media.objectKey)
      : { url: media.url, expiresIn: null };
  }
  async remove(userId: string, clubId: string, id: string) {
    const media = await this.database.db.transaction(async (tx) => {
      await lockClub(tx, userId, clubId);
      const [row] = await tx
        .select()
        .from(s.clubMedia)
        .where(
          and(eq(s.clubMedia.id, id), eq(s.clubMedia.organizationId, clubId)),
        )
        .for('update');
      if (!row) throw new NotFoundException('Backend.mediaNotFound');
      const [reference] = await tx
        .select({ id: s.clubs.id })
        .from(s.clubs)
        .where(
          and(
            eq(s.clubs.id, clubId),
            sql`(${s.clubs.coverId} = ${id} or ${s.clubs.logoId} = ${id} or exists(select 1 from club_gallery g where g.media_id = ${id}))`,
          ),
        );
      if (reference) throw new ConflictException('Backend.mediaInUse');
      if (row.objectKey) await this.storage.delete(row.objectKey);
      await tx.delete(s.clubMedia).where(eq(s.clubMedia.id, id));
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        organizationId: clubId,
        action: 'media.deleted',
        targetId: id,
      });
      return row;
    });
    void media;
    return { success: true };
  }
}
