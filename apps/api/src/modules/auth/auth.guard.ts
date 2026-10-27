import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { Environment } from '../../config/environment';
import {
  clientSchema,
  parse,
  type Client,
  type SessionTransport,
} from './auth.contracts';
import { AuthService, type Principal } from './auth.service';
export type AuthRequest = Request & { principal: Principal };
export const cookieName = (client: Client) => `gym4me_${client}`;
export function sessionTransport(request: Request): SessionTransport {
  const value = request.header('x-gym-platform');
  if (value && !['web', 'native'].includes(value))
    throw new ForbiddenException('Backend.requestOriginIsNotAllowed');
  return value === 'native' ? 'native' : 'web';
}

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
    const native = sessionTransport(request) === 'native';
    // Opt-in access to the shared demo through each local web app's API proxy.
    const localPorts = { application: 7081, business: 7083, admin: 7082 };
    const localWeb =
      this.config.get('DEMO_MODE', { infer: true }) &&
      this.config.get('DEMO_LOCAL_WEB_ENABLED', { infer: true }) &&
      origin === `http://localhost:${localPorts[client]}`;
    // The public website may read/update only the current account's discovery location.
    const websiteLocation =
      client === 'application' &&
      /\/profile\/account\/location\/?$/.test(request.path) &&
      ['GET', 'PATCH'].includes(request.method) &&
      origin === this.config.get('AUTH_WEBSITE_ORIGIN', { infer: true });
    if (
      native
        ? client !== 'application' ||
          !['capacitor://localhost', 'https://localhost'].includes(origin ?? '')
        : origin !== origins[client] && !websiteLocation && !localWeb
    )
      throw new ForbiddenException('Backend.requestOriginIsNotAllowed');
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
    const transport = sessionTransport(request);
    request.principal = await this.auth.authenticate(
      transport === 'native'
        ? request
            .header('authorization')
            ?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
        : cookie?.slice(cookieName(client).length + 1),
      client,
      transport,
    );
    if (
      request.principal.user.deletionPending &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !/\/profile\/account\/privacy\/(preferences|deletion(?:\/cancel)?)\/?$/.test(
        request.path,
      ) &&
      !/\/auth\/sessions\//.test(request.path)
    )
      throw new ConflictException('Backend.accountDeletionPending');
    return true;
  }
}
