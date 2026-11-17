import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../onboarding/auth';
import { tokenOf } from '../onboarding/auth.controller';
import { Database } from '../onboarding/database';

const groups: Record<string, readonly string[]> = {
  locations: ['countries', 'provinces', 'cities', 'districts', 'neighborhoods'],
  types: ['club_types', 'coach_types', 'gallery_media_types'],
  catalogs: [
    'sport_categories',
    'sports',
    'sub_sports',
    'equipment',
    'amenities',
  ],
};

type Resource = {
  id: string;
  code: string;
  title: string;
  active: boolean;
  parentId: string | null;
};
const fields = 'id, code, title, active, parent_id AS "parentId"';
export const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function resourceKind(group: string, kind: string) {
  if (!Object.hasOwn(groups, group) || !groups[group].includes(kind))
    throw new NotFoundException('Resource catalog unavailable.');
  return kind;
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || !value || Array.isArray(value))
    throw new BadRequestException('Enter a resource.');
  return value as Record<string, unknown>;
}

function titleOf(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120)
    throw new BadRequestException('Enter a title of up to 120 characters.');
  return value.trim();
}

@Controller('api/v1/resources')
export class ResourcesController {
  constructor(
    private readonly db: Database,
    private readonly auth: Auth,
  ) {}

  @Header('Cache-Control', 'no-store')
  @Get(':group/:kind')
  async list(
    @Req() req: Request,
    @Param('group') group: string,
    @Param('kind') kind: string,
    @Query('parentId') parentId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    resourceKind(group, kind);
    const admin = includeInactive === 'true';
    if (admin) await this.auth.verify(tokenOf(req, 'admin'), 'admin');
    if (
      parentId !== undefined &&
      (typeof parentId !== 'string' || !uuid.test(parentId))
    )
      throw new BadRequestException('Invalid parent ID.');
    const { rows } = await this.db.pool.query<Resource>(
      `WITH RECURSIVE available AS (
         SELECT id FROM club_resources WHERE parent_id IS NULL AND active
         UNION ALL
         SELECT child.id FROM club_resources child JOIN available parent ON child.parent_id=parent.id WHERE child.active
       )
       SELECT ${fields} FROM club_resources WHERE kind=$1
       AND ($2::uuid IS NULL OR parent_id=$2)
       AND ($3 OR id IN (SELECT id FROM available)) ORDER BY title, id`,
      [kind, parentId ?? null, admin],
    );
    return rows;
  }

  @Post(':group/:kind')
  async create(
    @Req() req: Request,
    @Param('group') group: string,
    @Param('kind') kind: string,
    @Body() input: unknown,
  ) {
    await this.auth.verify(tokenOf(req, 'admin'), 'admin');
    resourceKind(group, kind);
    const { title, code, parentId } = object(input);
    if (
      typeof code !== 'string' ||
      code.length > 64 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(code)
    )
      throw new BadRequestException(
        'Enter a lowercase code such as fitness-studio.',
      );
    if (
      parentId != null &&
      (typeof parentId !== 'string' || !uuid.test(parentId))
    )
      throw new BadRequestException('Invalid parent ID.');
    try {
      const { rows } = await this.db.pool.query<Resource>(
        `INSERT INTO club_resources(kind,code,title,parent_id)
         VALUES ($1,$2,$3,$4) RETURNING ${fields}`,
        [kind, code, titleOf(title), parentId ?? null],
      );
      return rows[0];
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505')
        throw new ConflictException('This code already exists here.');
      if (code === '23503' || code === '23514')
        throw new BadRequestException(
          'Select a parent from the correct catalog.',
        );
      throw error;
    }
  }

  @Patch(':group/:kind/:id')
  async edit(
    @Req() req: Request,
    @Param('group') group: string,
    @Param('kind') kind: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: unknown,
  ) {
    await this.auth.verify(tokenOf(req, 'admin'), 'admin');
    resourceKind(group, kind);
    const { title, active } = object(input);
    if (active !== undefined && typeof active !== 'boolean')
      throw new BadRequestException('Invalid active status.');
    if (title === undefined && active === undefined)
      throw new BadRequestException('Enter a title or active status.');
    const { rows } = await this.db.pool.query<Resource>(
      `UPDATE club_resources SET title=COALESCE($3,title), active=COALESCE($4,active)
       WHERE id=$1 AND kind=$2 RETURNING ${fields}`,
      [id, kind, title === undefined ? null : titleOf(title), active ?? null],
    );
    if (!rows[0]) throw new NotFoundException('Resource unavailable.');
    return rows[0];
  }
}
