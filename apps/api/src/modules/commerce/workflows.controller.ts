import {
  Body,
  Get,
  Param,
  Post,
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
import { SportsWorkflowsService } from './workflows.service';
import * as c from './workflows.contracts';
const id = (v: string) => parse(z.uuid(), v);
const dto = async (p: Promise<unknown>) => jsonDto(await p);
@DomainController('sports', 'formats')
export class SportsFormatsController {
  constructor(private readonly service: SportsWorkflowsService) {}
  @Get() sports() {
    return dto(this.service.sports());
  }
}
@DomainController('profile', 'sports-workflows')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AthleteWorkflowsController {
  constructor(private readonly service: SportsWorkflowsService) {}
  private actor(r: AuthRequest) {
    if (r.principal.session.client !== 'application')
      throw new ForbiddenException();
    return r.principal.user.id;
  }
  @Post('receipts') receipt(@Req() r: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.submitReceipt(
        this.actor(r),
        parse(c.receiptSchema, body),
        false,
      ),
    );
  }
  @Get('programs') programs(@Req() r: AuthRequest) {
    return dto(this.service.programs(this.actor(r)));
  }
  @Get('coach/programs') coachPrograms(@Req() r: AuthRequest) {
    return dto(this.service.programs(this.actor(r), true));
  }
  @Post('programs/:id/intake') intake(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.intake(
        this.actor(r),
        id(value),
        parse(c.programIntakeSchema, body),
      ),
    );
  }
  @Post('programs/:id/revision') revise(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.reviseProgram(
        this.actor(r),
        id(value),
        parse(c.programRevisionSchema, body),
      ),
    );
  }
  @Post('coach/programs/:id') update(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.updateProgram(
        this.actor(r),
        id(value),
        parse(c.programUpdateSchema, body),
      ),
    );
  }
  @Get('coach/occurrences/:id/roster') roster(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.roster(this.actor(r), id(value)));
  }
  @Post('coach/occurrences/:id/rollcall') rollcall(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.rollcall(
        this.actor(r),
        id(value),
        parse(c.rollcallSchema, body),
      ),
    );
  }
  @Get('coach/occurrences/:id/options') options(
    @Req() r: AuthRequest,
    @Param('id') v: string,
  ) {
    return dto(this.service.replacementOptions(this.actor(r), id(v)));
  }
  @Post('coach/reservations/:id/makeup') makeup(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.makeup(this.actor(r), id(v), parse(c.makeupSchema, body)),
    );
  }
  @Post('series-enrollment') enroll(
    @Req() r: AuthRequest,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.enrollSeries(
        this.actor(r),
        parse(c.seriesEnrollmentSchema, body),
      ),
    );
  }
}
@DomainController('business', 'sports-workflows')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessWorkflowsController {
  constructor(private readonly service: SportsWorkflowsService) {}
  private actor(r: AuthRequest) {
    if (r.principal.session.client !== 'business')
      throw new ForbiddenException();
    return r.principal.user.id;
  }
  @Get('refunds') refunds(
    @Req() r: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(
      this.service.refunds(
        this.actor(r),
        parse(c.scopeSchema, { organizationId: org, branchId: branch }),
      ),
    );
  }
  @Post('refunds/:id/settlement') settleRefund(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.settleRefund(
        this.actor(r),
        id(value),
        parse(c.refundSettlementSchema, body),
      ),
    );
  }
  @Post('memberships/:id/benefits') benefits(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.membershipBenefits(
        this.actor(r),
        id(v),
        parse(c.membershipBenefitsSchema, body),
      ),
    );
  }
  @Post('sales') sale(@Req() r: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.receptionSale(
        this.actor(r),
        parse(c.receptionSaleSchema, body),
      ),
    );
  }
  @Get('customers') customers(
    @Req() r: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
    @Query('search') search: string,
  ) {
    return dto(
      this.service.customers(
        this.actor(r),
        parse(c.scopeSchema, { organizationId: org, branchId: branch }),
        parse(z.string().max(100), search ?? ''),
      ),
    );
  }
  @Post('entry') entry(@Req() r: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.entry(this.actor(r), parse(c.manualEntrySchema, body)),
    );
  }
  @Get('receipts') receipts(
    @Req() r: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(
      this.service.receipts(
        this.actor(r),
        parse(c.scopeSchema, { organizationId: org, branchId: branch }),
      ),
    );
  }
  @Post('receipts') receipt(@Req() r: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.submitReceipt(
        this.actor(r),
        parse(c.receiptSchema, body),
        true,
      ),
    );
  }
  @Post('receipts/:id/decision') decide(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.decideReceipt(
        this.actor(r),
        id(value),
        parse(c.receiptDecisionSchema, body),
      ),
    );
  }
  @Get('occurrences/:id/roster') roster(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.roster(this.actor(r), id(value)));
  }
  @Get('occurrences/:id/options') options(
    @Req() r: AuthRequest,
    @Param('id') v: string,
  ) {
    return dto(this.service.replacementOptions(this.actor(r), id(v)));
  }
  @Post('reservations/:id/makeup') makeup(
    @Req() r: AuthRequest,
    @Param('id') v: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.makeup(this.actor(r), id(v), parse(c.makeupSchema, body)),
    );
  }
  @Post('occurrences/:id/rollcall') rollcall(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.rollcall(
        this.actor(r),
        id(value),
        parse(c.rollcallSchema, body),
      ),
    );
  }
}
