import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { validateEnvironment } from '../src/config/environment';

config({ path: resolve(__dirname, '../.env'), quiet: true });

async function main() {
  const env = validateEnvironment(process.env);
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  });
  try {
    const client = await pool.connect();
    try {
      // Serialize migration runners without holding a pool connection elsewhere.
      await client.query('SELECT pg_advisory_lock(7088, 1)');
      await migrate(drizzle(client), {
        migrationsFolder: resolve(__dirname, '../database/migrations'),
      });
      console.log('PostgreSQL migrations applied successfully.');
    } finally {
      // Closing the connection also releases the session advisory lock.
      client.release(true);
    }
  } finally {
    await pool.end();
  }
}

void main().catch(() => {
  console.error(
    'Migration failed. Check database connectivity and migration SQL.',
  );
  process.exitCode = 1;
});
