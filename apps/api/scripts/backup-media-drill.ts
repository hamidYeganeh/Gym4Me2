// Real PostgreSQL/S3 + encrypted recovery. All source/target resources are disposable.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Readable } from 'node:stream';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import sharp from 'sharp';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const root = resolve(__dirname, '../../..');
const token = randomUUID().replaceAll('-', '').slice(0, 16);
const sourceDatabase = `gym4me_backup_source_${token}_test`;
const targetDatabase = `gym4me_backup_restore_${token}_test`;
const sourceBucket = `gym4me-backup-source-${token}`;
const targetBucket = `gym4me-backup-restore-${token}`;
const directory = resolve(root, '.artifacts/backup-drill', token);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
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
    { cwd: root, input, maxBuffer: 128 * 1024 * 1024, timeout: 120000 },
  );
  if (result.status !== 0)
    throw new Error('Disposable PostgreSQL operation failed.');
  return result.stdout;
}
async function main() {
  const { captureMedia, selectRestoreMedia, saveBackupFile } =
    await import('../../../scripts/backup-media.mjs');
  const base = new URL(
    process.env.TEST_DATABASE_URL ??
      'postgresql://gym4me:gym4me_local@127.0.0.1:55433/gym4me_test',
  );
  assert.equal(base.hostname, '127.0.0.1');
  assert.equal(base.port, '55433');
  assert.equal(base.pathname, '/gym4me_test');
  const endpoint = new URL(
    process.env.TEST_S3_ENDPOINT ?? 'http://127.0.0.1:8333',
  );
  assert.ok(['localhost', '127.0.0.1'].includes(endpoint.hostname));
  const s3 = new S3Client({
    endpoint: endpoint.href,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID ?? 'gym4me_local',
      secretAccessKey:
        process.env.TEST_S3_SECRET_ACCESS_KEY ?? 'gym4me_local_storage',
    },
  });
  const sourceUrl = new URL(base);
  sourceUrl.pathname = `/${sourceDatabase}`;
  const restoredUrl = new URL(base);
  restoredUrl.pathname = `/${targetDatabase}`;
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    AUTH_SECRET: randomUUID() + randomUUID(),
    RETENTION_ENABLED: 'false',
  };
  const ledgerCommand = (url: string, args: string[]) => {
    const result = spawnSync(
      process.execPath,
      ['-r', 'ts-node/register', 'scripts/deletion-ledger.ts', ...args],
      {
        cwd: resolve(root, 'apps/api'),
        env: { ...env, DATABASE_URL: url },
        stdio: 'ignore',
        timeout: 120000,
      },
    );
    if (result.status !== 0)
      throw new Error(
        'Deletion replay failed; recovered API must remain offline.',
      );
  };
  const encryptedEnv = {
    ...process.env,
    RESTIC_REPOSITORY: resolve(directory, 'encrypted'),
    RESTIC_PASSWORD: randomUUID() + randomUUID(),
    RESTIC_PASSWORD_FILE: '',
  };
  const restic = (args: string[], ledger = false) => {
    const result = spawnSync('restic', ['--no-cache', ...args], {
      cwd: directory,
      env: {
        ...encryptedEnv,
        RESTIC_REPOSITORY: ledger
          ? resolve(directory, 'ledger-encrypted')
          : encryptedEnv.RESTIC_REPOSITORY,
      },
      stdio: 'ignore',
      timeout: 120000,
    });
    if (result.status !== 0)
      throw new Error('Encrypted backup round trip failed.');
  };
  let source: Pool | undefined, restored: Pool | undefined;
  let sourceCreated = false,
    targetCreated = false,
    sourceBucketCreated = false,
    targetBucketCreated = false;
  const uploadedSource: string[] = [],
    uploadedTarget: string[] = [];
  const started = Date.now();
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    postgres('createdb', [sourceDatabase]);
    sourceCreated = true;
    source = new Pool({
      connectionString: sourceUrl.href,
      connectionTimeoutMillis: 10000,
    });
    await migrate(drizzle(source), {
      migrationsFolder: resolve(root, 'apps/api/database/migrations'),
    });
    await s3.send(new CreateBucketCommand({ Bucket: sourceBucket }));
    sourceBucketCreated = true;
    const owner = randomUUID(),
      athlete = randomUUID(),
      org = randomUUID(),
      branch = randomUUID(),
      service = randomUUID(),
      version = randomUUID(),
      occurrence = randomUUID(),
      conversation = randomUUID();
    await source.query(
      "INSERT INTO users(id,phone,status,deleted_at) VALUES($1,$2,'suspended',now())",
      [owner, `~${token}`],
    );
    await source.query(
      "INSERT INTO users(id,phone,display_name) VALUES($1,$2,'private fixture')",
      [athlete, `~n${token}`],
    );
    await source.query(
      'INSERT INTO organizations(id,name,slug) VALUES($1,$2,$3)',
      [org, 'Disposable backup fixture', `backup-${token}`],
    );
    await source.query(
      'INSERT INTO branches(id,organization_id,name,slug) VALUES($1,$2,$3,$4)',
      [branch, org, 'Fixture branch', 'fixture'],
    );
    await source.query(
      "INSERT INTO sport_services(id,organization_id,branch_id,title,kind) VALUES($1,$2,$3,'Fixture service','class')",
      [service, org, branch],
    );
    await source.query(
      "INSERT INTO sport_service_versions(id,service_id,version,title,amount_minor,description,policy) VALUES($1,$2,1,'Fixture service',0,'fixture','{}'::jsonb)",
      [version, service],
    );
    await source.query(
      "INSERT INTO sport_occurrences(id,service_id,version_id,start_at,end_at,capacity) VALUES($1,$2,$3,now()+interval '1 day',now()+interval '25 hours',1)",
      [occurrence, service, version],
    );
    await source.query(
      "INSERT INTO sport_conversations(id,occurrence_id,title) VALUES($1,$2,'Fixture conversation')",
      [conversation, occurrence],
    );
    const bytes = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#227744' },
    })
      .webp()
      .toBuffer();
    const keys = {
      club: `clubs/${org}/${randomUUID()}.webp`,
      cover: `sports/service-images/${service}/${randomUUID()}.webp`,
      document: `sports/documents/${athlete}/${randomUUID()}.pdf`,
      message: `sports/messages/${conversation}/${randomUUID()}.webp`,
      deletedMessage: `sports/messages/${conversation}/${randomUUID()}.webp`,
      orphan: `sports/orphans/${randomUUID()}.webp`,
    };
    for (const key of Object.values(keys)) {
      await s3.send(
        new PutObjectCommand({
          Bucket: sourceBucket,
          Key: key,
          Body: key.endsWith('.pdf')
            ? Buffer.from('%PDF-1.4\nprivate fixture\n%%EOF')
            : bytes,
          ContentType: key.endsWith('.pdf') ? 'application/pdf' : 'image/webp',
        }),
      );
      uploadedSource.push(key);
    }
    await source.query(
      "INSERT INTO club_media(organization_id,uploaded_by,type,url,object_key) VALUES($1,$2,'image','https://example.invalid/fixture',$3)",
      [org, owner, keys.club],
    );
    await source.query(
      "INSERT INTO sport_service_images(service_id,object_key,alt,width,height,size_bytes) VALUES($1,$2,'Fixture cover',2,2,$3)",
      [service, keys.cover, bytes.length],
    );
    await source.query(
      "INSERT INTO sport_documents(user_id,service_id,name,object_key) VALUES($1,$2,'Private fixture',$3)",
      [athlete, service, keys.document],
    );
    await source.query(
      "INSERT INTO sport_messages(conversation_id,sender_id,body,image_key,idempotency_key,request_hash) VALUES($1,$2,'Private fixture',$3,$4,'fixture')",
      [conversation, athlete, keys.message, randomUUID()],
    );
    await source.query(
      "INSERT INTO sport_messages(conversation_id,sender_id,body,image_key,idempotency_key,request_hash,deleted_at) VALUES($1,$2,'[deleted]',$3,$4,'fixture',now())",
      [conversation, athlete, keys.deletedMessage, randomUUID()],
    );
    const snapshot = await source.connect();
    let snapshotAt: string,
      counts: { table: string; count: number }[],
      dump: Buffer,
      media: Awaited<ReturnType<typeof captureMedia>>;
    try {
      await snapshot.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const {
        rows: [exported],
      } = await snapshot.query<{ id: string; at: Date }>(
        'SELECT pg_export_snapshot() id,transaction_timestamp() at',
      );
      snapshotAt = exported.at.toISOString();
      const { rows: tables } = await snapshot.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
      );
      counts = [];
      for (const { tablename } of tables) {
        const {
          rows: [row],
        } = await snapshot.query<{ count: number }>(
          `SELECT count(*)::int count FROM "${tablename.replaceAll('"', '""')}"`,
        );
        counts.push({ table: tablename, count: row.count });
      }
      dump = postgres('pg_dump', [
        '--format=custom',
        '--no-owner',
        '--no-privileges',
        '--snapshot',
        exported.id,
        sourceDatabase,
      ]);
      media = await captureMedia(
        snapshot,
        (key: string) =>
          s3.send(new GetObjectCommand({ Bucket: sourceBucket, Key: key })),
        directory,
      );
      await snapshot.query('COMMIT');
    } finally {
      await snapshot.query('ROLLBACK').catch(() => {});
      snapshot.release();
    }
    assert.equal(media.objects.length, 4);
    assert.ok(
      !media.objects.some((object: { key: string }) =>
        [keys.deletedMessage, keys.orphan].includes(object.key),
      ),
    );
    const dumpFile = await saveBackupFile(
      directory,
      'database.dump',
      Readable.from(dump),
    );
    const manifest = {
      version: 1,
      snapshotAt,
      // Exercise the production staging manifest contract with disposable data.
      source: 'gym4me_stage',
      fixtureSource: sourceDatabase,
      mediaSources: media.mediaSources,
      objects: media.objects,
      files: [dumpFile, ...media.files],
      counts,
    };
    await writeFile(
      resolve(directory, 'manifest.json'),
      JSON.stringify(manifest),
      { mode: 0o600 },
    );
    await source.query(
      "UPDATE users SET deleted_at=now(),status='suspended',display_name=null WHERE id=$1",
      [athlete],
    );
    const ledgerFile = resolve(directory, 'newer-deletion-ledger.json');
    ledgerCommand(sourceUrl.href, ['export', ledgerFile]);
    restic(['init']);
    restic(['backup', 'database.dump', 'manifest.json', 'objects']);
    restic(['check', '--read-data']);
    restic(['init'], true);
    restic(['backup', 'newer-deletion-ledger.json'], true);
    restic(['check', '--read-data'], true);
    await rm(resolve(directory, 'database.dump'));
    await rm(resolve(directory, 'objects'), { recursive: true });
    await rm(ledgerFile);
    // Simulate complete source loss before recovery, including its object storage.
    await source.end();
    source = undefined;
    postgres('dropdb', [sourceDatabase]);
    sourceCreated = false;
    for (const Key of uploadedSource)
      await s3.send(new DeleteObjectCommand({ Bucket: sourceBucket, Key }));
    await s3.send(new DeleteBucketCommand({ Bucket: sourceBucket }));
    sourceBucketCreated = false;
    const recovery = resolve(directory, 'recovered'),
      ledgerRecovery = resolve(directory, 'recovered-ledger');
    restic(['restore', 'latest', '--target', recovery]);
    restic(['restore', 'latest', '--target', ledgerRecovery], true);
    const recoveredDump = await readFile(resolve(recovery, 'database.dump'));
    assert.equal(sha(recoveredDump), dumpFile.sha256);
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
      recoveredDump,
    );
    restored = new Pool({
      connectionString: restoredUrl.href,
      connectionTimeoutMillis: 10000,
    });
    for (const expected of counts) {
      const actual: unknown = (
        await restored.query(
          `SELECT count(*)::int count FROM "${expected.table.replaceAll('"', '""')}"`,
        )
      ).rows[0];
      assert.ok(
        actual !== null && typeof actual === 'object' && 'count' in actual,
      );
      assert.equal(actual.count, expected.count, expected.table);
    }
    assert.ok(
      (
        await restored.query<{ deleted_at: Date | null }>(
          'SELECT deleted_at FROM users WHERE id=$1',
          [owner],
        )
      ).rows[0].deleted_at,
    );
    assert.equal(
      (
        await restored.query<{ deleted_at: Date | null }>(
          'SELECT deleted_at FROM users WHERE id=$1',
          [athlete],
        )
      ).rows[0].deleted_at,
      null,
    );
    const trustedLedger = resolve(ledgerRecovery, 'newer-deletion-ledger.json');
    await s3.send(new CreateBucketCommand({ Bucket: targetBucket }));
    targetBucketCreated = true;
    uploadedTarget.push(...media.objects.map((object) => object.key));
    const runRecovery = () =>
      spawnSync(
        process.execPath,
        [
          '--import',
          'tsx',
          'scripts/restore-media.ts',
          recovery,
          trustedLedger,
          '--offline',
        ],
        {
          cwd: resolve(root, 'apps/api'),
          env: {
            ...env,
            RESTORE_DATABASE_URL: restoredUrl.href,
            RESTORE_S3_ENDPOINT: endpoint.href,
            RESTORE_S3_BUCKET: targetBucket,
            RESTORE_S3_ACCESS_KEY_ID:
              process.env.TEST_S3_ACCESS_KEY_ID ?? 'gym4me_local',
            RESTORE_S3_SECRET_ACCESS_KEY:
              process.env.TEST_S3_SECRET_ACCESS_KEY ?? 'gym4me_local_storage',
          },
          timeout: 120000,
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
        },
      );
    assert.equal(
      runRecovery().status,
      1,
      'Connected destination must be rejected.',
    );
    assert.equal(
      (
        await restored.query<{ deleted_at: Date | null }>(
          'SELECT deleted_at FROM users WHERE id=$1',
          [athlete],
        )
      ).rows[0].deleted_at,
      null,
    );
    await assert.rejects(
      s3.send(new HeadObjectCommand({ Bucket: targetBucket, Key: keys.club })),
      (error: { $metadata?: { httpStatusCode?: number } }) =>
        error.$metadata?.httpStatusCode === 404,
    );
    await restored.end();
    restored = undefined;
    const recoveryCommand = runRecovery();
    assert.equal(
      recoveryCommand.status,
      0,
      'Operator recovery command failed.',
    );
    const recovered: unknown = JSON.parse(recoveryCommand.stdout);
    assert.ok(
      recovered !== null &&
        typeof recovered === 'object' &&
        'restoredObjects' in recovered &&
        'excludedObjects' in recovered,
    );
    assert.equal(recovered.restoredObjects, 2);
    assert.equal(recovered.excludedObjects, 2);
    assert.equal(
      runRecovery().status,
      1,
      'Nonempty destination bucket must be rejected.',
    );
    restored = new Pool({
      connectionString: restoredUrl.href,
      connectionTimeoutMillis: 10000,
    });
    ledgerCommand(restoredUrl.href, [
      'replay',
      trustedLedger,
      snapshotAt,
      '--apply',
    ]);
    const {
      rows: [erased],
    } = await restored.query<{
      deleted_at: Date | null;
      display_name: string | null;
      status: string;
    }>('SELECT deleted_at,display_name,status FROM users WHERE id=$1', [
      athlete,
    ]);
    assert.ok(erased.deleted_at);
    assert.equal(erased.display_name, null);
    assert.equal(erased.status, 'suspended');
    const allowed = await selectRestoreMedia(restored, media.objects);
    assert.deepEqual(
      allowed.map((object: { key: string }) => object.key).sort(),
      [keys.club, keys.cover].sort(),
    );
    for (const object of allowed) {
      const read = await s3.send(
        new GetObjectCommand({ Bucket: targetBucket, Key: object.key }),
      );
      assert.ok(read.Body);
      assert.equal(
        sha(Buffer.from(await read.Body.transformToByteArray())),
        media.files.find((file) => file.file === object.file)!.sha256,
      );
    }
    for (const Key of [
      keys.document,
      keys.message,
      keys.deletedMessage,
      keys.orphan,
    ])
      await assert.rejects(
        s3.send(new HeadObjectCommand({ Bucket: targetBucket, Key })),
        (error: { $metadata?: { httpStatusCode?: number } }) =>
          error.$metadata?.httpStatusCode === 404,
      );
    await assert.rejects(
      selectRestoreMedia(
        restored,
        media.objects.filter(
          (object: { key: string }) => object.key !== keys.cover,
        ),
      ),
      /missing referenced media/,
    );
    const result = {
      verified: true,
      tables: counts.length,
      capturedObjects: media.objects.length,
      restoredObjects: allowed.length,
      objects: allowed.length,
      elapsedMs: Date.now() - started,
      tombstonePreserved: true,
      newerDeletionReplayed: true,
      encryptedRoundTrip: true,
      sourceRemovedBeforeRestore: true,
      privateAttachmentsNotResurrected: true,
      sharedRecoveryGate: true,
      operatorCommandExercised: true,
      occupiedDestinationRejected: true,
      limitation:
        'Disposable local PostgreSQL/S3 and encrypted repositories; this does not prove off-host storage or scheduled staging recovery.',
    };
    await writeFile(
      resolve(directory, 'result.json'),
      JSON.stringify(result, null, 2),
      { mode: 0o600 },
    );
    console.log(JSON.stringify({ ...result, directory }));
  } finally {
    await restored?.end();
    await source?.end();
    if (targetCreated) postgres('dropdb', [targetDatabase]);
    if (sourceCreated) postgres('dropdb', [sourceDatabase]);
    if (targetBucketCreated) {
      for (const Key of uploadedTarget)
        await s3.send(new DeleteObjectCommand({ Bucket: targetBucket, Key }));
      await s3.send(new DeleteBucketCommand({ Bucket: targetBucket }));
    }
    if (sourceBucketCreated) {
      for (const Key of uploadedSource)
        await s3.send(new DeleteObjectCommand({ Bucket: sourceBucket, Key }));
      await s3.send(new DeleteBucketCommand({ Bucket: sourceBucket }));
    }
    s3.destroy();
  }
}
void main().catch(() => {
  console.error(
    'Isolated media recovery drill failed. No production or staging restore was attempted.',
  );
  process.exitCode = 1;
});
