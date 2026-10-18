import assert from 'node:assert/strict';
import { Pool } from 'pg';
async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (
    url.hostname !== '127.0.0.1' ||
    url.port !== '55434' ||
    url.pathname !== '/gym4me_stage' ||
    url.username !== 'gym4me_runtime'
  )
    throw new Error('Requires isolated local staging runtime.');
  const pool = new Pool({ connectionString: url.toString() });
  try {
    const { rows } = await pool.query<{
      rolsuper: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
    }>(
      'select rolsuper, rolcreatedb, rolcreaterole from pg_roles where rolname = current_user',
    );
    assert.deepEqual(rows[0], {
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
    });
    await pool.query('select id from users limit 0');
    await pool.query(
      'select revision,updated_at,answered_at,cancelled_at from sport_invitations limit 0',
    );
    const tables = await pool.query<{ name: string; allowed: boolean }>(
      `SELECT c.relname AS name,
        has_table_privilege(current_user,c.oid,'SELECT') AND
        has_table_privilege(current_user,c.oid,'INSERT') AND
        has_table_privilege(current_user,c.oid,'UPDATE') AND
        has_table_privilege(current_user,c.oid,'DELETE') AS allowed
       FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`,
    );
    for (const name of [
      'users',
      'sport_orders',
      'sport_documents',
      'sport_messages',
      'sport_service_images',
      'sport_resource_blocks',
    ])
      assert.ok(
        tables.rows.some((table) => table.name === name),
        `Missing ${name}`,
      );
    assert.ok(
      tables.rows.every((table) => table.allowed),
      'Runtime DML grants are incomplete.',
    );
    await assert.rejects(
      pool.query('create table runtime_must_not_create(id integer)'),
      { code: '42501' },
    );
    await assert.rejects(pool.query('create schema runtime_must_not_create'), {
      code: '42501',
    });
    await assert.rejects(
      pool.query('select * from drizzle.__drizzle_migrations'),
      { code: '42501' },
    );
    const client = await pool.connect();
    try {
      await client.query('begin');
      const inserted = await client.query<{ id: string }>(
        "insert into users(phone) values ('~stage-role-check') returning id",
      );
      await client.query('update users set display_name = $1 where id = $2', [
        'role check',
        inserted.rows[0].id,
      ]);
      await client.query('delete from users where id = $1', [
        inserted.rows[0].id,
      ]);
      await client.query('rollback');
    } finally {
      client.release();
    }
    console.log(
      `Staging runtime: DML grants verified on ${tables.rows.length} public tables; DDL, migration history and elevated roles denied.`,
    );
  } finally {
    await pool.end();
  }
}
void main().catch(() => {
  console.error('Staging role verification failed.');
  process.exitCode = 1;
});
