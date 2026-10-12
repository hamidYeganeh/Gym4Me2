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
  PORT: z.coerce.number().int().min(1).max(65535).default(7088),
  DATABASE_URL: databaseUrl,
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
  KAVENEGAR_API_KEY: z
    .string()
    .regex(/^[a-zA-Z0-9]+$/)
    .optional(),
  KAVENEGAR_OTP_TEMPLATE: z
    .string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .default('g4m-otp'),
  AUTH_APPLICATION_ORIGIN: z.url().default('http://localhost:7081'),
  AUTH_BUSINESS_ORIGIN: z.url().default('http://localhost:7083'),
  AUTH_ADMIN_ORIGIN: z.url().default('http://localhost:7082'),
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

  return {
    ...result.data,
    API_DOCS_ENABLED:
      result.data.API_DOCS_ENABLED === undefined
        ? result.data.NODE_ENV !== 'production'
        : result.data.API_DOCS_ENABLED === 'true',
  };
}

export type Environment = ReturnType<typeof validateEnvironment>;
