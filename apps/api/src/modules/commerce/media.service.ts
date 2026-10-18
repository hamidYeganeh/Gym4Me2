import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import sharp from 'sharp';
import { DatabaseService } from '../../database/database.service';
import { lockWritableAccount } from '../auth/account-lock';
import { StorageService } from '../clubs/storage.service';
import type { Db, Tx } from '../clubs/club.repository';
import { CommerceService, rows } from './commerce.service';
import type { ServiceCover } from './service-cover';

type CoverCommand = { revision: number; idempotencyKey: string };
type CoverResult = { revision: number; cover: ServiceCover | null };
type ServiceScope = {
  id: string;
  organization_id: string;
  branch_id: string;
  revision: number;
  status: string;
};
const digest = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class SportsMediaService {
  constructor(
    private readonly database: DatabaseService,
    private readonly commerce: CommerceService,
    private readonly storage: StorageService,
  ) {}
  private async access(
    db: Db | Tx,
    actor: string,
    serviceId: string,
    lock = false,
  ) {
    const [service] = await rows<ServiceScope>(
      db,
      sql`SELECT id,organization_id,branch_id,revision,status FROM sport_services WHERE id=${serviceId} ${lock ? sql`FOR UPDATE` : sql``}`,
    );
    if (!service) throw new NotFoundException('Backend.clubNotFound');
    await this.commerce.staff(
      db,
      actor,
      service.organization_id,
      service.branch_id,
    );
    return service;
  }
  private async receipt(db: Db | Tx, actor: string, key: string, hash: string) {
    const [receipt] = await rows<{ request_hash: string; result: CoverResult }>(
      db,
      sql`SELECT request_hash,result FROM sport_command_receipts WHERE user_id=${actor} AND command_key=${`cover:${key}`}`,
    );
    if (receipt && receipt.request_hash !== hash)
      throw new ConflictException('Backend.scheduleKeyReused');
    return receipt?.result;
  }
  private async version(
    tx: Tx,
    actor: string,
    service: ServiceScope,
    input: CoverCommand,
    hash: string,
    cover: ServiceCover | null,
  ) {
    if (service.revision !== input.revision || service.status === 'archived')
      throw new ConflictException('Backend.serviceChanged');
    await rows(
      tx,
      sql`INSERT INTO sport_service_versions(
      service_id,version,title,amount_minor,currency,description,policy,eligibility,requirements,resource_ids,
      duration_days,session_count,coach_name,coach_user_id,level,visibility,approval_required,show_participants,cover_image_id
    ) SELECT service_id,version+1,title,amount_minor,currency,description,policy,eligibility,requirements,resource_ids,
      duration_days,session_count,coach_name,coach_user_id,level,visibility,approval_required,show_participants,${cover?.id ?? null}
      FROM sport_service_versions WHERE service_id=${service.id} ORDER BY version DESC LIMIT 1`,
    );
    const result: CoverResult = { revision: service.revision + 1, cover };
    await rows(
      tx,
      sql`UPDATE sport_services SET revision=revision+1 WHERE id=${service.id}`,
    );
    await rows(
      tx,
      sql`INSERT INTO sport_command_receipts(user_id,command_key,request_hash,result)
      VALUES(${actor},${`cover:${input.idempotencyKey}`},${hash},${JSON.stringify(result)}::jsonb)`,
    );
    await rows(
      tx,
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details)
      VALUES(${actor},${service.organization_id},'sports.service.cover',${service.id},${JSON.stringify({ imageId: cover?.id ?? null, revision: result.revision })}::jsonb)`,
    );
    return result;
  }
  async upload(
    actor: string,
    serviceId: string,
    input: CoverCommand & { alt: string },
    file: Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'size'> | undefined,
  ) {
    await this.access(this.database.db, actor, serviceId);
    if (
      !file?.buffer ||
      !file.size ||
      file.buffer.length > 10 * 1024 * 1024 ||
      file.size > 10 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
    )
      throw new BadRequestException('Backend.invalidImage');
    const hash = digest(
      JSON.stringify({
        serviceId,
        revision: input.revision,
        alt: input.alt,
        file: digest(file.buffer),
      }),
    );
    const previous = await this.receipt(
      this.database.db,
      actor,
      input.idempotencyKey,
      hash,
    );
    if (previous) return previous;
    let image: { data: Buffer; info: sharp.OutputInfo };
    try {
      const pipeline = sharp(file.buffer, {
        limitInputPixels: 40000000,
        animated: false,
      });
      const metadata = await pipeline.metadata();
      if (
        !['jpeg', 'png', 'webp'].includes(metadata.format ?? '') ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error('Invalid image');
      image = await pipeline
        .rotate()
        .resize({
          width: 2000,
          height: 2000,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException('Backend.invalidImage');
    }
    const cover: ServiceCover = {
      id: randomUUID(),
      alt: input.alt,
      width: image.info.width,
      height: image.info.height,
    };
    const key = `sports/service-images/${serviceId}/${cover.id}.webp`;
    await this.storage.put(key, image.data, 'image/webp');
    try {
      const saved = await this.database.db.transaction(async (tx) => {
        await lockWritableAccount(tx, actor);
        const service = await this.access(tx, actor, serviceId, true);
        const receipt = await this.receipt(
          tx,
          actor,
          input.idempotencyKey,
          hash,
        );
        if (receipt) return { result: receipt, used: false };
        await rows(
          tx,
          sql`INSERT INTO sport_service_images(id,service_id,object_key,alt,width,height,size_bytes)
          VALUES(${cover.id},${serviceId},${key},${cover.alt},${cover.width},${cover.height},${image.data.length})`,
        );
        return {
          result: await this.version(tx, actor, service, input, hash, cover),
          used: true,
        };
      });
      if (!saved.used) await this.storage.delete(key).catch(() => undefined);
      return saved.result;
    } catch (error) {
      await this.storage.delete(key).catch(() => undefined);
      throw error;
    }
  }
  async remove(actor: string, serviceId: string, input: CoverCommand) {
    const hash = digest(
      JSON.stringify({ serviceId, revision: input.revision, remove: true }),
    );
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, actor);
      const service = await this.access(tx, actor, serviceId, true);
      return (
        (await this.receipt(tx, actor, input.idempotencyKey, hash)) ??
        this.version(tx, actor, service, input, hash, null)
      );
    });
  }
  async preview(actor: string, serviceId: string) {
    await this.access(this.database.db, actor, serviceId);
    const [image] = await rows<{ object_key: string }>(
      this.database.db,
      sql`SELECT i.object_key FROM (
      SELECT service_id,cover_image_id FROM sport_service_versions WHERE service_id=${serviceId} ORDER BY version DESC LIMIT 1
    ) v JOIN sport_service_images i ON i.id=v.cover_image_id AND i.service_id=v.service_id`,
    );
    if (!image) throw new NotFoundException('Backend.mediaNotFound');
    return this.storage.preview(image.object_key);
  }
  async publicContent(imageId: string) {
    const [image] = await rows<{ object_key: string }>(
      this.database.db,
      sql`SELECT i.object_key FROM sport_service_images i
      JOIN sport_service_versions v ON v.cover_image_id=i.id AND v.service_id=i.service_id
      JOIN sport_services s ON s.published_version_id=v.id AND s.id=v.service_id
      JOIN clubs c ON c.id=s.organization_id JOIN organizations o ON o.id=c.id
      WHERE i.id=${imageId} AND s.status='published' AND c.publication_status='published'
      AND c.archived_at IS NULL AND o.status='approved' LIMIT 1`,
    );
    if (!image) throw new NotFoundException('Backend.mediaNotFound');
    return {
      body: await this.storage.get(image.object_key),
      contentType: 'image/webp',
    };
  }
}
