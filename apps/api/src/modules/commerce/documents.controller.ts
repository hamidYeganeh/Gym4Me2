import {
  Body,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { SportsDocumentService } from './documents.service';
import { jsonDto } from './commerce.service';
@DomainController('sports', 'documents')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class SportsDocumentsController {
  constructor(private readonly service: SportsDocumentService) {}
  @Get() async list(@Req() req: AuthRequest) {
    return jsonDto(await this.service.list(req.principal.user.id));
  }
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
    }),
  )
  async upload(
    @Req() req: AuthRequest,
    @Body() body: unknown,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    const v = parse(
      z
        .object({
          serviceId: z.uuid(),
          name: z.string().trim().min(1).max(200),
          expiresAt: z.iso.datetime({ offset: true }).optional(),
        })
        .strict(),
      body,
    );
    return jsonDto(
      await this.service.upload(
        req.principal.user.id,
        v.serviceId,
        v.name,
        file,
        v.expiresAt,
      ),
    );
  }
  @Get(':id/preview') preview(
    @Req() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.service.preview(req.principal.user.id, parse(z.uuid(), id));
  }
}
