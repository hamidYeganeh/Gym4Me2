import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { captureMedia, saveBackupFile } from "./backup-media.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(resolve(root, "apps/api/package.json"));
const { Pool } = require("pg");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

export async function capture(directory, env, ledgerOnly = false) {
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
  const client = await db.connect();
  const s3 = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  try {
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
      const child = spawn(
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
          },
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 15 * 60 * 1000,
        },
      );
      const completed = new Promise((res, rej) => {
        child.once("error", rej);
        child.once("close", (code) =>
          code === 0 ? res() : rej(new Error("Database capture failed.")),
        );
      });
      const [dump] = await Promise.all([
        saveBackupFile(directory, "database.dump", child.stdout),
        completed,
      ]);
      const media = await captureMedia(
        client,
        (key) =>
          s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
            abortSignal: AbortSignal.timeout(60000),
          }),
        directory,
      );
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
    await client.query("COMMIT");
    return at;
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    await db.end();
    s3.destroy();
  }
}
