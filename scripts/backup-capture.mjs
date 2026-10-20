import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { spawnManaged } from "./managed-child.mjs";
import { captureMedia, saveBackupFile } from "./backup-media.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(resolve(root, "apps/api/package.json"));
const { Pool } = require("pg");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

export async function capture(
  directory,
  env,
  ledgerOnly = false,
  { signal } = {},
) {
  signal?.throwIfAborted();
  const databaseUrl = new URL(env.MIGRATION_DATABASE_URL);
  if (
    !["localhost", "127.0.0.1"].includes(databaseUrl.hostname) ||
    databaseUrl.port !== "55434" ||
    databaseUrl.pathname !== "/gym4me_stage"
  )
    throw new Error("Capture is restricted to isolated local staging.");
  const db = new Pool({
    connectionString: databaseUrl.href,
    connectionTimeoutMillis: 10000,
  });
  const s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  let client,
    dumpApplication,
    released = false;
  const terminations = [];
  const terminateDump = () => {
    if (!dumpApplication) return Promise.resolve();
    // Killing docker exec's client alone need not kill pg_dump inside the container.
    // Match this capture's random libpq application name and its own database role.
    // Repeat after docker-client shutdown: an early query can precede backend startup.
    // A daemon exec starting later still cannot import the aborted owner's snapshot;
    // server-side exec termination itself requires separate Docker/DB acceptance.
    const termination = db
      .query({
        text: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user AND application_name=$1 AND pid<>pg_backend_pid()",
        values: [dumpApplication],
        query_timeout: 3000,
      })
      .catch(() => {});
    terminations.push(termination);
    return termination;
  };
  const abort = () => {
    s3.destroy();
    if (client && !released) {
      released = true;
      client.release(true);
    }
    void terminateDump();
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    client = await db.connect();
    signal?.throwIfAborted();
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const {
      rows: [snapshot],
    } = await client.query(
      "SELECT pg_export_snapshot() AS id, transaction_timestamp() AS at",
    );
    const at = snapshot.at.toISOString();
    const { rows } = await client.query(
      'SELECT id AS "userId", deleted_at AS "deletedAt" FROM users WHERE deleted_at IS NOT NULL AND deleted_at <= $1 ORDER BY id',
      [at],
    );
    const ledger = {
      version: 1,
      exportedAt: at,
      entries: rows.map((r) => ({
        userId: r.userId,
        deletedAt: r.deletedAt.toISOString(),
      })),
    };
    await writeFile(
      resolve(directory, "deletion-ledger.json"),
      JSON.stringify(ledger),
      { mode: 0o600, flag: "wx" },
    );
    if (!ledgerOnly) {
      dumpApplication = `gym4me_capture_${randomUUID().replaceAll("-", "")}`;
      const task = spawnManaged(
        "docker",
        [
          "compose",
          "-f",
          "compose.staging.yaml",
          "--env-file",
          ".env.staging",
          "exec",
          "-T",
          "-e",
          "PGPASSWORD",
          "-e",
          "PGAPPNAME",
          "postgres",
          "pg_dump",
          "-h",
          "127.0.0.1",
          "-U",
          decodeURIComponent(databaseUrl.username),
          "--format=custom",
          "--no-owner",
          "--no-privileges",
          "--snapshot",
          snapshot.id,
          "gym4me_stage",
        ],
        {
          cwd: root,
          env: {
            ...process.env,
            PGPASSWORD: decodeURIComponent(databaseUrl.password),
            PGAPPNAME: dumpApplication,
          },
          stdio: ["ignore", "pipe", "ignore"],
        },
        { signal, timeoutMs: 15 * 60 * 1000 },
      );
      let dump,
        failed = true;
      const output = saveBackupFile(
        directory,
        "database.dump",
        task.child.stdout,
      );
      const completed = task.completed.then(({ code }) => {
        if (code !== 0) throw new Error("Database capture failed.");
      });
      try {
        [dump] = await Promise.all([output, completed]);
        failed = false;
      } finally {
        await task.stop().catch(() => {});
        if (failed) await terminateDump();
        await Promise.allSettled([output, completed]);
      }
      dumpApplication = undefined;
      signal?.throwIfAborted();
      const media = await captureMedia(
        client,
        (key) =>
          s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
            abortSignal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
              : AbortSignal.timeout(60000),
          }),
        directory,
      );
      signal?.throwIfAborted();
      await writeFile(
        resolve(directory, "manifest.json"),
        JSON.stringify({
          version: 1,
          snapshotAt: at,
          source: "gym4me_stage",
          bucket: env.S3_BUCKET,
          objects: media.objects,
          mediaSources: media.mediaSources,
          files: [dump, ...media.files],
        }),
        { mode: 0o600, flag: "wx" },
      );
    }
    signal?.throwIfAborted();
    await client.query("COMMIT");
    return at;
  } finally {
    signal?.removeEventListener("abort", abort);
    await Promise.allSettled(terminations);
    if (client && !released) {
      await client.query("ROLLBACK").catch(() => {});
      released = true;
      client.release();
    }
    await db.end();
    s3.destroy();
  }
}
