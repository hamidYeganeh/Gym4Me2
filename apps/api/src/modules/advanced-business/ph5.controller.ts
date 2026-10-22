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
import { AdvancedBusinessService } from './ph5.service';
import * as c from './ph5.contracts';
const id = (v: string) => parse(z.uuid(), v);
function actor(r: AuthRequest, surface: 'business' | 'application' | 'admin') {
  if (r.principal.session.client !== surface)
    throw new ForbiddenException('PH5.denied');
  return r.principal.user.id;
}
@DomainController('business', 'advanced')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdvancedBusinessController {
  constructor(private readonly service: AdvancedBusinessService) {}
  @Get('options') options(@Req() r: AuthRequest) {
    return this.service.options(actor(r, 'business'), 'business');
  }
  @Get() read(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.overview(
      actor(r, 'business'),
      'business',
      parse(c.scopeSchema, q),
    );
  }
  @Post('plan') @SchemaBody(c.planSchema) plan(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.selectPlan(
      actor(r, 'business'),
      parse(c.planSchema, b),
    );
  }
  @Post('plan-payments/:id/reconcile')
  @SchemaBody(c.reconcileSchema)
  reconcilePlan(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.reconcilePlan(
      actor(r, 'business'),
      id(v),
      parse(c.reconcileSchema, b),
    );
  }
  @Post('rules') @SchemaBody(c.ruleSchema) rule(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.rule(actor(r, 'business'), parse(c.ruleSchema, b));
  }
  @Post('statements') @SchemaBody(c.statementSchema) close(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.close(
      actor(r, 'business'),
      parse(c.statementSchema, b),
    );
  }
  @Post('statements/:id/approve') @SchemaBody(c.approveSchema) approve(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.approve(
      actor(r, 'business'),
      id(v),
      parse(c.approveSchema, b),
    );
  }
  @Post('statements/:id/payout') @SchemaBody(c.payoutSchema) payout(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.payout(
      actor(r, 'business'),
      id(v),
      parse(c.payoutSchema, b),
    );
  }
  @Post('payouts/:id/reconcile') @SchemaBody(c.reconcileSchema) reconcile(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.reconcile(
      actor(r, 'business'),
      id(v),
      parse(c.reconcileSchema, b),
    );
  }
  @Post('disputes') @SchemaBody(c.disputeSchema) dispute(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.dispute(
      actor(r, 'business'),
      'business',
      parse(c.disputeSchema, b),
    );
  }
  @Post('disputes/:id/resolve') @SchemaBody(c.resolveSchema) resolve(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.resolve(
      actor(r, 'business'),
      'business',
      id(v),
      parse(c.resolveSchema, b),
    );
  }
  @Post('branches') @SchemaBody(c.branchSchema) branch(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.branch(actor(r, 'business'), parse(c.branchSchema, b));
  }
  @Post('prices') @SchemaBody(c.priceSchema) price(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.price(actor(r, 'business'), parse(c.priceSchema, b));
  }
  @Post('memberships') @SchemaBody(c.sharedSchema) shared(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.shared(actor(r, 'business'), parse(c.sharedSchema, b));
  }
}
@DomainController('profile', 'settlements')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CoachSettlementsController {
  constructor(private readonly service: AdvancedBusinessService) {}
  @Get('options') options(@Req() r: AuthRequest) {
    return this.service.options(actor(r, 'application'), 'coach');
  }
  @Get('organizations') organizations(@Req() r: AuthRequest) {
    return this.service.coachOrganizations(actor(r, 'application'));
  }
  @Get() read(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.overview(
      actor(r, 'application'),
      'coach',
      parse(c.scopeSchema, q),
    );
  }
  @Post('disputes') @SchemaBody(c.disputeSchema) dispute(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.dispute(
      actor(r, 'application'),
      'coach',
      parse(c.disputeSchema, b),
    );
  }
}
@DomainController('admin', 'advanced')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminAdvancedController {
  constructor(private readonly service: AdvancedBusinessService) {}
  @Get('options') options(@Req() r: AuthRequest) {
    return this.service.options(actor(r, 'admin'), 'admin');
  }
  @Get() read(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.overview(
      actor(r, 'admin'),
      'admin',
      parse(c.scopeSchema, q),
    );
  }
  @Post('catalog') @SchemaBody(c.catalogSchema) catalog(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.configurePlan(
      actor(r, 'admin'),
      parse(c.catalogSchema, b),
    );
  }
  @Post('disputes/:id/resolve') @SchemaBody(c.resolveSchema) resolve(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() b: unknown,
  ) {
    return this.service.resolve(
      actor(r, 'admin'),
      'admin',
      id(v),
      parse(c.resolveSchema, b),
    );
  }
}
