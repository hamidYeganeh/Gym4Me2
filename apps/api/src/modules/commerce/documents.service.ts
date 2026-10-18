import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../clubs/storage.service';
import { rows, CommerceService } from './commerce.service';
@Injectable()
export class SportsDocumentService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
    private readonly commerce: CommerceService,
  ) {}
  async list(userId: string) {
    return rows(
      this.database.db,
      sql`SELECT id,service_id,name,status,revision,expires_at,reviewed_at,reason,created_at FROM sport_documents WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 100`,
    );
  }
  async upload(
    userId: string,
    serviceId: string,
    name: string,
    file: Express.Multer.File | undefined,
    expiresAt?: string,
  ) {
    if (!file?.buffer || file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Backend.invalidField');
    const service = await this.commerce.detail(serviceId);
    if (!service.requirements.includes(name))
      throw new BadRequestException('Backend.invalidField');
    if (expiresAt && Date.parse(expiresAt) <= Date.now())
      throw new BadRequestException('Backend.invalidField');
    let body: Buffer, type: string, extension: string;
    if (
      file.mimetype === 'application/pdf' &&
      file.buffer.subarray(0, 5).toString() === '%PDF-'
    ) {
      body = file.buffer;
      type = 'application/pdf';
      extension = 'pdf';
    } else {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
        throw new BadRequestException('Backend.invalidField');
      try {
        body = await sharp(file.buffer, { limitInputPixels: 20000000 })
          .rotate()
          .resize({
            width: 1800,
            height: 1800,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp()
          .toBuffer();
      } catch {
        throw new BadRequestException('Backend.invalidField');
      }
      type = 'image/webp';
      extension = 'webp';
    }
    const count = await rows<{ count: number }>(
      this.database.db,
      sql`SELECT count(*)::int count FROM sport_documents WHERE user_id=${userId}`,
    );
    if (count[0].count >= 100)
      throw new BadRequestException('Document limit reached');
    const key = `sports/documents/${userId}/${randomUUID()}.${extension}`;
    await this.storage.put(key, body, type);
    const [document] = await rows(
      this.database.db,
      sql`INSERT INTO sport_documents(user_id,service_id,name,object_key,expires_at) VALUES(${userId},${serviceId},${name},${key},${expiresAt ?? null}) RETURNING id,name,status`,
    );
    return document;
  }
  async preview(actor: string, id: string) {
    const [document] = await rows<{
      user_id: string;
      object_key: string;
      organization_id: string;
      branch_id: string;
    }>(
      this.database.db,
      sql`SELECT d.*,s.organization_id,s.branch_id FROM sport_documents d JOIN sport_services s ON s.id=d.service_id WHERE d.id=${id}`,
    );
    if (!document) throw new NotFoundException();
    if (document.user_id !== actor)
      try {
        await this.commerce.staff(
          this.database.db,
          actor,
          document.organization_id,
          document.branch_id,
        );
      } catch {
        throw new ForbiddenException();
      }
    return this.storage.preview(document.object_key);
  }
}
