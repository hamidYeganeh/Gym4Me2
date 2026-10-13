import { ConsentGuard } from './consent.guard';
import { Body, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { AdminService } from '../admin/admin.service';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { SchemaBody } from '../clubs/club.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { BusinessService } from '../business/business.service';
import { lockWritableAccount } from '../auth/account-lock';
const accountPatchSchema = z
  .object({
    displayName: z.string().trim().min(2).max(100).nullable().optional(),
    profilePublic: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);
@DomainController('profile', 'account')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class ProfileController {
  constructor(private readonly database: DatabaseService) {}
  @Get() get(@Req() req: AuthRequest) {
    return req.principal.user;
  }
  @Patch()
  @SchemaBody(accountPatchSchema)
  async update(@Req() req: AuthRequest, @Body() body: unknown) {
    const data = parse(accountPatchSchema, body);
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, req.principal.user.id, 'update');
      const [user] = await tx
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, req.principal.user.id))
        .returning();
      return user;
    });
  }
}
@DomainController('profile', 'access')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
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
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class InvitationsController {
  constructor(private readonly business: BusinessService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.business.invitations(req.principal.user.phone);
  }
  @Post(':id/accept') accept(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.business.accept(req.principal, parse(z.uuid(), id));
  }
}
