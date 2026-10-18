import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ClientHeader, JsonBody, parse } from '../auth/auth.contracts';
import { ConsentGuard } from '../profile/consent.guard';
import { commandKey, revision } from './commerce.contracts';
import { SportsMediaService } from './media.service';

@DomainController('business', 'sports')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessSportsMediaController {
  constructor(private readonly media: SportsMediaService) {}
  private actor(req: AuthRequest) {
    if (req.principal.session.client !== 'business')
      throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
    return req.principal.user.id;
  }
  @Post('services/:id/cover')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'alt', 'revision', 'idempotencyKey'],
      properties: {
        file: { type: 'string', format: 'binary' },
        alt: { type: 'string', minLength: 1, maxLength: 280 },
        revision: { type: 'integer', minimum: 1 },
        idempotencyKey: { type: 'string', minLength: 8, maxLength: 100 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 3 },
    }),
  )
  upload(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const input = parse(
      z
        .object({
          alt: z.string().trim().min(1).max(280),
          revision: z.coerce.number().int().positive(),
          idempotencyKey: commandKey,
        })
        .strict(),
      body,
    );
    return this.media.upload(
      this.actor(req),
      parse(z.uuid(), value),
      input,
      file,
    );
  }
  @Post('services/:id/cover/remove')
  @JsonBody({
    revision: { type: 'integer' },
    idempotencyKey: { type: 'string' },
  })
  remove(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return this.media.remove(
      this.actor(req),
      parse(z.uuid(), value),
      parse(z.object({ revision, idempotencyKey: commandKey }).strict(), body),
    );
  }
  @Get('services/:id/cover/preview')
  preview(@Req() req: AuthRequest, @Param('id') value: string) {
    return this.media.preview(this.actor(req), parse(z.uuid(), value));
  }
}

@DomainController('sports', 'media')
export class PublicSportsMediaController {
  constructor(private readonly media: SportsMediaService) {}
  @Get(':id')
  async content(@Param('id') value: string, @Res() response: Response) {
    const image = await this.media.publicContent(parse(z.uuid(), value));
    response.setHeader('Content-Type', image.contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.send(image.body);
  }
}
