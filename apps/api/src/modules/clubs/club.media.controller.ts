import { ConsentGuard } from '../profile/consent.guard';
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { id } from './club.contracts';
import { ClubMediaService } from './club.media.service';
import { AdminService } from '../admin/admin.service';
const businessUser = (req: AuthRequest) => {
  if (req.principal.session.client !== 'business')
    throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
  return req.principal.user.id;
};
@DomainController('business', 'clubs')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessMediaController {
  constructor(private readonly media: ClubMediaService) {}
  @Post(':id/media/upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        alt: { type: 'string', maxLength: 280 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 },
    }),
  )
  upload(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() input: unknown,
  ) {
    const data = parse(
      z.object({ alt: z.string().trim().max(280).optional() }).strict(),
      input,
    );
    return this.media.upload(
      businessUser(req),
      parse(id, clubId),
      file,
      data.alt,
    );
  }
  @Get(':id/media/:mediaId/preview') preview(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.preview(
      businessUser(req),
      parse(id, clubId),
      parse(id, mediaId),
    );
  }
  @Post(':id/media/:mediaId/delete') remove(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.remove(
      businessUser(req),
      parse(id, clubId),
      parse(id, mediaId),
    );
  }
}
@DomainController('catalog', 'media')
export class PublicMediaController {
  constructor(private readonly media: ClubMediaService) {}
  @Get(':id') async content(
    @Param('id') mediaId: string,
    @Res() res: Response,
  ) {
    const file = await this.media.publicContent(parse(id, mediaId));
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.send(file.body);
  }
}
@DomainController('admin', 'clubs')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminMediaController {
  constructor(
    private readonly media: ClubMediaService,
    private readonly admin: AdminService,
  ) {}
  @Get(':id/media/:mediaId/preview') async preview(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Param('mediaId') mediaId: string,
  ) {
    await this.admin.requireAdmin(req.principal);
    return this.media.previewForAdmin(parse(id, clubId), parse(id, mediaId));
  }
}
