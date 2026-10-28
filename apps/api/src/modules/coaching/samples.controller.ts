import {
  Body,
  Get,
  Header,
  Param,
  Post,
  Req,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { coachingActor } from './coaching.controller';
import {
  CoachSamplesService,
  sampleInput,
  sampleAction,
} from './samples.service';
const uploads = () =>
  FileFieldsInterceptor(
    [
      { name: 'before', maxCount: 1 },
      { name: 'after', maxCount: 1 },
    ],
    { limits: { fileSize: 4 * 1024 * 1024, files: 2, fields: 2 } },
  );
@DomainController('profile', 'coaching-samples')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CoachSamplesController {
  constructor(private readonly samples: CoachSamplesService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.samples.own(coachingActor(req));
  }
  @Post() @UseInterceptors(uploads()) create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
    @UploadedFiles()
    files: { before?: Express.Multer.File[]; after?: Express.Multer.File[] },
  ) {
    return this.samples.save(
      coachingActor(req),
      undefined,
      parse(sampleInput, body),
      files,
    );
  }
  @Post(':id') @UseInterceptors(uploads()) update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @UploadedFiles()
    files: { before?: Express.Multer.File[]; after?: Express.Multer.File[] },
  ) {
    return this.samples.save(
      coachingActor(req),
      parse(z.uuid(), id),
      parse(sampleInput, body),
      files,
    );
  }
  @Post(':id/action') action(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.samples.action(
      coachingActor(req),
      parse(z.uuid(), id),
      parse(sampleAction, body),
    );
  }
}
@DomainController('coaching', 'samples')
export class PublicCoachSamplesController {
  constructor(private readonly samples: CoachSamplesService) {}
  @Get('coach/:username') list(@Param('username') username: string) {
    return this.samples.publicList(
      parse(
        z
          .string()
          .min(3)
          .max(120)
          .regex(/^[a-z0-9-]+$/),
        username,
      ),
    );
  }
  @Get(':id/:side') @Header('Cache-Control', 'private, no-store') async media(
    @Param('id') id: string,
    @Param('side') side: string,
  ) {
    return new StreamableFile(
      await this.samples.media(
        parse(z.uuid(), id),
        parse(z.enum(['before', 'after']), side),
      ),
      { type: 'image/webp', disposition: 'inline' },
    );
  }
}
