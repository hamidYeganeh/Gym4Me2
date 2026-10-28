import {
  Body,
  ConflictException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { AdminService } from '../admin/admin.service';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { rows, jsonDto } from '../commerce/commerce.service';
const page = z.enum(['home', 'clubs', 'coaches', 'classes', 'map']);
const localLink = z
  .string()
  .max(500)
  .refine(
    (v) => v === '' || (/^\/(?!\/)/.test(v) && !/[\\\u0000-\u0020]/.test(v)),
  );
const image = z
  .url()
  .max(2000)
  .refine((v) => new URL(v).protocol === 'https:');
const content = z
  .object({
    page,
    title: z.string().trim().min(1).max(160),
    subtitle: z.string().trim().max(500),
    carouselType: z.enum(['single', 'carousel', 'grid']),
    imageRatio: z.enum(['16/9', '4/3', '1/1', '3/4']),
    position: z.number().int().min(0).max(1000),
    published: z.boolean(),
    slides: z
      .array(
        z
          .object({
            title: z.string().trim().max(160),
            subtitle: z.string().trim().max(500),
            image,
            href: localLink,
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict();
@DomainController('catalog', 'discovery-content')
export class PublicDiscoveryContentController {
  constructor(private readonly database: DatabaseService) {}
  @Get() async list(@Query('page') value: unknown) {
    const target = parse(page, value);
    return jsonDto(
      await rows(
        this.database.db,
        sql`SELECT id, config FROM discovery_content WHERE page=${target} AND published AND deleted_at IS NULL ORDER BY position,id`,
      ),
    );
  }
}
@DomainController('admin', 'discovery-content')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminDiscoveryContentController {
  constructor(
    private readonly database: DatabaseService,
    private readonly admin: AdminService,
  ) {}
  @Get() async list(@Req() req: AuthRequest) {
    await this.admin.requireAdmin(req.principal);
    return jsonDto(
      await rows(
        this.database.db,
        sql`SELECT id,config,revision FROM discovery_content WHERE deleted_at IS NULL ORDER BY page,position,id`,
      ),
    );
  }
  @Post() async create(@Req() req: AuthRequest, @Body() body: unknown) {
    await this.admin.requireAdmin(req.principal);
    const data = parse(content, body);
    return this.database.db.transaction(async (tx) => {
      const [saved] = await rows<{ id: string }>(
        tx,
        sql`INSERT INTO discovery_content(page,position,published,config) VALUES(${data.page},${data.position},${data.published},${JSON.stringify(data)}::jsonb) RETURNING id,config,revision`,
      );
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,action,target_id,details) VALUES(${req.principal.user.id},'discovery.created',${saved!.id},'{}'::jsonb)`,
      );
      return jsonDto(saved);
    });
  }
  @Patch(':id') async update(
    @Req() req: AuthRequest,
    @Param('id') reference: string,
    @Body() body: unknown,
  ) {
    await this.admin.requireAdmin(req.principal);
    const id = parse(z.uuid(), reference);
    const data = parse(
      z
        .object({
          revision: z.number().int().positive(),
          content: content.optional(),
          deleted: z.boolean().optional(),
        })
        .strict()
        .refine((v) => v.content !== undefined || v.deleted === true),
      body,
    );
    return this.database.db.transaction(async (tx) => {
      const result = data.deleted
        ? await rows(
            tx,
            sql`UPDATE discovery_content SET deleted_at=now(),revision=revision+1,updated_at=now() WHERE id=${id} AND revision=${data.revision} AND deleted_at IS NULL RETURNING id`,
          )
        : await rows(
            tx,
            sql`UPDATE discovery_content SET page=${data.content!.page},position=${data.content!.position},published=${data.content!.published},config=${JSON.stringify(data.content)}::jsonb,revision=revision+1,updated_at=now() WHERE id=${id} AND revision=${data.revision} AND deleted_at IS NULL RETURNING id,config,revision`,
          );
      if (!result.length) throw new ConflictException('Catalog.conflict');
      await rows(
        tx,
        sql`INSERT INTO audit_events(actor_id,action,target_id,details) VALUES(${req.principal.user.id},${data.deleted ? 'discovery.deleted' : 'discovery.updated'},${id},'{}'::jsonb)`,
      );
      return jsonDto(result[0]);
    });
  }
}
