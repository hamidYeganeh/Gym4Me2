import { z } from 'zod';

const databaseUrl = z
  .string()
  .url()
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const protocol = new URL(value).protocol;
    return protocol === 'postgres:' || protocol === 'postgresql:';
  }, 'Must use the postgres or postgresql protocol');

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(7088),
  DATABASE_URL: databaseUrl,
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  CORS_ORIGINS: z
    .string()
    .default(
      'http://localhost:7081,http://localhost:7082,http://localhost:7083,capacitor://localhost,https://localhost',
    )
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
  API_DOCS_ENABLED: z.enum(['true', 'false']).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  KAVENEGAR_API_KEY: z.preprocess(
    (value) =>
      value === 'KAVEHNEGARD_API' || value === '' ? undefined : value,
    z
      .string()
      .regex(/^[a-zA-Z0-9]+$/)
      .optional(),
  ),
  KAVENEGAR_ANDROID_APP_HASH: z
    .string()
    .regex(/^[A-Za-z0-9+/]{11}$/)
    .optional(),
  KAVENEGAR_OTP_TEMPLATE: z
    .string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .default('gym4meotp'),
  AUTH_APPLICATION_ORIGIN: z.url().default('http://localhost:7081'),
  AUTH_BUSINESS_ORIGIN: z.url().default('http://localhost:7083'),
  AUTH_ADMIN_ORIGIN: z.url().default('http://localhost:7082'),
  PUBLIC_API_ORIGIN: z.url().default('http://localhost:7088'),
  PRIVACY_POLICY_VERSION: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{1,80}$/)
    .default('local-pilot-v1'),
  ACCOUNT_MINIMUM_AGE: z.coerce.number().int().min(18).max(99).default(18),
  ACCOUNT_DELETION_GRACE_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7),
  OTP_RETENTION_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  SESSION_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  INVITATION_RETENTION_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(30).max(3650).default(365),
  RETENTION_INTERVAL_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60),
  RETENTION_ENABLED: z.enum(['true', 'false']).optional(),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  MEDIA_ORPHAN_GRACE_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/)
    .default('gym4me'),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(8).optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export function validateEnvironment(input: Record<string, unknown>) {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    // Report field names, never connection strings, passwords or raw input.
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path[0])),
    ];
    throw new Error(`Invalid API configuration: ${fields.join(', ')}`);
  }
  if (result.data.NODE_ENV === 'production' && !result.data.AUTH_SECRET) {
    throw new Error('Invalid API configuration: AUTH_SECRET');
  }
  if (result.data.DEMO_MODE && result.data.KAVENEGAR_API_KEY)
    throw new Error('Demo configuration must not include live SMS credentials');

  return {
    ...result.data,
    RETENTION_ENABLED:
      result.data.RETENTION_ENABLED === undefined
        ? result.data.NODE_ENV !== 'test'
        : result.data.RETENTION_ENABLED === 'true',
    API_DOCS_ENABLED:
      result.data.API_DOCS_ENABLED === undefined
        ? result.data.NODE_ENV !== 'production'
        : result.data.API_DOCS_ENABLED === 'true',
  };
}

export type Environment = ReturnType<typeof validateEnvironment>;
