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
    throw new ForbiddenException('از پنل بیزینس وارد شوید.');
  return req.principal.user.id;
}
@DomainController('business', 'organizations')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
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
  @JsonBody({
    phone: { type: 'string' },
    role: { type: 'string', enum: ['manager', 'receptionist', 'accountant'] },
  })
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
        })
        .strict(),
      body,
    );
    return this.service.invite(
      businessUser(req),
      parse(z.uuid(), id),
      input.phone,
      input.role,
    );
  }
  @Post(':organizationId/team/:memberId/remove') remove(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.remove(
      businessUser(req),
      parse(z.uuid(), id),
      parse(z.uuid(), memberId),
      false,
    );
  }
  @Post(':organizationId/invitations/:invitationId/revoke') revoke(
    @Req() req: AuthRequest,
    @Param('organizationId') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.service.remove(
      businessUser(req),
      parse(z.uuid(), id),
      parse(z.uuid(), invitationId),
      true,
    );
  }
}
