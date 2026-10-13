import { Body, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { SchemaBody } from '../clubs/club.contracts';
import { PrivacyService, preferencesSchema } from './privacy.service';
const deletionSchema = z.object({ confirm: z.literal(true) }).strict();
@DomainController('system', 'policy')
export class PrivacyPolicyController {
  constructor(private readonly privacy: PrivacyService) {}
  @Get() get() {
    return this.privacy.policy();
  }
}
@DomainController('profile', 'account')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
export class AccountPrivacyController {
  constructor(private readonly privacy: PrivacyService) {}
  @Get('privacy') get(@Req() req: AuthRequest) {
    return this.privacy.get(req.principal.user.id);
  }
  @Post('privacy/preferences') @SchemaBody(preferencesSchema) preferences(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.privacy.update(
      req.principal.user.id,
      parse(preferencesSchema, body),
    );
  }
  @Get('privacy/export') async export(
    @Req() req: AuthRequest,
    @Query() query: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    parse(z.object({}).strict(), query);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="gym4me-account.json"',
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return this.privacy.export(req.principal.user.id);
  }
  @Post('privacy/deletion') @SchemaBody(deletionSchema) deletion(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    parse(deletionSchema, body);
    return this.privacy.requestDeletion(req.principal);
  }
  @Post('privacy/deletion/cancel') cancel(@Req() req: AuthRequest) {
    return this.privacy.cancelDeletion(req.principal.user.id);
  }
}
