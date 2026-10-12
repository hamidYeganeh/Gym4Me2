import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Environment } from '../../config/environment';
import { clientSchema, parse, type Client } from './auth.contracts';
import { AuthService, type Principal } from './auth.service';
export type AuthRequest = Request & { principal: Principal };
export const cookieName = (client: Client) => `gym4me_${client}`;

@Injectable()
export class ClientGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const client = parse(clientSchema, request.header('x-gym-client'));
    const origins = {
      application: this.config.get('AUTH_APPLICATION_ORIGIN', { infer: true }),
      business: this.config.get('AUTH_BUSINESS_ORIGIN', { infer: true }),
      admin: this.config.get('AUTH_ADMIN_ORIGIN', { infer: true }),
    };
    const referer = request.header('referer');
    const origin =
      request.header('origin') ??
      (referer && URL.canParse(referer) ? new URL(referer).origin : undefined);
    // Bind cookies to a surface even when apps share a hostname on different ports.
    // Browsers may omit Origin for GET; a same-surface Referer is required then.
    if (origin !== origins[client])
      throw new ForbiddenException('مبدأ درخواست مجاز نیست.');
    return true;
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const client = parse(clientSchema, request.header('x-gym-client'));
    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName(client)}=`));
    request.principal = await this.auth.authenticate(
      cookie?.slice(cookieName(client).length + 1),
      client,
    );
    return true;
  }
}
