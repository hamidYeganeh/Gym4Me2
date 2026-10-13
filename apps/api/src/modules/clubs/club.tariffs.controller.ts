import { ConsentGuard } from '../profile/consent.guard';
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
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { id, pageSchema, SchemaBody, validate } from './club.contracts';
import {
  ClubTariffService,
  tariffCreateSchema,
  tariffSchema,
} from './club.tariffs';
import { z } from 'zod';
const tariffStatusSchema = z.object({ isActive: z.boolean() }).strict();
@DomainController('business', 'clubs')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessTariffsController {
  constructor(private readonly tariffs: ClubTariffService) {}
  private user(req: AuthRequest) {
    if (req.principal.session.client !== 'business')
      throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
    return req.principal.user.id;
  }
  @Get(':id/tariffs') list(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
  ) {
    return this.tariffs.list(this.user(req), validate(id, clubId));
  }
  @Post(':id/tariffs') @SchemaBody(tariffCreateSchema) create(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Body() body: unknown,
  ) {
    return this.tariffs.create(
      this.user(req),
      validate(id, clubId),
      validate(tariffCreateSchema, body),
    );
  }
  @Post(':id/tariffs/:tariffId/versions') @SchemaBody(tariffSchema) revise(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Param('tariffId') tariffId: string,
    @Body() body: unknown,
  ) {
    return this.tariffs.revise(
      this.user(req),
      validate(id, clubId),
      validate(id, tariffId),
      validate(tariffSchema, body),
    );
  }
  @Get(':id/tariffs/:tariffId/versions') history(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Param('tariffId') tariffId: string,
    @Query('page') page: unknown,
  ) {
    return this.tariffs.history(
      this.user(req),
      validate(id, clubId),
      validate(id, tariffId),
      validate(pageSchema, page),
    );
  }
  @Post(':id/tariffs/:tariffId/status') @SchemaBody(tariffStatusSchema) status(
    @Req() req: AuthRequest,
    @Param('id') clubId: string,
    @Param('tariffId') tariffId: string,
    @Body() body: unknown,
  ) {
    return this.tariffs.status(
      this.user(req),
      validate(id, clubId),
      validate(id, tariffId),
      validate(tariffStatusSchema, body).isActive,
    );
  }
}
