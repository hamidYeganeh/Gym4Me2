import { validateEnvironment } from './environment';

const DATABASE_URL = 'postgresql://test:example@localhost:55433/gym4me_test';

describe('API environment', () => {
  it('requires an explicit PostgreSQL connection without leaking input', () => {
    expect(() => validateEnvironment({})).toThrow('DATABASE_URL');
    for (const invalid of [
      'https://user:secret@example.com/db',
      'malformed-connection-with-secret',
    ]) {
      expect(() => validateEnvironment({ DATABASE_URL: invalid })).toThrow(
        'Invalid API configuration: DATABASE_URL',
      );
    }
  });

  it('rejects invalid pool sizes', () => {
    for (const invalid of [0, -1, 'abc', 101]) {
      expect(() =>
        validateEnvironment({ DATABASE_URL, DB_POOL_MAX: invalid }),
      ).toThrow('DB_POOL_MAX');
    }
  });

  it('disables documentation in production unless explicitly enabled', () => {
    expect(
      validateEnvironment({
        DATABASE_URL,
        NODE_ENV: 'production',
        AUTH_SECRET: 'a'.repeat(64),
      }).API_DOCS_ENABLED,
    ).toBe(false);
    expect(
      validateEnvironment({
        DATABASE_URL,
        NODE_ENV: 'production',
        AUTH_SECRET: 'a'.repeat(64),
        API_DOCS_ENABLED: 'true',
      }).API_DOCS_ENABLED,
    ).toBe(true);
    expect(
      validateEnvironment({ DATABASE_URL, API_DOCS_ENABLED: 'false' })
        .API_DOCS_ENABLED,
    ).toBe(false);
  });

  it('requires a strong explicit authentication secret in production', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL, NODE_ENV: 'production' }),
    ).toThrow('AUTH_SECRET');
    expect(() =>
      validateEnvironment({ DATABASE_URL, AUTH_SECRET: 'short' }),
    ).toThrow('AUTH_SECRET');
    expect(validateEnvironment({ DATABASE_URL }).KAVENEGAR_OTP_TEMPLATE).toBe(
      'g4m-otp',
    );
  });

  it('normalizes web and Capacitor origins and rejects wildcards', () => {
    const env = validateEnvironment({
      DATABASE_URL,
      CORS_ORIGINS: ' https://example.com , capacitor://localhost ',
    });
    expect(env.CORS_ORIGINS).toEqual([
      'https://example.com',
      'capacitor://localhost',
    ]);
    expect(() =>
      validateEnvironment({ DATABASE_URL, CORS_ORIGINS: '*' }),
    ).toThrow('CORS_ORIGINS');
  });
});
