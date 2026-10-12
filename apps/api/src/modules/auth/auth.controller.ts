import { Body, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Environment } from '../../config/environment';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import {
  ClientHeader,
  JsonBody,
  clientSchema,
  parse,
  requestOtpSchema,
  verifyOtpSchema,
} from './auth.contracts';
import {
  AuthGuard,
  ClientGuard,
  cookieName,
  type AuthRequest,
} from './auth.guard';
import { AuthService } from './auth.service';

@DomainController('auth', 'otp')
@ClientHeader()
@UseGuards(ClientGuard)
export class OtpController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  @Post('request')
  @JsonBody({ phone: { type: 'string', example: '09123456789' } })
  request(@Body() body: unknown, @Req() req: Request) {
    const { phone } = parse(requestOtpSchema, body);
    return this.auth.requestOtp(
      phone,
      parse(clientSchema, req.header('x-gym-client')),
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
    );
  }
  @Post('verify')
  @JsonBody({
    challengeId: { type: 'string' },
    code: { type: 'string', example: '12345' },
  })
  async verify(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { challengeId, code } = parse(verifyOtpSchema, body);
    const client = parse(clientSchema, req.header('x-gym-client'));
    const result = await this.auth.verifyOtp(
      challengeId,
      code,
      client,
      req.header('user-agent') ?? 'Unknown device',
    );
    res.cookie(cookieName(client), result.token, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/api/v1',
      expires: result.expiresAt,
    });
    res.setHeader('Cache-Control', 'no-store');
    return { user: result.user, expiresAt: result.expiresAt };
  }
}
@DomainController('auth', 'sessions')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
export class SessionsController {
  constructor(private readonly auth: AuthService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.auth.sessions(req.principal);
  }
  @Post(':id/revoke') revoke(@Param('id') id: string, @Req() req: AuthRequest) {
    return this.auth.revoke(req.principal, parse(z.uuid(), id));
  }
  @Post('logout') async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.revoke(req.principal, req.principal.session.id);
    res.clearCookie(
      cookieName(parse(clientSchema, req.header('x-gym-client'))),
      { path: '/api/v1', httpOnly: true, sameSite: 'strict' },
    );
    return { success: true };
  }
}
