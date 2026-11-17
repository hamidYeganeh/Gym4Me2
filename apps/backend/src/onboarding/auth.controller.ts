import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseFilters,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthRateLimitFilter } from './auth-rate-limit';
import { Auth, phoneOf, scopeOf, type Scope } from './auth';

export function tokenOf(request: Request, scope: Scope) {
  const bearer = request.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
  return (
    bearer ??
    request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`gym4me_${scope}=`))
      ?.split('=')[1]
  );
}

@UseFilters(AuthRateLimitFilter)
@Controller('api/v1/:scope/auth')
export class AuthController {
  constructor(private readonly auth: Auth) {}

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      path: '/',
    };
  }

  private async session(
    id: string,
    scope: Scope,
    response: Response,
    passwordHash?: string,
  ) {
    const status =
      scope === 'applicant' ? undefined : await this.auth.accountStatus(id);
    const token = await this.auth.sign(id, scope, passwordHash);
    if (scope === 'applicant') return { token };
    response.cookie('gym4me_' + scope, token, {
      ...this.cookieOptions(),
      maxAge: 3600000,
    });
    return status;
  }

  @Header('Cache-Control', 'no-store')
  @Post('otp')
  @HttpCode(200)
  async otp(
    @Param('scope') value: string,
    @Body('phone') input: unknown,
    @Req() request: Request,
  ) {
    const scope = scopeOf(value);
    const phone = phoneOf(input);
    await this.auth.limit('ip:otp:' + request.ip, 50);
    if (scope !== 'applicant') await this.auth.account(phone, scope);
    await this.auth.send(phone, scope);
    return { sent: true };
  }

  @Header('Cache-Control', 'no-store')
  @Post('otp/confirm')
  @HttpCode(200)
  async confirm(
    @Param('scope') value: string,
    @Body('phone') input: unknown,
    @Body('code') code: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const scope = scopeOf(value);
    const phone = phoneOf(input);
    await this.auth.limit('ip:confirm:' + request.ip, 100);
    await this.auth.confirm(phone, scope, code);
    return this.session(await this.auth.account(phone, scope), scope, response);
  }

  @Header('Cache-Control', 'no-store')
  @Post('login')
  @HttpCode(200)
  async login(
    @Param('scope') value: string,
    @Body('phone') input: unknown,
    @Body('password') password: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const scope = scopeOf(value);
    await this.auth.limit('ip:login:' + request.ip, 100);
    const account = await this.auth.login(phoneOf(input), scope, password);
    return this.session(account.id, scope, response, account.passwordHash);
  }

  @Header('Cache-Control', 'no-store')
  @Post('password/reset/request')
  @HttpCode(200)
  async requestReset(
    @Param('scope') value: string,
    @Body('phone') input: unknown,
    @Req() request: Request,
  ) {
    const scope = scopeOf(value);
    const phone = phoneOf(input);
    await this.auth.limit('ip:otp:' + request.ip, 50);
    await this.auth.requestReset(phone, scope);
    return { sent: true };
  }

  @Header('Cache-Control', 'no-store')
  @Post('password/reset/confirm')
  @HttpCode(200)
  async reset(
    @Param('scope') value: string,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    await this.auth.limit('ip:confirm:' + request.ip, 100);
    await this.auth.reset(
      phoneOf(body?.phone),
      scopeOf(value),
      body?.code,
      body?.password,
    );
    return { updated: true };
  }

  @Header('Cache-Control', 'no-store')
  @Post('account/complete')
  @HttpCode(200)
  async complete(
    @Param('scope') value: string,
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    const scope = scopeOf(value);
    if (scope === 'applicant')
      throw new BadRequestException('Use your panel to complete your account.');
    const id = await this.auth.verify(tokenOf(request, scope), scope);
    await this.auth.limit('complete:' + id, 12);
    await this.auth.complete(id, body);
    return { accountComplete: true };
  }

  @Header('Cache-Control', 'no-store')
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Param('scope') value: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const scope = scopeOf(value);
    await this.auth.logout(tokenOf(request, scope), scope);
    if (scope !== 'applicant')
      response.clearCookie('gym4me_' + scope, this.cookieOptions());
  }

  @Header('Cache-Control', 'no-store')
  @Get('session')
  async current(@Param('scope') value: string, @Req() request: Request) {
    const scope = scopeOf(value);
    const id = await this.auth.verify(tokenOf(request, scope), scope);
    return scope === 'applicant'
      ? { id }
      : { id, ...(await this.auth.accountStatus(id)) };
  }
}
