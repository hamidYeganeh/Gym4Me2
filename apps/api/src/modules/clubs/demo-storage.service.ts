import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';

/** Small, private demo uploads. Production continues to use S3. */
@Injectable()
export class DemoStorageService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private enabled() {
    if (this.config.get('DEMO_MODE', { infer: true }) !== true)
      throw new NotFoundException();
  }
  configured() {
    return this.config.get('DEMO_MODE', { infer: true }) === true;
  }
  async put(key: string, body: Buffer, contentType: string) {
    this.enabled();
    if (body.length > 4 * 1024 * 1024)
      throw new ServiceUnavailableException('Demo upload limit is 4 MiB');
    await this.database.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(7088, 42)`);
      const usage = await tx.execute(
        sql`select coalesce(sum(octet_length(body)), 0)::int as bytes from gym4me_demo_media where key <> ${key}`,
      );
      if (Number(usage.rows[0].bytes) + body.length > 40 * 1024 * 1024)
        throw new ServiceUnavailableException('Demo storage quota reached');
      await tx.execute(sql`insert into gym4me_demo_media(key, body, content_type)
        values (${key}, decode(${body.toString('base64')}, 'base64'), ${contentType})
        on conflict(key) do update set body = excluded.body, content_type = excluded.content_type, modified_at = now()`);
    });
  }
  async get(key: string): Promise<Buffer> {
    this.enabled();
    const result = await this.database.db.execute(
      sql`select body from gym4me_demo_media where key = ${key}`,
    );
    if (!result.rows.length) throw new NotFoundException();
    return result.rows[0].body as Buffer;
  }
  async delete(key: string) {
    this.enabled();
    await this.database.db.execute(
      sql`delete from gym4me_demo_media where key = ${key}`,
    );
  }
  private proof(key: string, expires: string) {
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(`demo-media:${expires}:${key}`)
      .digest('hex');
  }
  preview(key: string) {
    this.enabled();
    const expires = String(Math.floor(Date.now() / 1000) + 60);
    const query = new URLSearchParams({
      key,
      expires,
      proof: this.proof(key, expires),
    });
    return Promise.resolve({
      url: `${this.config.get('PUBLIC_API_ORIGIN', { infer: true })}/api/v1/demo/media?${query}`,
      expiresIn: 60,
    });
  }
  async signedGet(key: string, expires: string, proof: string) {
    this.enabled();
    const now = Math.floor(Date.now() / 1000);
    if (
      !/^\d{10}$/.test(expires) ||
      Number(expires) < now ||
      Number(expires) > now + 60 ||
      !/^[a-f0-9]{64}$/.test(proof) ||
      !timingSafeEqual(
        Buffer.from(proof, 'hex'),
        Buffer.from(this.proof(key, expires), 'hex'),
      )
    )
      throw new NotFoundException();
    const result = await this.database.db.execute(
      sql`select body, content_type from gym4me_demo_media where key = ${key}`,
    );
    if (!result.rows.length) throw new NotFoundException();
    const row = result.rows[0];
    return {
      body: row.body as Buffer,
      contentType: ['image/jpeg', 'image/png', 'image/webp'].includes(
        String(row.content_type),
      )
        ? String(row.content_type)
        : 'application/octet-stream',
    };
  }
  async *objects(prefix = 'clubs/') {
    this.enabled();
    const result = await this.database.db.execute(
      sql`select key, modified_at from gym4me_demo_media where starts_with(key, ${prefix}) order by key`,
    );
    for (const row of result.rows)
      yield {
        key: String(row.key),
        modifiedAt: new Date(String(row.modified_at)),
      };
  }
  async health() {
    this.enabled();
    await this.database.db.execute(
      sql`select key from gym4me_demo_media limit 0`,
    );
    return { status: 'ok' };
  }
}
