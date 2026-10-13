import { ConsentGuard } from '../profile/consent.guard';
import {
  Body,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, JsonBody, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { AdminService } from './admin.service';
import {
  adminListFilters,
  auditFilters,
  organizationFilters,
} from './admin.contracts';
const pageSchema = z.coerce.number().int().min(1).max(100000).default(1);
const reasonSchema = z.string().trim().min(5).max(500);
@DomainController('admin', 'overview')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminOverviewController {
  constructor(private readonly service: AdminService) {}
  @Get() get(@Req() req: AuthRequest) {
    return this.service.overview(req.principal);
  }
}
@DomainController('admin', 'users')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminUsersController {
  constructor(private readonly service: AdminService) {}
  @Get() list(
    @Req() req: AuthRequest,
    @Query('page') page: unknown,
    @Query('search') search: unknown,
    @Query('status') status: unknown,
  ) {
    const filters = parse(adminListFilters, { search, status });
    return this.service.listUsers(
      req.principal,
      parse(pageSchema, page),
      filters.search,
      filters.status,
    );
  }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.userDetail(req.principal, parse(z.uuid(), id));
  }
  @Patch(':id/status')
  @JsonBody({
    status: { type: 'string', enum: ['active', 'suspended'] },
    reason: { type: 'string' },
  })
  status(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const data = parse(
      z
        .object({
          status: z.enum(['active', 'suspended']),
          reason: reasonSchema,
        })
        .strict(),
      body,
    );
    return this.service.setUserStatus(
      req.principal,
      parse(z.uuid(), id),
      data.status,
      data.reason,
    );
  }
}
@DomainController('admin', 'organizations')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminOrganizationsController {
  constructor(private readonly service: AdminService) {}
  @Get() list(
    @Req() req: AuthRequest,
    @Query('page') page: unknown,
    @Query('status') status: unknown,
    @Query('search') search: unknown,
    @Query('publicationStatus') publicationStatus: unknown,
  ) {
    return this.service.listOrganizations(
      req.principal,
      parse(pageSchema, page),
      parse(
        z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
        status,
      ),
      parse(organizationFilters, { search, publicationStatus }),
    );
  }
  @Get(':id') detail(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.organizationDetail(req.principal, parse(z.uuid(), id));
  }
  @Post(':id/review')
  @JsonBody({
    status: { type: 'string', enum: ['approved', 'rejected', 'suspended'] },
    reason: { type: 'string' },
  })
  review(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const data = parse(
      z
        .object({
          status: z.enum(['approved', 'rejected', 'suspended']),
          reason: reasonSchema,
        })
        .strict(),
      body,
    );
    return this.service.review(
      req.principal,
      parse(z.uuid(), id),
      data.status,
      data.reason,
    );
  }
}
@DomainController('admin', 'audit')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminAuditController {
  constructor(private readonly service: AdminService) {}
  @Get() list(
    @Req() req: AuthRequest,
    @Query('page') page: unknown,
    @Query() query: Record<string, unknown>,
  ) {
    return this.service.audit(
      req.principal,
      parse(pageSchema, page),
      parse(auditFilters, query),
    );
  }
}
