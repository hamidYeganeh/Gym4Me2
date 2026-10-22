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
import { ApiBody } from '@nestjs/swagger';
import { serviceVersionBodySchema } from './commerce.openapi';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, JsonBody, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { SportsOperationsService } from './operations.service';
import { CommerceService, jsonDto } from './commerce.service';
import {
  commandKey,
  serviceSchema,
  occurrenceEditSchema,
  occurrenceSeriesSchema,
  occurrenceSeriesEditSchema,
} from './commerce.contracts';
const id = (value: string) => parse(z.uuid(), value);
const reason = z.string().trim().min(3).max(1000);
const dto = async (p: Promise<unknown>) => jsonDto(await p);
@DomainController('business', 'sports-operations')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class SportsOperationsController {
  constructor(
    private readonly s: SportsOperationsService,
    private readonly commerce: CommerceService,
  ) {}
  private user(r: AuthRequest) {
    if (r.principal.session.client !== 'business')
      throw new ForbiddenException();
    return r.principal.user.id;
  }
  @Post('services/:id/version')
  @ApiBody({ schema: serviceVersionBodySchema })
  version(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z
        .object({
          revision: z.number().int().positive(),
          service: serviceSchema,
        })
        .strict(),
      body,
    );
    return dto(
      this.s.updateService(
        this.user(r),
        id(value),
        input.revision,
        input.service,
      ),
    );
  }
  @Get('services/:id/occurrences') occurrences(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.occurrences(this.user(r), id(value)));
  }
  @Post('occurrences/:id/edit')
  editOccurrence(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.commerce.editOccurrence(
        this.user(r),
        id(value),
        parse(occurrenceEditSchema, body),
      ),
    );
  }
  @Post('occurrences/:id/cancel')
  @JsonBody({ revision: { type: 'integer' }, reason: { type: 'string' } })
  cancel(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const v = parse(
      z.object({ revision: z.number().int().positive(), reason }).strict(),
      body,
    );
    return dto(
      this.s.cancelOccurrence(this.user(r), id(value), v.revision, v.reason),
    );
  }
  @Post('reservations/:id/approval')
  @JsonBody({
    revision: { type: 'integer' },
    approve: { type: 'boolean' },
    reason: { type: 'string' },
  })
  approve(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const v = parse(
      z
        .object({
          revision: z.number().int().positive(),
          approve: z.boolean(),
          reason,
        })
        .strict(),
      body,
    );
    return dto(
      this.s.approve(this.user(r), id(value), v.revision, v.approve, v.reason),
    );
  }
  @Post('reservations/:id/attendance')
  @JsonBody({ present: { type: 'boolean' }, reason: { type: 'string' } })
  attendance(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const v = parse(z.object({ present: z.boolean(), reason }).strict(), body);
    return dto(
      this.s.manualAttendance(this.user(r), id(value), v.present, v.reason),
    );
  }
  @Get('members') members(
    @Req() r: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(this.s.members(this.user(r), id(org), id(branch)));
  }
  @Get('orders') orders(
    @Req() r: AuthRequest,
    @Query('organizationId') org: string,
    @Query('branchId') branch: string,
  ) {
    return dto(this.s.orders(this.user(r), id(org), id(branch)));
  }
  @Post('orders/:id/cash')
  @JsonBody({ reason: { type: 'string' } })
  cash(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.s.cash(
        this.user(r),
        id(value),
        parse(z.object({ reason }).strict(), body).reason,
      ),
    );
  }
  @Get('services/:id/documents') documents(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.documentQueue(this.user(r), id(value)));
  }
  @Post('documents/:id/review')
  @JsonBody({
    revision: { type: 'integer' },
    approve: { type: 'boolean' },
    reason: { type: 'string' },
  })
  documentReview(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const v = parse(
      z
        .object({
          revision: z.number().int().positive(),
          approve: z.boolean(),
          reason,
        })
        .strict(),
      body,
    );
    return dto(
      this.s.reviewDocument(
        this.user(r),
        id(value),
        v.revision,
        v.approve,
        v.reason,
      ),
    );
  }
  @Post('imports/preview')
  @JsonBody({ serviceId: { type: 'string' }, csv: { type: 'string' } })
  preview(@Req() r: AuthRequest, @Body() body: unknown) {
    const v = parse(
      z.object({ serviceId: z.uuid(), csv: z.string().max(100000) }).strict(),
      body,
    );
    return dto(this.s.previewImport(this.user(r), v.serviceId, v.csv));
  }
  @Post('imports/apply')
  @JsonBody({
    serviceId: { type: 'string' },
    csv: { type: 'string' },
    idempotencyKey: { type: 'string' },
  })
  imports(@Req() r: AuthRequest, @Body() body: unknown) {
    const v = parse(
      z
        .object({
          serviceId: z.uuid(),
          csv: z.string().max(100000),
          idempotencyKey: commandKey,
        })
        .strict(),
      body,
    );
    return dto(
      this.s.importMembers(this.user(r), v.serviceId, v.csv, v.idempotencyKey),
    );
  }
}
@DomainController('admin', 'sports')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminSportsController {
  constructor(
    private readonly s: SportsOperationsService,
    private readonly commerce: CommerceService,
  ) {}
  @Get() overview(@Req() r: AuthRequest) {
    return dto(this.s.adminOverview(r.principal));
  }
  @Get('scheduling') scheduling(@Req() r: AuthRequest) {
    return dto(this.s.adminSchedule(r.principal));
  }
  @Get('services/:id/occurrences') occurrences(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.adminOccurrences(r.principal, id(value)));
  }
  @Get('services/:id/occurrence-series') series(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(
      this.commerce.listSeries(r.principal.user.id, id(value), r.principal),
    );
  }
  @Post('services/:id/occurrence-series') schedule(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      occurrenceSeriesSchema.safeExtend({
        reason: z.string().trim().min(5).max(500),
      }),
      body,
    );
    return dto(
      this.commerce.scheduleSeries(
        r.principal.user.id,
        id(value),
        input,
        r.principal,
        input.reason,
      ),
    );
  }
  @Post('services/:id/occurrence-series/:seriesId/edit') editSeries(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Param('seriesId') seriesId: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.commerce.editSeries(
        r.principal.user.id,
        id(value),
        id(seriesId),
        parse(occurrenceSeriesEditSchema, body),
        r.principal,
      ),
    );
  }
  @Post('occurrences/:id/edit') editOccurrence(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    return dto(
      this.commerce.editOccurrence(
        r.principal.user.id,
        id(value),
        parse(occurrenceEditSchema, body),
        r.principal,
      ),
    );
  }
  @Post('occurrences/:id/cancel') cancelOccurrence(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z.object({ revision: z.number().int().positive(), reason }).strict(),
      body,
    );
    return dto(
      this.s.cancelOccurrence(
        r.principal.user.id,
        id(value),
        input.revision,
        input.reason,
        r.principal,
      ),
    );
  }
  @Get('support/:id') ticket(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.adminTicket(r.principal, id(value)));
  }
  @Post('support/:id/reply')
  @JsonBody({ body: { type: 'string' }, resolve: { type: 'boolean' } })
  reply(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const v = parse(
      z
        .object({
          body: z.string().trim().min(1).max(5000),
          resolve: z.boolean(),
        })
        .strict(),
      body,
    );
    return dto(this.s.adminReply(r.principal, id(value), v.body, v.resolve));
  }
  @Post('jobs/:id/retry') retry(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.retryJob(r.principal, id(value)));
  }
  @Post('message-reports/:id/decision')
  @JsonBody({
    revision: { type: 'integer' },
    remove: { type: 'boolean' },
    reason: { type: 'string' },
  })
  decideMessageReport(
    @Req() r: AuthRequest,
    @Param('id') value: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z
        .object({
          revision: z.number().int().positive(),
          remove: z.boolean(),
          reason: z.string().trim().min(3).max(1000),
        })
        .strict(),
      body,
    );
    return dto(
      this.s.decideMessageReport(
        r.principal,
        id(value),
        input.revision,
        input.remove,
        input.reason,
      ),
    );
  }
  @Post('orders/:id/reconcile') reconcile(
    @Req() r: AuthRequest,
    @Param('id') value: string,
  ) {
    return dto(this.s.reconcile(r.principal, id(value)));
  }
}
