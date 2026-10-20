import {
  changeReasonSchema,
  changeReasonBodySchema,
} from '../../platform/audit/change-reason';
import { ConsentGuard } from '../profile/consent.guard';
import {
  Body,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import {
  ClientHeader,
  JsonBody,
  parse,
  phoneSchema,
} from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { BusinessService } from './business.service';
const nameSchema = z
  .object({ name: z.string().trim().min(2).max(120) })
  .strict();
function businessUser(req: AuthRequest) {
  if (req.principal.session.client !== 'business')
    throw new ForbiddenException('Backend.signInFromTheBusinessPanel');
  return req.principal.user.id;
}
@DomainController('business', 'organizations')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessController {
  constructor(private readonly service: BusinessService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.service.list(businessUser(req));
  }
  @Post()
  @JsonBody({ name: { type: 'string' } })
  create(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.service.create(businessUser(req), parse(nameSchema, body).name);
  }
  @Get(':organizationId/branches') branches(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
  ) {
    return this.service.listBranches(businessUser(req), parse(z.uuid(), id));
  }
  @Post(':organizationId/branches')
  @JsonBody({ name: { type: 'string' } })
  createBranch(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
    @Body() body: unknown,
  ) {
    return this.service.createBranch(
      businessUser(req),
      parse(z.uuid(), id),
      parse(nameSchema, body).name,
    );
  }
  @Get(':organizationId/team') team(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
  ) {
    return this.service.team(businessUser(req), parse(z.uuid(), id));
  }
  @Post(':organizationId/invitations')
  @JsonBody(
    {
      phone: { type: 'string' },
      role: { type: 'string', enum: ['manager', 'receptionist', 'accountant'] },
      reason: { type: 'string', minLength: 3, maxLength: 500 },
      branchIds: {
        type: 'array',
        items: { type: 'string', format: 'uuid' },
        minItems: 1,
        maxItems: 100,
        uniqueItems: true,
      },
    },
    ['phone', 'role', 'reason'],
  )
  invite(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z
        .object({
          phone: phoneSchema,
          role: z.enum(['manager', 'receptionist', 'accountant']),
          reason: changeReasonSchema,
          branchIds: z
            .array(z.uuid())
            .min(1)
            .max(100)
            .refine((ids) => new Set(ids).size === ids.length)
            .optional(),
        })
        .strict(),
      body,
    );
    return this.service.invite(
      businessUser(req),
      parse(z.uuid(), id),
      input.phone,
      input.role,
      input.branchIds,
      input.reason,
    );
  }
  @Post(':organizationId/team/:memberId/remove')
  @JsonBody({ reason: { type: 'string', minLength: 3, maxLength: 500 } })
  remove(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
    @Param('memberId') memberId: string,
    @Body() body: unknown,
  ) {
    return this.service.remove(
      businessUser(req),
      parse(z.uuid(), id),
      parse(z.uuid(), memberId),
      false,
      parse(changeReasonBodySchema, body).reason,
    );
  }
  @Post(':organizationId/invitations/:invitationId/revoke')
  @JsonBody({ reason: { type: 'string', minLength: 3, maxLength: 500 } })
  revoke(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
    @Param('invitationId') invitationId: string,
    @Body() body: unknown,
  ) {
    return this.service.remove(
      businessUser(req),
      parse(z.uuid(), id),
      parse(z.uuid(), invitationId),
      true,
      parse(changeReasonBodySchema, body).reason,
    );
  }
}
