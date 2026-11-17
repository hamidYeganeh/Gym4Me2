import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Injectable,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { Auth } from '../onboarding/auth';
import { tokenOf } from '../onboarding/auth.controller';
import { Database } from '../onboarding/database';

const maxFileSize = 20 * 1024 * 1024;
const mediaHash = /^[a-f0-9]{64}$/;
type Upload = { buffer: Buffer; size: number };

function contentType(bytes: Buffer) {
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'image/png';
  if (
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  if (
    bytes.length >= 16 &&
    bytes.toString('ascii', 4, 8) === 'ftyp' &&
    ['isom', 'iso2', 'mp41', 'mp42', 'avc1'].includes(
      bytes.toString('ascii', 8, 12),
    )
  )
    return 'video/mp4';
  throw new BadRequestException('Upload a JPEG, PNG, WebP or MP4 file.');
}

@Injectable()
export class ClubObjectStorage {
  private readonly bucket = process.env.CLUB_MEDIA_S3_BUCKET;
  private readonly client = this.bucket
    ? new S3Client({
        region: process.env.CLUB_MEDIA_S3_REGION ?? 'us-east-1',
        endpoint: process.env.CLUB_MEDIA_S3_ENDPOINT,
        forcePathStyle: Boolean(process.env.CLUB_MEDIA_S3_ENDPOINT),
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      })
    : undefined;

  async store(hash: string, type: string, bytes: Buffer) {
    if (!this.client || !this.bucket)
      throw new ServiceUnavailableException(
        'Club media storage is unavailable.',
      );
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: `clubs/sha256/${hash}`,
        Body: bytes,
        ContentType: type,
        ChecksumSHA256: Buffer.from(hash, 'hex').toString('base64'),
      }),
    );
  }

  async downloadUrl(hash: string) {
    if (!this.client || !this.bucket)
      throw new ServiceUnavailableException(
        'Club media storage is unavailable.',
      );
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: `clubs/sha256/${hash}`,
      }),
      { expiresIn: 300 },
    );
  }
}

@Controller('api/v1')
export class ClubMediaController {
  constructor(
    private readonly auth: Auth,
    private readonly db: Database,
    private readonly storage: ClubObjectStorage,
  ) {}

  private async canEdit(req: Request, id: string) {
    const account = await this.auth.verify(
      tokenOf(req, 'business'),
      'business',
    );
    const access = await this.db.pool.query(
      `SELECT 1 FROM club_requests r WHERE r.id=$1 AND r.status='approved' AND (
         (r.applicant_id=$2 AND NOT EXISTS (SELECT 1 FROM clubs c WHERE c.id=r.id))
         OR EXISTS (SELECT 1 FROM club_memberships m WHERE m.club_id=r.id AND m.account_id=$2 AND m.role IN ('owner','manager'))
       )`,
      [id, account],
    );
    if (!access.rowCount)
      throw new NotFoundException('Club unavailable for editing.');
  }

  @Post('business/clubs/:id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fields: 0, fileSize: maxFileSize },
    }),
  )
  async upload(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file?: Upload,
  ) {
    await this.canEdit(req, id);
    if (!file?.size) throw new BadRequestException('Choose a media file.');
    const type = contentType(file.buffer);
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const known = await this.db.pool.query(
      'SELECT 1 FROM club_media_objects WHERE hash=$1',
      [hash],
    );
    if (!known.rowCount) await this.storage.store(hash, type, file.buffer);
    await this.db.transaction(async (db) => {
      await db.query(
        'INSERT INTO club_media_objects VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [hash, type, file.size],
      );
      await db.query(
        'INSERT INTO club_media_uploads VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, hash],
      );
    });
    return { hash, contentType: type };
  }

  @Header('Cache-Control', 'no-store')
  @Get('business/clubs/:id/media/:hash')
  async ownerPreview(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('hash') hash: string,
  ) {
    await this.canEdit(req, id);
    if (!mediaHash.test(hash)) throw new NotFoundException();
    const result = await this.db.pool.query(
      'SELECT 1 FROM club_media_uploads WHERE request_id=$1 AND hash=$2',
      [id, hash],
    );
    if (!result.rowCount) throw new NotFoundException();
    res.redirect(await this.storage.downloadUrl(hash));
  }

  @Header('Cache-Control', 'no-store')
  @Get('admin/club-publications/:id/media/:hash')
  async adminPreview(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('hash') hash: string,
  ) {
    await this.auth.verify(tokenOf(req, 'admin'), 'admin');
    await this.redirectMedia(res, id, hash, false);
  }

  @Header('Cache-Control', 'no-store')
  @Get('public/clubs/:id/media/:hash')
  async publicMedia(
    @Res() res: Response,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('hash') hash: string,
  ) {
    await this.redirectMedia(res, id, hash, true);
  }

  private async redirectMedia(
    res: Response,
    id: string,
    hash: string,
    published: boolean,
  ) {
    if (!mediaHash.test(hash)) throw new NotFoundException();
    const column = published ? 'published_profile' : 'profile';
    const result = await this.db.pool.query(
      `SELECT 1 FROM clubs WHERE id=$1 AND (${column}->'gallery') @> jsonb_build_array(jsonb_build_object('hash',$2::text))`,
      [id, hash],
    );
    if (!result.rowCount) throw new NotFoundException();
    res.redirect(await this.storage.downloadUrl(hash));
  }
}
