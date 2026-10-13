import { validateEnvironment } from './environment';

const DATABASE_URL = 'postgresql://test:example@localhost:55433/gym4me_test';

describe('API environment', () => {
  it('keeps the local pilot data policy bounded and never starts retention implicitly in tests', () => {
    const env = validateEnvironment({ DATABASE_URL, NODE_ENV: 'test' });
    expect(env.RETENTION_ENABLED).toBe(false);
    expect(env.ACCOUNT_MINIMUM_AGE).toBe(18);
    expect(env.ACCOUNT_DELETION_GRACE_DAYS).toBe(7);
    expect(env.BACKUP_RETENTION_DAYS).toBe(30);
    expect(
      validateEnvironment({
        DATABASE_URL,
        NODE_ENV: 'test',
        RETENTION_ENABLED: 'true',
      }).RETENTION_ENABLED,
    ).toBe(true);
    for (const invalid of [
      { ACCOUNT_MINIMUM_AGE: 17 },
      { ACCOUNT_DELETION_GRACE_DAYS: 0 },
      { OTP_RETENTION_DAYS: 0 },
      { BACKUP_RETENTION_DAYS: 0 },
      { RETENTION_INTERVAL_MINUTES: 0 },
      { PRIVACY_POLICY_VERSION: 'invalid version' },
    ])
      expect(() => validateEnvironment({ DATABASE_URL, ...invalid })).toThrow(
        'Invalid API configuration',
      );
  });
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
      'gym4meotp',
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
