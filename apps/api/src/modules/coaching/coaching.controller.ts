import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { ConsentGuard } from '../profile/consent.guard';
import {
  coachingAnswerSchema,
  coachingInviteSchema,
  coachingPageSchema,
} from './coaching.contracts';
import { CoachingService } from './coaching.service';

export function coachingActor(req: AuthRequest) {
  if (req.principal.session.client !== 'application')
    throw new ForbiddenException('Backend.signInFromTheCoachApplication');
  return req.principal.user.id;
}
@DomainController('profile', 'coaching')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CoachingController {
  constructor(private readonly service: CoachingService) {}
  @Get()
  dashboard(@Req() req: AuthRequest, @Query() query: unknown) {
    return this.service.dashboard(
      coachingActor(req),
      parse(coachingPageSchema, query).page,
    );
  }
  @Post('requests/:id')
  request(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.request(coachingActor(req), parse(z.uuid(), id));
  }
  @Post('invitations')
  @SchemaBody(coachingInviteSchema)
  invite(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.service.invite(
      coachingActor(req),
      parse(coachingInviteSchema, body).phone,
    );
  }
  @Post('relationships/:id')
  @SchemaBody(coachingAnswerSchema)
  answer(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(coachingAnswerSchema, body);
    return this.service.answer(
      coachingActor(req),
      parse(z.uuid(), id),
      input.action,
      input.revision,
    );
  }
}
