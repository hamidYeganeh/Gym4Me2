// Completes an offline, isolated local restore; never starts an API or overwrites a database.
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

async function main() {
  const [directory, ledgerFile, offline, ...extra] = process.argv.slice(2);
  if (!directory || !ledgerFile || offline !== '--offline' || extra.length)
    throw new Error(
      'Use SNAPSHOT_DIRECTORY LEDGER_FILE --offline with a restored, isolated destination.',
    );
  const url = new URL(process.env.RESTORE_DATABASE_URL ?? '');
  const endpoint = new URL(process.env.RESTORE_S3_ENDPOINT ?? '');
  const bucket = process.env.RESTORE_S3_BUCKET ?? '';
  if (
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    !['55433', '55434'].includes(url.port) ||
    !/^\/gym4me_(recovery_[a-f0-9]{16}|backup_restore_[a-f0-9]{16}_test)$/.test(
      url.pathname,
    ) ||
    !['localhost', '127.0.0.1'].includes(endpoint.hostname) ||
    endpoint.protocol !== 'http:' ||
    !['8333', '8334'].includes(endpoint.port) ||
    !/^gym4me-(recovery|backup-restore)-[a-f0-9]{16}$/.test(bucket) ||
    !process.env.RESTORE_S3_ACCESS_KEY_ID ||
    !process.env.RESTORE_S3_SECRET_ACCESS_KEY
  )
    throw new Error(
      'Requires an isolated local recovery database and bucket, never a live destination.',
    );
  const pool = new Pool({
    connectionString: url.href,
    max: 1,
    connectionTimeoutMillis: 10000,
  });
  const s3 = new S3Client({
    endpoint: endpoint.href,
    forcePathStyle: true,
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.RESTORE_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.RESTORE_S3_SECRET_ACCESS_KEY,
    },
  });
  try {
    const connections = await pool.query<{ count: number }>(
      'SELECT count(*)::int count FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()',
    );
    if (connections.rows[0].count !== 0)
      throw new Error(
        'Keep every API and worker disconnected from the recovery destination.',
      );
    const objects = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }),
      { abortSignal: AbortSignal.timeout(10000) },
    );
    if (objects.Contents?.length)
      throw new Error(
        'Recovery requires an empty, separately provisioned bucket.',
      );
    const { recoverMedia } =
      await import('../../../scripts/recovery-media.mjs');
    const result = await recoverMedia({
      directory: resolve(directory),
      ledgerFile: resolve(ledgerFile),
      client: pool,
      replay: (file, at) => {
        const replay = spawnSync(
          process.execPath,
          [
            '-r',
            'ts-node/register',
            'scripts/deletion-ledger.ts',
            'replay',
            file,
            at,
            '--apply',
          ],
          {
            cwd: resolve(__dirname, '..'),
            env: {
              ...process.env,
              DATABASE_URL: url.href,
              AUTH_SECRET: randomUUID() + randomUUID(),
              RETENTION_ENABLED: 'false',
              S3_ENDPOINT: endpoint.href,
              S3_BUCKET: bucket,
              S3_ACCESS_KEY_ID: process.env.RESTORE_S3_ACCESS_KEY_ID,
              S3_SECRET_ACCESS_KEY: process.env.RESTORE_S3_SECRET_ACCESS_KEY,
            },
            stdio: 'ignore',
            timeout: 120000,
          },
        );
        if (replay.status !== 0)
          return Promise.reject(
            new Error('Deletion replay failed; no media may be uploaded.'),
          );
        return Promise.resolve();
      },
      upload: async (object, stream) => {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: object.key,
            Body: stream,
            ContentType: object.contentType,
            ContentLength: object.size,
          }),
          { abortSignal: AbortSignal.timeout(60000) },
        );
      },
    });
    console.log(
      JSON.stringify({
        verified: true,
        ...result,
        offline: true,
        next: 'Verify roles, S3 URLs, application configuration and smoke flows before any explicit traffic cutover.',
      }),
    );
  } finally {
    await pool.end();
    s3.destroy();
  }
}
void main().catch(() => {
  console.error(
    'Offline media recovery failed. Keep destination offline; no release was authorized.',
  );
  process.exitCode = 1;
});
