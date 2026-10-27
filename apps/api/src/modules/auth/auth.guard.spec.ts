import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  validateEnvironment,
  type Environment,
} from '../../config/environment';
import { ClientGuard } from './auth.guard';

const config = (enabled: boolean) =>
  new ConfigService<Environment, true>(
    validateEnvironment({
      DATABASE_URL: 'postgresql://test:example@localhost:55433/gym4me_test',
      DEMO_MODE: 'true',
      DEMO_LOCAL_WEB_ENABLED: String(enabled),
      AUTH_APPLICATION_ORIGIN: 'https://gym4me-demo-application.vercel.app',
      AUTH_BUSINESS_ORIGIN: 'https://gym4me-demo-business.vercel.app',
      AUTH_ADMIN_ORIGIN: 'https://gym4me-demo-admin.vercel.app',
    }),
  );

function context(
  client: string,
  origin?: string,
  platform = 'web',
  referer?: string,
) {
  const headers: Record<string, string | undefined> = {
    'x-gym-client': client,
    origin,
    'x-gym-platform': platform,
    referer,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name],
        method: 'GET',
        path: '/api/v1/profile/account',
      }),
    }),
  } as ExecutionContext;
}

describe('demo local web origins', () => {
  it.each([
    ['application', 7081],
    ['business', 7083],
    ['admin', 7082],
  ])('allows only the matching %s port when enabled', (client, port) => {
    const guard = new ClientGuard(config(true));
    expect(
      guard.canActivate(context(String(client), `http://localhost:${port}`)),
    ).toBe(true);
    expect(() =>
      new ClientGuard(config(false)).canActivate(
        context(String(client), `http://localhost:${port}`),
      ),
    ).toThrow('Backend.requestOriginIsNotAllowed');
  });
  it.each([
    ['admin', 'http://localhost:7081', 'web'],
    ['admin', 'http://localhost:7082.evil.example', 'web'],
    ['admin', 'https://evil.example', 'web'],
    ['admin', undefined, 'web'],
    ['admin', 'http://localhost:7082', 'native'],
  ])(
    'rejects a mismatched or untrusted origin for %s',
    (client, origin, platform) => {
      expect(() =>
        new ClientGuard(config(true)).canActivate(
          context(client, origin, platform),
        ),
      ).toThrow('Backend.requestOriginIsNotAllowed');
    },
  );
  it('accepts same-surface Referer for browser GETs and retains deployed access', () => {
    expect(
      new ClientGuard(config(true)).canActivate(
        context('admin', undefined, 'web', 'http://localhost:7082/'),
      ),
    ).toBe(true);
    expect(
      new ClientGuard(config(false)).canActivate(
        context('admin', 'https://gym4me-demo-admin.vercel.app'),
      ),
    ).toBe(true);
  });
});
