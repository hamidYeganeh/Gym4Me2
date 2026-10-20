import { userInfo } from 'node:os';
import { checkedChangeReason } from '../src/platform/audit/change-reason';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { phoneSchema } from '../src/modules/auth/auth.contracts';
config({ path: resolve(__dirname, '../.env'), quiet: true });
async function main() {
  const phone = phoneSchema.parse(process.argv[2]);
  const reason = checkedChangeReason(process.argv[3]);
  const operator = userInfo().username;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<{ id: string }>(
        "SELECT id FROM users WHERE phone = $1 AND phone_verified_at IS NOT NULL AND status = 'active' FOR UPDATE",
        [phone],
      );
      if (!rows[0]) throw new Error('No verified account');
      const result = await client.query(
        'INSERT INTO platform_admins(user_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING user_id',
        [rows[0].id],
      );
      if (result.rowCount)
        await client.query(
          'INSERT INTO audit_events(action, target_id, details) VALUES ($1, $2, $3::jsonb)',
          [
            'admin.granted-by-operator',
            rows[0].id,
            JSON.stringify({
              source: 'operator-cli',
              actorKind: 'operator',
              operator,
              scope: 'platform',
              resultingRole: 'admin',
              reason,
            }),
          ],
        );
      await client.query('COMMIT');
      console.log('Admin access granted to the verified account.');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error(
    'Admin grant failed. Supply a valid verified-account phone and a 3–500-character reason; check database configuration.',
  );
  process.exitCode = 1;
});
