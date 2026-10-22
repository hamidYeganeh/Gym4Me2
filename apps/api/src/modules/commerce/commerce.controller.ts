import { managementFilters } from './management-filters';
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
import { ApiBody, ApiQuery } from '@nestjs/swagger';
import { bookingPageSchema } from './booking-page';
import {
  serviceBodySchema,
  resourceCreateBodySchema,
} from './commerce.openapi';
import { resourceCreateSchema } from './resources.contracts';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, JsonBody, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { CommerceService, jsonDto } from './commerce.service';
import {
  checkoutSchema,
  changeSchema,
  couponSchema,
  occurrenceSeriesSchema,
  occurrenceSeriesEditSchema,
  paymentScenario,
  serviceSchema,
} from './commerce.contracts';
const id = (value: string) => parse(z.uuid(), value);
const dto = async (value: Promise<unknown>) => jsonDto(await value);
@DomainController('sports', 'payment-callbacks')
export class SportsPaymentCallbacksController {
  constructor(private readonly service: CommerceService) {}

  @Post('saman-mock')
  @JsonBody({ reference: { type: 'string' }, proof: { type: 'string' } })
  callback(@Body() body: unknown) {
    const input = parse(
      z
        .object({
          reference: z.string().startsWith('saman-mock:').max(200),
          proof: z.string().regex(/^[a-f0-9]{64}$/i),
        })
        .strict(),
      body,
    );
    return this.service
      .mockPaymentCallback(input.reference, input.proof)
      .then(() => ({ received: true }));
  }
}
@DomainController('sports', 'services')
export class SportsCatalogController {
  constructor(private readonly service: CommerceService) {}
  @Get() list(
    @Query('q') q?: string,
    @Query('branchId') branch?: string,
    @Query('organizationId') organization?: string,
  ) {
    return dto(
      this.service.catalog(
        parse(z.string().max(160), q ?? ''),
        branch ? id(branch) : undefined,
        organization ? id(organization) : undefined,
      ),
    );
  }
  @Get(':id') detail(@Param('id') value: string) {
    return dto(this.service.detail(id(value)));
  }
}
@DomainController('sports', 'account')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class SportsAccountController {
  constructor(private readonly service: CommerceService) {}
  @Post('quote')
  @JsonBody({ serviceId: { type: 'string' } })
  quote(@Req() req: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.quote(
        req.principal.user.id,
        parse(
          checkoutSchema.omit({ idempotencyKey: true, quoteId: true }),
          body,
        ),
      ),
    );
  }
  @Post('checkout')
  @JsonBody({
    serviceId: { type: 'string' },
    idempotencyKey: { type: 'string' },
  })
  checkout(@Req() req: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.checkout(
        req.principal.user.id,
        parse(checkoutSchema.required({ quoteId: true }), body),
      ),
    );
  }
  @Get('orders') orders(@Req() req: AuthRequest) {
    return dto(this.service.myOrders(req.principal.user.id));
  }
  @Get('orders/:id') order(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.myOrder(req.principal.user.id, id(value)));
  }
  @Post('orders/:id/payment')
  @JsonBody({
    scenario: { type: 'string' },
    idempotencyKey: { type: 'string' },
  })
  payment(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z
        .object({ scenario: paymentScenario, idempotencyKey: z.uuid() })
        .strict(),
      body,
    );
    return dto(
      this.service.startPayment(
        req.principal.user.id,
        id(value),
        input.scenario,
        input.idempotencyKey,
      ),
    );
  }
  @Post('orders/:id/verify') verify(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.verifyPayment(req.principal.user.id, id(value)));
  }
  @Post('orders/:id/query') query(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(
      this.service.verifyPayment(req.principal.user.id, id(value), true),
    );
  }
  @Get('bookings') bookings(@Req() req: AuthRequest) {
    return dto(this.service.bookings(req.principal.user.id));
  }
  @Get('bookings/page')
  @ApiQuery({ name: 'tab', enum: ['upcoming', 'past'], required: false })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    schema: { minimum: 1, maximum: 50, default: 20 },
  })
  @ApiQuery({ name: 'cursor', type: String, required: false })
  bookingPage(@Req() req: AuthRequest, @Query() query: unknown) {
    return dto(
      this.service.bookingPage(
        req.principal.user.id,
        parse(bookingPageSchema, query),
      ),
    );
  }
  @Get('bookings/:id') booking(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.booking(req.principal.user.id, id(value)));
  }
  @Get('bookings/:id/cancellation') preview(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.cancelPreview(req.principal.user.id, id(value)));
  }
  @Post('bookings/:id/cancel')
  @JsonBody({
    revision: { type: 'integer' },
    idempotencyKey: { type: 'string' },
  })
  cancel(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(changeSchema, body);
    return dto(
      this.service.cancel(
        req.principal.user.id,
        id(value),
        input.revision,
        input.expectedRefundMinor,
        input.idempotencyKey,
      ),
    );
  }
  @Post('bookings/:id/reschedule')
  @JsonBody({
    revision: { type: 'integer' },
    occurrenceId: { type: 'string' },
    idempotencyKey: { type: 'string' },
  })
  reschedule(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(changeSchema.required({ occurrenceId: true }), body);
    return dto(
      this.service.reschedule(
        req.principal.user.id,
        id(value),
        input.revision,
        input.occurrenceId,
        input.idempotencyKey,
      ),
    );
  }
  @Post('bookings/:id/ticket') ticket(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.ticket(req.principal.user.id, id(value)));
  }
  @Get('memberships') memberships(@Req() req: AuthRequest) {
    return dto(this.service.memberships(req.principal.user.id));
  }
  @Get('memberships/:id') membership(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.membership(req.principal.user.id, id(value)));
  }
  @Post('memberships/:id/ticket') membershipTicket(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.ticket(req.principal.user.id, id(value), true));
  }
  @Post('memberships/:id/freeze')
  @JsonBody({ revision: { type: 'integer' }, days: { type: 'integer' } })
  freeze(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z
        .object({
          revision: z.number().int().positive(),
          days: z.number().int().min(1).max(365),
        })
        .strict(),
      body,
    );
    return dto(
      this.service.freeze(
        req.principal.user.id,
        id(value),
        input.revision,
        input.days,
      ),
    );
  }
  @Post('waitlist/:id/accept') acceptOffer(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.service.acceptOffer(req.principal.user.id, id(value)));
  }
  @Get('waitlist') waitlist(@Req() req: AuthRequest) {
    return dto(this.service.waitlist(req.principal.user.id));
  }
  @Post('waitlist')
  @JsonBody({ occurrenceId: { type: 'string' } })
  join(@Req() req: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.waitlist(
        req.principal.user.id,
        parse(z.object({ occurrenceId: z.uuid() }).strict(), body).occurrenceId,
      ),
    );
  }
  @Post('waitlist/:id/withdraw') withdraw(
    @Req() req: AuthRequest,
    @Param('id') value: string,
  ) {
    return this.service.withdraw(req.principal.user.id, id(value));
  }
}
@DomainController('business', 'sports')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessSportsController {
  constructor(private readonly service: CommerceService) {}
  private user(req: AuthRequest) {
    if (req.principal.session.client !== 'business')
      throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
    return req.principal.user.id;
  }
  @Get('services') list(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
    @Query() filters: unknown,
  ) {
    return dto(
      this.service.business(
        this.user(req),
        id(org),
        id(branch),
        managementFilters(filters),
      ),
    );
  }
  @Post('services')
  @ApiBody({ schema: serviceBodySchema })
  create(@Req() req: AuthRequest, @Body() body: unknown) {
    return dto(
      this.service.createService(this.user(req), parse(serviceSchema, body)),
    );
  }
  @Get('services/:id/coupons')
  coupons(@Req() req: AuthRequest, @Param('id') value: string) {
    return dto(this.service.coupons(this.user(req), id(value)));
  }
  @Post('services/:id/coupons')
  @JsonBody({
    code: { type: 'string' },
    basisPoints: { type: 'integer' },
    maxUses: { type: 'integer' },
    expiresAt: { type: 'string' },
  })
  createCoupon(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.createCoupon(
        this.user(req),
        id(value),
        parse(couponSchema, body),
      ),
    );
  }
  @Post('services/:id/coupons/:couponId/disable')
  @JsonBody({ revision: { type: 'integer' } })
  disableCoupon(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Param('couponId') couponId: string,
    @Body() body: unknown,
  ) {
    const { revision } = parse(
      z.object({ revision: z.number().int().positive() }).strict(),
      body,
    );
    return dto(
      this.service.disableCoupon(
        this.user(req),
        id(value),
        id(couponId),
        revision,
      ),
    );
  }
  @Post('services/:id/publish')
  @JsonBody({ revision: { type: 'integer' } })
  publish(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.publish(
        this.user(req),
        id(value),
        parse(
          z.object({ revision: z.number().int().positive() }).strict(),
          body,
        ).revision,
      ),
    );
  }
  @Post('services/:id/occurrence-series')
  @JsonBody({
    startAt: { type: 'string' },
    endAt: { type: 'string' },
    capacity: { type: 'integer' },
    count: { type: 'integer' },
    intervalDays: { type: 'integer' },
    revision: { type: 'integer' },
    idempotencyKey: { type: 'string' },
  })
  scheduleSeries(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.scheduleSeries(
        this.user(req),
        id(value),
        parse(occurrenceSeriesSchema, body),
      ),
    );
  }
  @Get('services/:id/occurrence-series')
  listSeries(@Req() req: AuthRequest, @Param('id') value: string) {
    return dto(this.service.listSeries(this.user(req), id(value)));
  }
  @Post('services/:id/occurrence-series/:seriesId/edit')
  @JsonBody({
    startAt: { type: 'string' },
    endAt: { type: 'string' },
    capacity: { type: 'integer' },
    intervalDays: { type: 'integer' },
    revision: { type: 'integer' },
    idempotencyKey: { type: 'string' },
    reason: { type: 'string' },
  })
  editSeries(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Param('seriesId') seriesId: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.service.editSeries(
        this.user(req),
        id(value),
        id(seriesId),
        parse(occurrenceSeriesEditSchema, body),
      ),
    );
  }
  @Get('resources') resources(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(this.service.resources(this.user(req), id(org), id(branch)));
  }
  @Post('resources')
  @ApiBody({ schema: resourceCreateBodySchema })
  resource(@Req() req: AuthRequest, @Body() body: unknown) {
    const v = parse(resourceCreateSchema, body);
    return dto(
      this.service.createResource(
        this.user(req),
        v.organizationId,
        v.branchId,
        v.name,
        v.unitIds,
        v.idempotencyKey,
      ),
    );
  }
  @Get('reception') reception(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
    @Query() filters: unknown,
  ) {
    return dto(
      this.service.reception(
        this.user(req),
        id(org),
        id(branch),
        managementFilters(filters),
      ),
    );
  }
  @Post('check-in')
  @JsonBody({ token: { type: 'string' }, reason: { type: 'string' } })
  checkIn(@Req() req: AuthRequest, @Body() body: unknown) {
    const v = parse(
      z
        .object({
          token: z.string().regex(/^[\w-]{43}$/),
          reason: z.string().trim().min(2).max(500),
        })
        .strict(),
      body,
    );
    return dto(this.service.checkIn(this.user(req), v.token, v.reason));
  }
  @Post('visits/:id/exit')
  @JsonBody({ reason: { type: 'string' } })
  exitVisit(
    @Req() req: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z.object({ reason: z.string().trim().min(2).max(500) }).strict(),
      body,
    );
    return dto(this.service.exitVisit(this.user(req), id(value), input.reason));
  }
  @Get('visits')
  visits(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(
      this.service.receptionVisits(this.user(req), id(org), id(branch)),
    );
  }
  @Get('report') report(
    @Req() req: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(this.service.report(this.user(req), id(org), id(branch)));
  }
}
