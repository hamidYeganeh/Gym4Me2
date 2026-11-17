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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Auth } from '../onboarding/auth';
import { tokenOf } from '../onboarding/auth.controller';
import { Database } from '../onboarding/database';

@Controller('api/v1')
export class ClubPublicationController {
  constructor(
    private readonly db: Database,
    private readonly auth: Auth,
  ) {}

  @Header('Cache-Control', 'no-store')
  @Get('admin/club-publications')
  async queue(@Req() req: Request) {
    await this.auth.verify(tokenOf(req, 'admin'), 'admin');
    const { rows } = await this.db.pool.query<{
      id: string;
      profile: unknown;
      status: string;
      revision: number;
      submittedAt: Date;
      reviewedAt: Date | null;
      publishedAt: Date | null;
      rejectionReason: string | null;
      phone: string;
    }>(
      `SELECT c.id,c.profile,c.review_status AS status,c.review_revision AS revision,
       c.updated_at AS "submittedAt",c.reviewed_at AS "reviewedAt",c.published_at AS "publishedAt",
       c.rejection_reason AS "rejectionReason",a.phone
       FROM clubs c JOIN club_requests r ON r.id=c.id JOIN accounts a ON a.id=r.applicant_id
       ORDER BY (c.review_status='pending') DESC,c.updated_at DESC,c.id`,
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Patch('admin/club-publications/:id')
  async review(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const admin = await this.auth.verify(tokenOf(req, 'admin'), 'admin');
    const status = body?.status;
    const revision = body?.revision;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (
      (status !== 'approved' && status !== 'rejected') ||
      typeof revision !== 'number' ||
      !Number.isInteger(revision) ||
      revision < 1 ||
      revision > 2147483647
    )
      throw new BadRequestException(
        'Choose a decision for the current revision.',
      );
    if (status === 'rejected' && (!reason || reason.length > 1200))
      throw new BadRequestException(
        'Enter a rejection reason of up to 1200 characters.',
      );
    return this.db.transaction(async (db) => {
      const { rows } = await db.query<{
        complete: boolean;
        status: string;
        revision: number;
      }>(
        `SELECT profile ? 'clubTypeId' AS complete, review_status AS status, review_revision AS revision
         FROM clubs WHERE id=$1 FOR UPDATE`,
        [id],
      );
      if (!rows[0]) throw new NotFoundException('Club unavailable.');
      if (rows[0].status !== 'pending' || rows[0].revision !== revision)
        throw new ConflictException(
          'The review changed. Refresh and review the latest profile.',
        );
      if (status === 'approved' && !rows[0].complete)
        throw new BadRequestException(
          'The club owner must complete the structured profile first.',
        );
      await db.query(
        `UPDATE clubs SET review_status=$2, reviewer_id=$3, reviewed_at=now(), rejection_reason=$4,
         published_profile=CASE WHEN $2='approved' THEN profile ELSE published_profile END,
         published_at=CASE WHEN $2='approved' THEN now() ELSE published_at END WHERE id=$1`,
        [id, status, admin, status === 'rejected' ? reason : null],
      );
      return { id, status, revision };
    });
  }

  @Header('Cache-Control', 'no-store')
  @Get('public/clubs')
  async list() {
    const { rows } = await this.db.pool.query<{
      id: string;
      title: string;
      address: string;
      cover: string | null;
      coverHash: string | null;
    }>(
      `SELECT id, published_profile->>'title' AS title,
         published_profile#>>'{location,address}' AS address,
         published_profile->>'cover' AS cover,
         (
           SELECT entry->>'hash'
           FROM jsonb_array_elements(published_profile->'gallery') WITH ORDINALITY AS gallery(entry, position)
           WHERE entry->>'contentType' LIKE 'image/%'
           ORDER BY position
           LIMIT 1
         ) AS "coverHash"
       FROM clubs WHERE published_profile IS NOT NULL ORDER BY published_at DESC,id`,
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Get('public/clubs/:id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const { rows } = await this.db.pool.query<{
      published_profile: Record<string, unknown>;
    }>(
      'SELECT published_profile FROM clubs WHERE id=$1 AND published_profile IS NOT NULL',
      [id],
    );
    if (!rows[0]) throw new NotFoundException('Club unavailable.');
    return { ...rows[0].published_profile, id };
  }
}
