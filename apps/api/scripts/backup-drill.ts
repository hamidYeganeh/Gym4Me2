// A repeatable restore drill against disposable local test services only.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Pool, type QueryResult } from 'pg';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const root = resolve(__dirname, '../../..');
const hash = (bytes: Buffer) =>
  createHash('sha256').update(bytes).digest('hex');
const id = randomUUID().replaceAll('-', '').slice(0, 16);
const sourceBucket = 'gym4me-test';
const targetBucket = `gym4me-restore-${id}`;
const targetDatabase = `gym4me_restore_${id}_test`;
const directory = resolve(root, '.artifacts/backup-drill', id);
function postgres(command: string, args: string[], input?: Buffer) {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--profile',
      'test',
      'exec',
      '-T',
      'postgres-test',
      command,
      '-U',
      'gym4me',
      ...args,
    ],
    { cwd: root, input, maxBuffer: 128 * 1024 * 1024 },
  );
  if (result.status !== 0) throw new Error('Isolated database command failed.');
  return result.stdout;
}
async function main() {
  const source = new URL(
    process.env.TEST_DATABASE_URL ??
      'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test',
  );
  assert.equal(source.hostname, '127.0.0.1');
  assert.equal(source.port, '55433');
  assert.equal(source.pathname, '/gym4me_test');
  const endpoint = process.env.TEST_S3_ENDPOINT ?? 'http://127.0.0.1:8333';
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(endpoint).hostname));
  const db = new Pool({ connectionString: source.toString() });
  const s3 = new S3Client({
    endpoint,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID ?? 'gym4me_local',
      secretAccessKey:
        process.env.TEST_S3_SECRET_ACCESS_KEY ?? 'gym4me_local_storage',
    },
  });
  const newerFixtureId = randomUUID();
  const snapshotAt = new Date().toISOString();
  const ledgerFile = resolve(directory, 'newer-deletion-ledger.json');
  const ledgerCommand = (databaseUrl: string, args: string[]) => {
    const result = spawnSync(
      process.execPath,
      ['-r', 'ts-node/register', 'scripts/deletion-ledger.ts', ...args],
      {
        cwd: resolve(root, 'apps/api'),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          RETENTION_ENABLED: 'false',
        },
        encoding: 'utf8',
      },
    );
    if (result.status !== 0) throw new Error('Deletion ledger drill failed.');
  };
  const fixtureId = randomUUID();
  const fixtureKey = `backup-drill/${fixtureId}.json`;
  const copied: string[] = [];
  let targetCreated = false;
  let bucketCreated = false;
  let restored: Pool | undefined;
  const started = Date.now();
  try {
    // A deleted test identity must remain unavailable after restoring the snapshot.
    await db.query(
      "insert into users(id,phone,status,deleted_at) values ($1,$2,'suspended',now())",
      [fixtureId, `~${id}`],
    );
    await db.query(
      "insert into users(id,phone,status,display_name) values ($1,$2,'active','private restore fixture')",
      [newerFixtureId, `~n${id}`],
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: sourceBucket,
        Key: fixtureKey,
        Body: Buffer.from(
          JSON.stringify({ fixtureId, purpose: 'restore verification' }),
        ),
        ContentType: 'application/json',
      }),
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const snapshot = await db.connect();
    let dump: Buffer;
    let counts: { table: string; count: number }[];
    try {
      await snapshot.query('begin isolation level repeatable read read only');
      const exported = await snapshot.query<{ snapshot: string }>(
        'select pg_export_snapshot() as snapshot',
      );
      const tables = await snapshot.query<{ tablename: string }>(
        "select tablename from pg_tables where schemaname = 'public' order by tablename",
      );
      counts = [];
      for (const { tablename } of tables.rows) {
        const count = await snapshot.query<{ count: string }>(
          `select count(*) from "${tablename.replaceAll('"', '""')}"`,
        );
        counts.push({ table: tablename, count: Number(count.rows[0].count) });
      }
      dump = postgres('pg_dump', [
        '--format=custom',
        '--no-owner',
        '--no-privileges',
        '--snapshot',
        exported.rows[0].snapshot,
        'gym4me_test',
      ]);
      await snapshot.query('rollback');
    } finally {
      snapshot.release();
    }
    await writeFile(resolve(directory, 'database.dump'), dump, { mode: 0o600 });
    // This deletion does not exist in the dump. Export recovery evidence from
    // the newer source independently, before restoring the older database.
    await db.query(
      "update users set deleted_at=now(), status='suspended', display_name=null where id=$1",
      [newerFixtureId],
    );
    ledgerCommand(source.toString(), ['export', ledgerFile]);
    const objects: {
      key: string;
      file: string;
      sha256: string;
      contentType?: string;
    }[] = [];
    let continuation: string | undefined;
    do {
      const page = await s3.send(
        new ListObjectsV2Command({
          Bucket: sourceBucket,
          ContinuationToken: continuation,
        }),
      );
      for (const item of page.Contents ?? []) {
        if (!item.Key) continue;
        const object = await s3.send(
          new GetObjectCommand({ Bucket: sourceBucket, Key: item.Key }),
        );
        assert.ok(object.Body);
        const bytes = Buffer.from(await object.Body.transformToByteArray());
        const file = `${hash(Buffer.from(item.Key))}.object`;
        await writeFile(resolve(directory, file), bytes, { mode: 0o600 });
        objects.push({
          key: item.Key,
          file,
          sha256: hash(bytes),
          contentType: object.ContentType,
        });
      }
      continuation = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated) assert.ok(continuation);
    } while (continuation);
    const manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      databaseSha256: hash(dump),
      counts,
      objects,
    };
    await writeFile(
      resolve(directory, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      { mode: 0o600 },
    );
    // The DB/media below must come from encrypted storage, not the capture.
    const recovery = resolve(directory, 'recovered');
    const resticEnv = {
      ...process.env,
      RESTIC_REPOSITORY: resolve(directory, 'encrypted'),
      RESTIC_PASSWORD: randomUUID() + randomUUID(),
      RESTIC_PASSWORD_FILE: '',
    };
    const restic = (args: string[]) => {
      const result = spawnSync('restic', ['--no-cache', ...args], {
        cwd: directory,
        env: resticEnv,
        stdio: 'ignore',
        timeout: 120000,
      });
      if (result.status !== 0)
        throw new Error('Encrypted restore drill failed.');
    };
    restic(['init']);
    restic([
      'backup',
      'database.dump',
      'manifest.json',
      ...objects.map((object) => object.file),
    ]);
    restic(['check', '--read-data']);
    await rm(resolve(directory, 'database.dump'));
    for (const object of objects) await rm(resolve(directory, object.file));
    restic(['restore', 'latest', '--target', recovery]);
    const savedDump = await readFile(resolve(recovery, 'database.dump'));
    assert.equal(hash(savedDump), manifest.databaseSha256);
    postgres('createdb', [targetDatabase]);
    targetCreated = true;
    postgres(
      'pg_restore',
      [
        '--no-owner',
        '--no-privileges',
        '--exit-on-error',
        '-d',
        targetDatabase,
      ],
      savedDump,
    );
    const restoredUrl = new URL(source);
    restoredUrl.pathname = `/${targetDatabase}`;
    restored = new Pool({ connectionString: restoredUrl.toString() });
    for (const expected of counts) {
      const count: QueryResult<{ count: string }> = await restored.query<{
        count: string;
      }>(`select count(*) from "${expected.table.replaceAll('"', '""')}"`);
      assert.equal(Number(count.rows[0].count), expected.count, expected.table);
    }
    const tombstone = await restored.query<{
      status: string;
      deleted_at: Date;
    }>('select status, deleted_at from users where id = $1', [fixtureId]);
    assert.equal(tombstone.rows[0].status, 'suspended');
    assert.ok(tombstone.rows[0].deleted_at);
    const beforeReplay = await restored.query<{ deleted_at: Date | null }>(
      'select deleted_at from users where id=$1',
      [newerFixtureId],
    );
    assert.equal(beforeReplay.rows[0].deleted_at, null);
    ledgerCommand(restoredUrl.toString(), [
      'replay',
      ledgerFile,
      snapshotAt,
      '--apply',
    ]);
    const afterReplay = await restored.query<{
      deleted_at: Date | null;
      display_name: string | null;
      status: string;
    }>('select deleted_at,display_name,status from users where id=$1', [
      newerFixtureId,
    ]);
    assert.ok(afterReplay.rows[0].deleted_at);
    assert.equal(afterReplay.rows[0].display_name, null);
    assert.equal(afterReplay.rows[0].status, 'suspended');
    ledgerCommand(restoredUrl.toString(), [
      'replay',
      ledgerFile,
      snapshotAt,
      '--apply',
    ]);
    await s3.send(new CreateBucketCommand({ Bucket: targetBucket }));
    bucketCreated = true;
    for (const object of objects) {
      const bytes = await readFile(resolve(recovery, object.file));
      assert.equal(hash(bytes), object.sha256);
      await s3.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: object.key,
          Body: bytes,
          ContentType: object.contentType,
        }),
      );
      copied.push(object.key);
      const result = await s3.send(
        new GetObjectCommand({ Bucket: targetBucket, Key: object.key }),
      );
      assert.ok(result.Body);
      assert.equal(
        hash(Buffer.from(await result.Body.transformToByteArray())),
        object.sha256,
      );
    }
    const result = {
      verified: true,
      tables: counts.length,
      objects: objects.length,
      elapsedMs: Date.now() - started,
      tombstonePreserved: true,
      newerDeletionReplayed: true,
      encryptedRoundTrip: true,
      limitation:
        'The staging worker mirrors deletions every five minutes. Off-host repositories must be configured separately.',
    };
    await writeFile(
      resolve(directory, 'result.json'),
      JSON.stringify(result, null, 2),
      { mode: 0o600 },
    );
    console.log(JSON.stringify({ ...result, directory }));
  } finally {
    await restored?.end();
    if (targetCreated) postgres('dropdb', [targetDatabase]);
    for (const key of copied)
      await s3.send(
        new DeleteObjectCommand({ Bucket: targetBucket, Key: key }),
      );
    if (bucketCreated)
      await s3.send(new DeleteBucketCommand({ Bucket: targetBucket }));
    await db.query('delete from users where id = ANY($1::uuid[])', [
      [fixtureId, newerFixtureId],
    ]);
    await s3.send(
      new DeleteObjectCommand({ Bucket: sourceBucket, Key: fixtureKey }),
    );
    await db.end();
    s3.destroy();
  }
}
void main().catch(() => {
  console.error(
    'Local backup drill failed. Inspect its private artifacts; no production restore was attempted.',
  );
  process.exitCode = 1;
});
