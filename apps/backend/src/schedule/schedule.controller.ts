import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { Auth, phoneOf } from '../onboarding/auth';
import { tokenOf } from '../onboarding/auth.controller';
import { Database } from '../onboarding/database';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const writable = "a.role IN ('owner', 'manager')";
const sessionFields = `s.details || jsonb_build_object(
  'id', s.id, 'clubId', s.club_id, 'startsAt', s.starts_at, 'endsAt', s.ends_at,
  'capacity', s.capacity, 'approval', s.approval, 'waitlist', s.waitlist
)`;

function stringField(value: unknown, max: number, required = true) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new BadRequestException('Check the entered details.');
  return value.trim();
}

function idField(value: unknown) {
  if (typeof value !== 'string' || !uuid.test(value))
    throw new BadRequestException('Choose a valid club or class.');
  return value;
}

function timestamp(value: unknown) {
  const date = new Date(stringField(value, 40));
  if (!Number.isFinite(date.getTime()))
    throw new BadRequestException('Choose valid class times.');
  return date;
}

@Controller('api/v1/:scope/schedule')
export class ScheduleController {
  constructor(
    private readonly auth: Auth,
    private readonly db: Database,
  ) {}

  private async access(request: Request, scope: string) {
    if (scope !== 'admin' && scope !== 'business')
      throw new NotFoundException();
    const account = await this.auth.verify(tokenOf(request, scope), scope);
    return [account, scope === 'admin'] as const;
  }

  @Header('Cache-Control', 'no-store')
  @Get()
  async schedule(@Req() request: Request, @Param('scope') scope: string) {
    const access = await this.access(request, scope);
    const { rows } = await this.db.pool.query(
      `WITH allowed_clubs AS (
         SELECT c.id, c.profile, $2::boolean OR EXISTS (
           SELECT 1 FROM club_memberships a WHERE a.club_id = c.id AND a.account_id = $1 AND ${writable}
         ) AS "canWrite"
         FROM clubs c WHERE $2 OR EXISTS (
           SELECT 1 FROM club_memberships a WHERE a.club_id = c.id AND a.account_id = $1
         )
       ), allowed_sessions AS (
         SELECT s.* FROM fitness_sessions s JOIN allowed_clubs c ON c.id = s.club_id
       )
       SELECT
         COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', c.id, 'name', COALESCE(NULLIF(c.profile->>'title',''), NULLIF(c.profile->>'name',''), c.id::text),
           'cover', COALESCE(c.profile->>'cover',''), 'address', COALESCE(c.profile #>> '{location,address}',
             CASE WHEN jsonb_typeof(c.profile->'location') = 'string' THEN c.profile->>'location' END, ''),
           'canWrite', c."canWrite"
         ) ORDER BY COALESCE(c.profile->>'title',c.profile->>'name'), c.id) FROM allowed_clubs c), '[]') AS clubs,
         COALESCE((SELECT jsonb_agg(${sessionFields} ORDER BY s.starts_at, s.id) FROM allowed_sessions s), '[]') AS sessions,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'sessionId', r.session_id,
           'name', r.name, 'phone', r.phone, 'notes', r.notes, 'status', r.status) ORDER BY r.id)
           FROM fitness_reservations r JOIN allowed_sessions s ON s.id = r.session_id), '[]') AS reservations`,
      [...access],
    );
    return rows[0];
  }

  @Header('Cache-Control', 'no-store')
  @Post('classes')
  async createClass(
    @Req() request: Request,
    @Param('scope') scope: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const [account, admin] = await this.access(request, scope);
    const { clubId, startsAt, endsAt, capacity, price, approval, waitlist } =
      body ?? {};
    const club = idField(clubId);
    const start = timestamp(startsAt);
    const end = timestamp(endsAt);
    if (start.getTime() <= Date.now() || end <= start)
      throw new BadRequestException(
        'Choose a future start time and a later end time.',
      );
    if (
      typeof capacity !== 'number' ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 10000 ||
      typeof price !== 'number' ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      typeof approval !== 'boolean' ||
      typeof waitlist !== 'boolean'
    )
      throw new BadRequestException(
        'Check the class capacity, price, and booking options.',
      );
    const cover = stringField(body?.cover, 2048, false);
    if (cover && !/^https?:\/\/[^\s]+$/i.test(cover))
      throw new BadRequestException('Enter a valid cover image URL.');
    const details = {
      name: stringField(body?.name, 100),
      kind: stringField(body?.kind, 80),
      instructor: stringField(body?.instructor, 100),
      location: stringField(body?.location, 160),
      description: stringField(body?.description, 3000, false),
      visibility: stringField(body?.visibility, 40),
      cover,
      price,
    };
    const { rows } = await this.db.pool.query<{ session: unknown }>(
      `INSERT INTO fitness_sessions AS s (club_id, starts_at, ends_at, capacity, approval, waitlist, details)
       SELECT c.id,$4,$5,$6,$7,$8,$9 FROM clubs c WHERE c.id = $1 AND ($3 OR EXISTS (
         SELECT 1 FROM club_memberships a WHERE a.club_id = c.id AND a.account_id = $2 AND ${writable}
       )) RETURNING ${sessionFields} AS session`,
      [club, account, admin, start, end, capacity, approval, waitlist, details],
    );
    if (!rows[0]) throw new NotFoundException('Club unavailable.');
    return rows[0].session;
  }

  @Header('Cache-Control', 'no-store')
  @Post('reservations')
  async reserve(
    @Req() request: Request,
    @Param('scope') scope: string,
    @Body() body: Record<string, unknown> | undefined,
  ) {
    const [account, admin] = await this.access(request, scope);
    const sessionId = idField(body?.sessionId);
    const name = stringField(body?.name, 120);
    const phone = phoneOf(body?.phone);
    const notes = stringField(body?.notes, 1000, false);

    return this.db.transaction(async (client) => {
      // Serialize bookings for the same class before counting occupied spots.
      const { rows } = await client.query<{
        starts_at: Date;
        capacity: number;
        approval: boolean;
        waitlist: boolean;
      }>(
        `SELECT s.starts_at, s.capacity, s.approval, s.waitlist FROM fitness_sessions s
         WHERE s.id = $1 AND ($3 OR EXISTS (
           SELECT 1 FROM club_memberships a WHERE a.club_id = s.club_id AND a.account_id = $2 AND ${writable}
         )) FOR UPDATE OF s`,
        [sessionId, account, admin],
      );
      const session = rows[0];
      if (!session) throw new NotFoundException('Class unavailable.');
      if (session.starts_at.getTime() <= Date.now())
        throw new ConflictException('This class has already started.');
      const counts = await client.query<{
        occupied: number;
        duplicate: boolean;
      }>(
        `SELECT count(*) FILTER (WHERE status <> 'waitlisted')::int AS occupied,
          count(*) FILTER (WHERE phone = $2) > 0 AS duplicate
         FROM fitness_reservations WHERE session_id = $1`,
        [sessionId, phone],
      );
      const { occupied, duplicate } = counts.rows[0];
      if (duplicate)
        throw new ConflictException(
          'This member already has a reservation for this class.',
        );
      const full = occupied >= session.capacity;
      if (full && !session.waitlist)
        throw new ConflictException('This class is full.');
      const status = full
        ? 'waitlisted'
        : session.approval
          ? 'pending'
          : 'confirmed';
      const created = await client.query(
        `INSERT INTO fitness_reservations (session_id,name,phone,notes,status) VALUES ($1,$2,$3,$4,$5)
         RETURNING id, session_id AS "sessionId", name, phone, notes, status`,
        [sessionId, name, phone, notes, status],
      );
      return created.rows[0];
    });
  }
}
