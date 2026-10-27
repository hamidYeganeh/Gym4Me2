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
import { ConsentGuard } from '../profile/consent.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { CrmService } from './crm.service';
import * as c from './growth.contracts';
import {
  GrowthDiscoveryService,
  offerInput,
  recommendationQuery,
} from './discovery.service';
const id = (v: string) => parse(z.uuid(), v);
function actor(r: AuthRequest) {
  if (r.principal.session.client !== 'business')
    throw new ForbiddenException('Growth.denied');
  return r.principal.user.id;
}
@DomainController('sports', 'recommendations')
export class GrowthRecommendationsController {
  constructor(private readonly service: GrowthDiscoveryService) {}
  @Get() read(@Query() q: unknown) {
    return this.service.recommend(parse(recommendationQuery, q));
  }
}
@DomainController('business', 'offers')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class GrowthOffersController {
  constructor(private readonly service: GrowthDiscoveryService) {}
  @Get() read(@Req() r: AuthRequest, @Query() q: unknown) {
    const input = parse(c.scope, q);
    return this.service.offers(actor(r), input.organizationId, input.branchId);
  }
  @Post() @SchemaBody(offerInput) save(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.saveOffer(actor(r), parse(offerInput, b));
  }
}
@DomainController('business', 'crm')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CrmController {
  constructor(private readonly service: CrmService) {}
  @Get('options') options(@Req() r: AuthRequest) {
    return this.service.options(actor(r));
  }
  @Get() overview(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.overview(actor(r), parse(c.scope, q));
  }
  @Post('leads') @SchemaBody(c.lead) create(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.createLead(actor(r), parse(c.lead, b));
  }
  @Post('leads/:id') @SchemaBody(c.editLead) edit(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.editLead(actor(r), id(v), parse(c.editLead, b));
  }
  @Post('campaigns') @SchemaBody(c.campaign) campaign(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.createCampaign(actor(r), parse(c.campaign, b));
  }
  @Get('campaigns/:id/preview') preview(
    @Req() r: AuthRequest,
    @Param('id') v: string,
  ) {
    return this.service.preview(actor(r), id(v));
  }
  @Post('campaigns/:id/send') @SchemaBody(c.send) send(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.send(actor(r), id(v), parse(c.send, b));
  }
}
