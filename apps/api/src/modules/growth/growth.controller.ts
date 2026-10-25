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
import { GamesService, createGame, gameCommand } from './games.service';
import {
  NetworkCreditService,
  networkInput,
  networkMember,
  creditGrant,
  creditPay,
  creditSettlement,
} from './credit.service';
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
@DomainController('business', 'credit-networks')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessCreditController {
  constructor(private readonly service: NetworkCreditService) {}
  @Get() read(@Req() r: AuthRequest, @Query('organizationId') org: string) {
    return this.service.business(actor(r), id(org));
  }
  @Post() @SchemaBody(networkInput) create(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.create(actor(r), parse(networkInput, b));
  }
  @Post(':id/members') @SchemaBody(networkMember) member(
    @Req() r: AuthRequest,
    @Param('id') n: string,
    @Body() b: unknown,
  ) {
    return this.service.member(actor(r), id(n), parse(networkMember, b));
  }
  @Post(':id/grants') @SchemaBody(creditGrant) grant(
    @Req() r: AuthRequest,
    @Param('id') n: string,
    @Body() b: unknown,
  ) {
    return this.service.grant(actor(r), id(n), parse(creditGrant, b));
  }
  @Post(':id/settlements') @SchemaBody(creditSettlement) settle(
    @Req() r: AuthRequest,
    @Param('id') n: string,
    @Body() b: unknown,
  ) {
    return this.service.settle(actor(r), id(n), parse(creditSettlement, b));
  }
}
@DomainController('profile', 'credits')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AccountCreditController {
  constructor(private readonly service: NetworkCreditService) {}
  private actor(r: AuthRequest) {
    if (r.principal.session.client !== 'application')
      throw new ForbiddenException('Growth.denied');
    return r.principal.user.id;
  }
  @Get() read(@Req() r: AuthRequest) {
    return this.service.mine(this.actor(r));
  }
  @Post('pay') @SchemaBody(creditPay) pay(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.pay(this.actor(r), parse(creditPay, b));
  }
}
@DomainController('sports', 'games')
export class PublicGamesController {
  constructor(private readonly service: GamesService) {}
  @Get() read() {
    return this.service.publicList();
  }
}
@DomainController('profile', 'games')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AccountGamesController {
  constructor(private readonly service: GamesService) {}
  private actor(r: AuthRequest) {
    if (r.principal.session.client !== 'application')
      throw new ForbiddenException('Growth.denied');
    return r.principal.user.id;
  }
  @Get() mine(@Req() r: AuthRequest) {
    return this.service.mine(this.actor(r));
  }
  @Get(':id') detail(@Req() r: AuthRequest, @Param('id') n: string) {
    return this.service.detail(this.actor(r), id(n));
  }
  @Post() @SchemaBody(createGame) create(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.create(this.actor(r), parse(createGame, b));
  }
  @Post(':id/join') @SchemaBody(gameCommand) join(
    @Req() r: AuthRequest,
    @Param('id') n: string,
    @Body() b: unknown,
  ) {
    return this.service.join(this.actor(r), id(n), parse(gameCommand, b));
  }
  @Post(':id/cancel') @SchemaBody(gameCommand) cancel(
    @Req() r: AuthRequest,
    @Param('id') n: string,
    @Body() b: unknown,
  ) {
    return this.service.cancel(this.actor(r), id(n), parse(gameCommand, b));
  }
  @Post(':id/reconcile') @SchemaBody(gameCommand) async reconcile(
    @Req() r: AuthRequest,
    @Param('id') n: string,
    @Body() b: unknown,
  ) {
    parse(gameCommand, b);
    await this.service.detail(this.actor(r), id(n));
    await this.service.reconcile(id(n));
    return this.service.detail(this.actor(r), id(n));
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
