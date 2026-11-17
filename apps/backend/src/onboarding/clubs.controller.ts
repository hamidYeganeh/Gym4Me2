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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { validateClubProfile, type ClubProfile } from '../clubs/club-profile';
import {
  isStructured,
  validateStructuredProfile,
} from '../clubs/structured-profile';
import { Auth } from './auth';
import { tokenOf } from './auth.controller';
import { Database } from './database';

type StoredProfile =
  ClubProfile | Awaited<ReturnType<typeof validateStructuredProfile>>;

type ClubRequest = {
  id: string;
  profile: StoredProfile;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt: Date | null;
  rejectionReason: string | null;
};

const requestFields = `r.id, r.profile, r.status, r.submitted_at AS "submittedAt",
  r.reviewed_at AS "reviewedAt", r.rejection_reason AS "rejectionReason"`;

@Controller('api/v1')
export class ClubOnboardingController {
  constructor(
    private readonly auth: Auth,
    private readonly db: Database,
  ) {}

  @Header('Cache-Control', 'no-store')
  @Post('applicant/club-requests')
  async apply(@Req() request: Request, @Body() body: Partial<ClubProfile>) {
    const id = await this.auth.verify(
      tokenOf(request, 'applicant'),
      'applicant',
    );
    const profile = isStructured(body)
      ? await validateStructuredProfile(this.db.pool, body)
      : validateClubProfile({ description: '', cover: '', logo: '', ...body });
    const { rows } = await this.db.pool.query<ClubRequest>(
      `INSERT INTO club_requests AS r(applicant_id, profile) VALUES ($1,$2) RETURNING ${requestFields}`,
      [id, profile],
    );
    return rows[0];
  }

  @Header('Cache-Control', 'no-store')
  @Get('applicant/club-requests')
  async mine(@Req() request: Request) {
    const id = await this.auth.verify(
      tokenOf(request, 'applicant'),
      'applicant',
    );
    const { rows } = await this.db.pool.query<ClubRequest>(
      `SELECT ${requestFields} FROM club_requests r WHERE applicant_id=$1 ORDER BY submitted_at DESC, id`,
      [id],
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Get('admin/club-requests')
  async queue(@Req() request: Request) {
    await this.auth.verify(tokenOf(request, 'admin'), 'admin');
    const { rows } = await this.db.pool.query<
      ClubRequest & { phone: string; reviewerId: string | null }
    >(
      `SELECT ${requestFields}, a.phone, r.reviewer_id AS "reviewerId"
       FROM club_requests r JOIN accounts a ON a.id=r.applicant_id
       ORDER BY (r.status='pending') DESC, r.submitted_at DESC, r.id`,
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Patch('admin/club-requests/:id')
  async review(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const reviewer = await this.auth.verify(tokenOf(request, 'admin'), 'admin');
    const status = body?.status;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (status !== 'approved' && status !== 'rejected')
      throw new BadRequestException('Choose a decision.');
    if (status === 'rejected' && (!reason || reason.length > 1200)) {
      throw new BadRequestException(
        'Enter a rejection reason of up to 1200 characters.',
      );
    }
    return this.db.transaction(async (db) => {
      const { rows } = await db.query<{ applicant_id: string }>(
        `UPDATE club_requests SET status=$2, reviewer_id=$3, reviewed_at=now(), rejection_reason=$4
         WHERE id=$1 AND status='pending' RETURNING applicant_id`,
        [id, status, reviewer, status === 'rejected' ? reason : null],
      );
      const entry = rows[0];
      if (!entry) {
        const existing = await db.query(
          'SELECT 1 FROM club_requests WHERE id=$1',
          [id],
        );
        if (!existing.rowCount)
          throw new NotFoundException('Request unavailable.');
        throw new ConflictException('This request was already reviewed.');
      }
      if (status === 'approved') {
        await db.query(
          "INSERT INTO account_roles VALUES ($1,'business') ON CONFLICT DO NOTHING",
          [entry.applicant_id],
        );
      }
      return { id, status };
    });
  }

  @Header('Cache-Control', 'no-store')
  @Get('business/clubs/setup')
  async setup(@Req() request: Request) {
    const account = await this.auth.verify(
      tokenOf(request, 'business'),
      'business',
    );
    const { rows } = await this.db.pool.query<{
      id: string;
      profile: StoredProfile;
    }>(
      `SELECT r.id, r.profile FROM club_requests r
       WHERE r.applicant_id=$1 AND r.status='approved'
       AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.id=r.id)
       ORDER BY r.submitted_at, r.id`,
      [account],
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Post('business/clubs/setup/:id')
  async completeSetup(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const account = await this.auth.verify(
      tokenOf(request, 'business'),
      'business',
    );
    return this.db.transaction(async (db) => {
      const approved = await db.query<{ profile: StoredProfile }>(
        `SELECT profile FROM club_requests WHERE id=$1 AND applicant_id=$2 AND status='approved' FOR UPDATE`,
        [id, account],
      );
      if (!approved.rowCount)
        throw new NotFoundException('Approved request unavailable.');
      const profile =
        isStructured(body) || isStructured(approved.rows[0].profile)
          ? await validateStructuredProfile(
              db,
              body,
              id,
              approved.rows[0].profile,
            )
          : validateClubProfile(body);
      const created = await db.query(
        'INSERT INTO clubs(id,profile) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING',
        [id, profile],
      );
      if (created.rowCount) {
        await db.query("INSERT INTO club_memberships VALUES ($1,$2,'owner')", [
          id,
          account,
        ]);
      } else {
        const membership = await db.query(
          "SELECT 1 FROM club_memberships WHERE club_id=$1 AND account_id=$2 AND role='owner'",
          [id, account],
        );
        if (!membership.rowCount)
          throw new ConflictException('Club setup is unavailable.');
      }
      return { id };
    });
  }

  @Header('Cache-Control', 'no-store')
  @Get('business/clubs')
  async list(@Req() request: Request) {
    const id = await this.auth.verify(tokenOf(request, 'business'), 'business');
    const { rows } = await this.db.pool.query<{
      id: string;
      profile: StoredProfile;
      updatedAt: Date;
      reviewStatus: string;
      reviewRevision: number;
      rejectionReason: string | null;
      publishedAt: Date | null;
    }>(
      `SELECT c.id, c.profile, c.updated_at AS "updatedAt",
        c.review_status AS "reviewStatus", c.review_revision AS "reviewRevision",
        c.rejection_reason AS "rejectionReason", c.published_at AS "publishedAt" FROM clubs c WHERE EXISTS
       (SELECT 1 FROM club_memberships m WHERE m.club_id=c.id AND m.account_id=$1)
       ORDER BY updated_at DESC, id`,
      [id],
    );
    return rows.map(({ profile, ...entry }) => ({ ...profile, ...entry }));
  }

  @Header('Cache-Control', 'no-store')
  @Get('business/clubs/:id')
  async details(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const account = await this.auth.verify(
      tokenOf(request, 'business'),
      'business',
    );
    const { rows } = await this.db.pool.query<{
      profile: StoredProfile;
      updatedAt: Date;
      reviewStatus: string;
      reviewRevision: number;
      rejectionReason: string | null;
      publishedAt: Date | null;
    }>(
      `SELECT c.id, c.profile, c.updated_at AS "updatedAt",
        c.review_status AS "reviewStatus", c.review_revision AS "reviewRevision",
        c.rejection_reason AS "rejectionReason", c.published_at AS "publishedAt" FROM clubs c WHERE c.id=$1 AND EXISTS
       (SELECT 1 FROM club_memberships m WHERE m.club_id=c.id AND m.account_id=$2)`,
      [id, account],
    );
    if (!rows[0]) throw new NotFoundException('Club unavailable.');
    const { profile, ...entry } = rows[0];
    return { ...profile, ...entry, id };
  }

  @Header('Cache-Control', 'no-store')
  @Patch('business/clubs/:id')
  async edit(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ) {
    const account = await this.auth.verify(
      tokenOf(request, 'business'),
      'business',
    );
    return this.db.transaction(async (db) => {
      const { rows } = await db.query<{ profile: StoredProfile }>(
        `SELECT c.profile FROM clubs c WHERE c.id=$1 AND EXISTS
         (SELECT 1 FROM club_memberships m WHERE m.club_id=c.id AND m.account_id=$2 AND m.role IN ('owner','manager'))
         FOR UPDATE`,
        [id, account],
      );
      if (!rows[0])
        throw new NotFoundException('Club unavailable for editing.');
      const profile =
        isStructured(body) || isStructured(rows[0].profile)
          ? await validateStructuredProfile(db, body, id, rows[0].profile)
          : validateClubProfile(body);
      const updated = await db.query<{
        updatedAt: Date;
        reviewStatus: string;
        reviewRevision: number;
        rejectionReason: string | null;
        publishedAt: Date | null;
      }>(
        `UPDATE clubs SET profile=$2, updated_at=now(), review_status='pending',
         review_revision=review_revision+1, reviewed_at=NULL, reviewer_id=NULL, rejection_reason=NULL
         WHERE id=$1 RETURNING updated_at AS "updatedAt", review_status AS "reviewStatus",
         review_revision AS "reviewRevision", published_at AS "publishedAt", rejection_reason AS "rejectionReason"`,
        [id, profile],
      );
      return { ...profile, ...updated.rows[0], id };
    });
  }
}
