import { Body, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { AdminService } from '../admin/admin.service';
import { ClientHeader, JsonBody, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { BusinessService } from '../business/business.service';
@DomainController('profile', 'account')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
export class ProfileController {
  constructor(private readonly database: DatabaseService) {}
  @Get() get(@Req() req: AuthRequest) {
    return req.principal.user;
  }
  @Patch()
  @JsonBody({ displayName: { type: 'string' } })
  async update(@Req() req: AuthRequest, @Body() body: unknown) {
    const data = parse(
      z.object({ displayName: z.string().trim().min(2).max(100) }).strict(),
      body,
    );
    const [user] = await this.database.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, req.principal.user.id))
      .returning();
    return user;
  }
}
@DomainController('profile', 'access')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
export class AccessController {
  constructor(
    private readonly business: BusinessService,
    private readonly admin: AdminService,
  ) {}
  @Get() async get(@Req() req: AuthRequest) {
    return {
      organizations: await this.business.list(req.principal.user.id),
      isAdmin: await this.admin.isAdmin(req.principal.user.id),
    };
  }
}
@DomainController('profile', 'invitations')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
export class InvitationsController {
  constructor(private readonly business: BusinessService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.business.invitations(req.principal.user.phone);
  }
  @Post(':id/accept') accept(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.business.accept(req.principal, parse(z.uuid(), id));
  }
}
