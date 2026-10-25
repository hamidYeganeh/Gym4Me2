import {
  Body,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { jsonDto } from './commerce.service';
import { scopeSchema } from './workflows.contracts';
import { HouseholdBillingService } from './household-billing.service';
import * as c from './household-billing.contracts';
const id = (s: string) => parse(z.uuid(), s);
const dto = async (p: Promise<unknown>) => jsonDto(await p);
function actor(r: AuthRequest, client: 'business' | 'application') {
  if (r.principal.session.client !== client) throw new ForbiddenException();
  return r.principal.user.id;
}
@DomainController('profile', 'household')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class HouseholdController {
  constructor(private readonly service: HouseholdBillingService) {}
  @Get() list(@Req() r: AuthRequest) {
    return dto(this.service.dependents(actor(r, 'application')));
  }
  @Post() create(@Req() r: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.dependent(
        actor(r, 'application'),
        parse(c.dependentInput, body),
      ),
    );
  }
  @Post(':id') update(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(c.dependentUpdate, body);
    return dto(
      this.service.dependent(
        actor(r, 'application'),
        input,
        id(value),
        input.revision,
        input.status,
      ),
    );
  }
}
@DomainController('profile', 'tuition')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class TuitionController {
  constructor(private readonly service: HouseholdBillingService) {}
  @Get(':id') list(@Req() r: AuthRequest, @Param('id') value: string) {
    return dto(this.service.installments(actor(r, 'application'), id(value)));
  }
}
@DomainController('business', 'collections')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CollectionsController {
  constructor(private readonly service: HouseholdBillingService) {}
  @Get('readiness') readiness(
    @Req() r: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(
      this.service.readiness(
        actor(r, 'business'),
        parse(scopeSchema, { organizationId: org, branchId: branch }),
      ),
    );
  }
  @Post('services/:id/sport') classify(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.classifySport(
        actor(r, 'business'),
        id(value),
        parse(c.legacySportInput, body),
      ),
    );
  }
  @Get('orders/:id') installments(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(
      this.service.installments(actor(r, 'business'), id(value), true),
    );
  }
  @Post('orders/:id') plan(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.createInstallments(
        actor(r, 'business'),
        id(value),
        parse(c.installmentPlanInput, body),
      ),
    );
  }
}
