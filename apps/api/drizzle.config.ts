import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '.env'), quiet: true });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './database/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  strict: true,
});
