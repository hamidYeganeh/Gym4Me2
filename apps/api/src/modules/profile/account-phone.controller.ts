import { ConsentGuard } from './consent.guard';
import { Body, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import {
  AuthGuard,
  ClientGuard,
  cookieName,
  type AuthRequest,
} from '../auth/auth.guard';
import {
  ClientHeader,
  parse,
  requestOtpSchema,
  verifyOtpSchema,
  type Client,
} from '../auth/auth.contracts';
import { AuthService } from '../auth/auth.service';
import { SchemaBody } from '../clubs/club.contracts';
@DomainController('profile', 'account')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AccountPhoneController {
  constructor(private readonly auth: AuthService) {}
  @Post('phone/request') @SchemaBody(requestOtpSchema) request(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.auth.requestPhoneChange(
      req.principal,
      parse(requestOtpSchema, body).phone,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
    );
  }
  @Post('phone/verify') @SchemaBody(verifyOtpSchema) async verify(
    @Req() req: AuthRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = parse(verifyOtpSchema, body);
    const result = await this.auth.verifyPhoneChange(
      req.principal,
      input.challengeId,
      input.code,
    );
    if (req.principal.session.transport === 'web')
      res.clearCookie(cookieName(req.principal.session.client as Client), {
        path: '/api/v1',
        httpOnly: true,
        sameSite: 'strict',
      });
    return result;
  }
}
