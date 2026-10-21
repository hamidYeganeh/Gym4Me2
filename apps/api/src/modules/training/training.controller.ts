import {
  BadRequestException,
  Body,
  Get,
  Param,
  Post,
  Query,
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
import { SchemaBody } from '../clubs/club.contracts';
import { coachingActor } from '../coaching/coaching.controller';
import { jsonDto } from '../commerce/commerce.service';
import { TrainingService } from './training.service';
import { CollaborationService } from './collaboration.service';
import * as c from './training.contracts';
const uuid = (v: string) => parse(z.uuid(), v);
const dto = async (p: Promise<unknown>) => jsonDto(await p);
@DomainController('profile', 'training')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class TrainingController {
  constructor(private readonly training: TrainingService) {}
  @Get() workspace(@Req() req: AuthRequest) {
    return dto(this.training.workspace(coachingActor(req)));
  }
  @Get('exercises') exercises(
    @Req() req: AuthRequest,
    @Query() query: unknown,
  ) {
    coachingActor(req);
    return dto(
      this.training.library(
        parse(
          z.object({ search: z.string().max(100).optional() }).strict(),
          query,
        ).search,
      ),
    );
  }
  @Get('plans/:id') plan(@Req() req: AuthRequest, @Param('id') id: string) {
    return dto(this.training.plan(coachingActor(req), uuid(id)));
  }
  @Post('plans') @SchemaBody(c.savePlan) save(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(this.training.save(coachingActor(req), parse(c.savePlan, body)));
  }
  @Post('plans/:id/publish') @SchemaBody(c.publishPlan) publish(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.training.publish(
        coachingActor(req),
        uuid(id),
        parse(c.publishPlan, body),
      ),
    );
  }
  @Post('sessions/sync') @SchemaBody(c.syncSession) sync(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.training.sync(coachingActor(req), parse(c.syncSession, body)),
    );
  }
  @Post('sessions/:id/sharing') @SchemaBody(c.sessionSharing) sharing(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.training.sessionSharing(
        coachingActor(req),
        uuid(id),
        parse(c.sessionSharing, body),
      ),
    );
  }
  @Post('plans/:id/review') @SchemaBody(c.reviewPlan) review(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.training.review(
        coachingActor(req),
        uuid(id),
        parse(c.reviewPlan, body),
      ),
    );
  }
  @Get('progress') progress(@Req() req: AuthRequest) {
    return dto(this.training.progress(coachingActor(req)));
  }
  @Post('measurements') @SchemaBody(c.measurement) measure(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.training.measure(coachingActor(req), parse(c.measurement, body)),
    );
  }
  @Post('events') @SchemaBody(c.event) event(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.training.event(coachingActor(req), parse(c.event, body));
  }
}
@DomainController('profile', 'coaching-collaboration')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CollaborationController {
  constructor(private readonly collaboration: CollaborationService) {}
  @Get(':id') workspace(@Req() req: AuthRequest, @Param('id') id: string) {
    return dto(this.collaboration.workspace(coachingActor(req), uuid(id)));
  }
  @Post(':id/sharing') @SchemaBody(c.share) share(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.collaboration.sharing(
      coachingActor(req),
      uuid(id),
      parse(c.share, body),
    );
  }
  @Get(':id/messages') messages(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Query() query: unknown,
  ) {
    return dto(
      this.collaboration.messages(
        coachingActor(req),
        uuid(id),
        parse(z.object({ before: z.uuid().optional() }).strict(), query).before,
      ),
    );
  }
  @Post(':id/messages') @SchemaBody(c.message) send(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.collaboration.send(
        coachingActor(req),
        uuid(id),
        parse(c.message, body),
      ),
    );
  }
  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 3 },
    }),
  )
  image(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Backend.invalidImage');
    const value = body as Record<string, unknown>;
    return dto(
      this.collaboration.send(
        coachingActor(req),
        uuid(id),
        parse(c.message, { ...value, workoutId: value.workoutId || null }),
        file,
      ),
    );
  }
  @Get('images/:messageId/content') async content(
    @Req() req: AuthRequest,
    @Param('messageId') id: string,
  ) {
    const b = await this.collaboration.image(coachingActor(req), uuid(id));
    return { data: `data:image/webp;base64,${b.toString('base64')}` };
  }
  @Post(':id/read') read(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.collaboration.read(coachingActor(req), uuid(id));
  }
  @Post(':id/checkins') @SchemaBody(c.weekly) checkin(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.collaboration.checkin(
        coachingActor(req),
        uuid(id),
        parse(c.weekly, body),
      ),
    );
  }
  @Post(':id/:target/:targetId/feedback') @SchemaBody(c.feedback) feedback(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Param('target') target: string,
    @Param('targetId') targetId: string,
    @Body() body: unknown,
  ) {
    return this.collaboration.feedback(
      coachingActor(req),
      uuid(id),
      parse(z.enum(['session', 'checkin']), target),
      uuid(targetId),
      parse(c.feedback, body),
    );
  }
}
