import { Body, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Environment } from '../../config/environment';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import {
  ClientHeader,
  JsonBody,
  clientSchema,
  phoneSchema,
  parse,
} from './auth.contracts';
import {
  AuthGuard,
  ClientGuard,
  cookieName,
  sessionTransport,
  type AuthRequest,
} from './auth.guard';
import { PasswordService } from './password.service';
const password = z.string().min(6).max(15);
const login = z
  .object({ phone: phoneSchema, password: z.string().min(1).max(128) })
  .strict();
@DomainController('auth', 'password')
@ClientHeader()
@UseGuards(ClientGuard)
export class PasswordController {
  constructor(
    private readonly passwords: PasswordService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  @Post('login')
  @JsonBody({ phone: { type: 'string' }, password: { type: 'string' } })
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = parse(login, body);
    const client = parse(clientSchema, req.header('x-gym-client'));
    const transport = sessionTransport(req);
    const result = await this.passwords.login(
      input.phone,
      input.password,
      client,
      transport,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      req.header('user-agent') ?? 'Unknown device',
    );
    if (transport === 'web')
      res.cookie(cookieName(client), result.token, {
        httpOnly: true,
        secure: this.config.get('NODE_ENV') === 'production',
        sameSite: 'strict',
        path: '/api/v1',
        expires: result.expiresAt,
      });
    res.setHeader('Cache-Control', 'no-store');
    return {
      user: result.user,
      expiresAt: result.expiresAt,
      ...(transport === 'native'
        ? { token: result.token, sessionId: result.sessionId }
        : {}),
    };
  }
  @Get()
  @UseGuards(AuthGuard)
  status(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store');
    return this.passwords.status(req.principal);
  }
  @Post()
  @UseGuards(AuthGuard)
  @JsonBody({ password: { type: 'string' } })
  async set(
    @Body() body: unknown,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const input = parse(z.object({ password }).strict(), body);
    const result = await this.passwords.set(req.principal, input.password);
    res.clearCookie(
      cookieName(parse(clientSchema, req.header('x-gym-client'))),
      { path: '/api/v1', httpOnly: true, sameSite: 'strict' },
    );
    res.setHeader('Cache-Control', 'no-store');
    return result;
  }
}
