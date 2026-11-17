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
import { Auth } from './auth';
import { tokenOf } from './auth.controller';
import { Database } from './database';

function requiredText(value: unknown, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length < 2 || text.length > maxLength)
    throw new BadRequestException('Invalid coach request fields.');
  return text;
}

type CoachRequest = {
  id: string;
  fullName: string;
  specialty: string;
  experience: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  revision: number;
  reviewNote: string | null;
  submittedAt: Date;
  updatedAt: Date;
};

const fields = `r.id, r.full_name AS "fullName", r.specialty, r.experience,
  r.submitted_at AS "submittedAt", COALESCE(r.updated_at, r.submitted_at) AS "updatedAt",
  r.status, r.revision, r.review_note AS "reviewNote"`;

function profile(body: Record<string, unknown>) {
  return [
    requiredText(body?.fullName, 120),
    requiredText(body?.specialty, 120),
    requiredText(body?.experience, 1200),
  ];
}

function revisionOf(value: unknown) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 2147483647
  )
    throw new BadRequestException('Invalid request revision.');
  return value;
}

@Controller('api/v1')
export class CoachRequestsController {
  constructor(
    private readonly auth: Auth,
    private readonly db: Database,
  ) {}

  @Header('Cache-Control', 'no-store')
  @Post('applicant/coach-requests')
  async apply(@Req() request: Request, @Body() body: Record<string, unknown>) {
    const applicant = await this.auth.verify(
      tokenOf(request, 'applicant'),
      'applicant',
    );

    const { rows } = await this.db.pool.query<{ id: string }>(
      `INSERT INTO coach_requests (applicant_id, full_name, specialty, experience)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [applicant, ...profile(body)],
    );
    return rows[0];
  }

  @Header('Cache-Control', 'no-store')
  @Get('applicant/coach-requests')
  async mine(@Req() request: Request) {
    const applicant = await this.auth.verify(
      tokenOf(request, 'applicant'),
      'applicant',
    );
    const { rows } = await this.db.pool.query<CoachRequest>(
      `SELECT ${fields} FROM coach_requests r WHERE r.applicant_id=$1
       ORDER BY COALESCE(r.updated_at, r.submitted_at) DESC, r.id`,
      [applicant],
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Patch('applicant/coach-requests/:id')
  async resubmit(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const applicant = await this.auth.verify(
      tokenOf(request, 'applicant'),
      'applicant',
    );
    const revision = revisionOf(body?.revision);
    const { rows } = await this.db.pool.query<CoachRequest>(
      `UPDATE coach_requests AS r
       SET full_name=$4, specialty=$5, experience=$6, status='pending',
           revision=revision+1, review_note=NULL, reviewer_id=NULL, reviewed_at=NULL, updated_at=now()
       WHERE id=$1 AND applicant_id=$2 AND revision=$3 AND status='needs_changes'
       RETURNING ${fields}`,
      [id, applicant, revision, ...profile(body)],
    );
    if (rows[0]) return rows[0];
    const existing = await this.db.pool.query(
      'SELECT 1 FROM coach_requests WHERE id=$1 AND applicant_id=$2',
      [id, applicant],
    );
    if (!existing.rowCount)
      throw new NotFoundException('Coach request unavailable.');
    throw new ConflictException(
      'This request can no longer be resubmitted from this revision.',
    );
  }

  @Header('Cache-Control', 'no-store')
  @Get('admin/coach-requests')
  async queue(@Req() request: Request) {
    await this.auth.verify(tokenOf(request, 'admin'), 'admin');
    const { rows } = await this.db.pool.query<CoachRequest & { phone: string }>(
      `SELECT ${fields}, a.phone
       FROM coach_requests r JOIN accounts a ON a.id=r.applicant_id
       ORDER BY (r.status='pending') DESC, COALESCE(r.updated_at, r.submitted_at) DESC, r.id`,
    );
    return rows;
  }

  @Header('Cache-Control', 'no-store')
  @Patch('admin/coach-requests/:id')
  async review(
    @Req() request: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const reviewer = await this.auth.verify(tokenOf(request, 'admin'), 'admin');
    const status = body?.status;
    if (
      status !== 'approved' &&
      status !== 'rejected' &&
      status !== 'needs_changes'
    )
      throw new BadRequestException('Choose a review decision.');
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (status !== 'approved' && (!note || note.length > 1200))
      throw new BadRequestException(
        'Enter a review note of up to 1200 characters.',
      );
    const { rows } = await this.db.pool.query<CoachRequest>(
      `UPDATE coach_requests AS r
       SET status=$3, review_note=$4, reviewer_id=$5, reviewed_at=now(),
           revision=revision+1, updated_at=now()
       WHERE id=$1 AND revision=$2 AND status='pending'
       RETURNING ${fields}`,
      [
        id,
        revisionOf(body.revision),
        status,
        status === 'approved' ? null : note,
        reviewer,
      ],
    );
    if (rows[0]) return rows[0];
    const existing = await this.db.pool.query(
      'SELECT 1 FROM coach_requests WHERE id=$1',
      [id],
    );
    if (!existing.rowCount)
      throw new NotFoundException('Coach request unavailable.');
    throw new ConflictException(
      'This request has changed. Reload before reviewing.',
    );
  }
}
