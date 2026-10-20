import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { spawnManaged } from "./managed-child.mjs";
import { resolve, join } from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { capture } from "./backup-capture.mjs";
import { retentionCommands, retentionSummary } from "./backup-retention.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const privateDir = resolve(root, ".ops-private");
const configFile = resolve(privateDir, "backup.env");
export async function runRestic(
  args,
  env,
  cwd = root,
  { captureOutput = false, signal } = {},
) {
  const task = spawnManaged(
    env.RESTIC_BIN ?? "restic",
    ["--no-cache", ...args],
    {
      env,
      cwd,
      stdio: ["ignore", captureOutput ? "pipe" : "ignore", "ignore"],
    },
    { signal, timeoutMs: 30 * 60 * 1000 },
  );
  const child = task.child;
  let output = "",
    overflow = false;
  if (captureOutput) {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      if (
        Buffer.byteLength(output) + Buffer.byteLength(chunk) >
        4 * 1024 * 1024
      ) {
        overflow = true;
        void task
          .stop(new Error("Restic output exceeds its limit."))
          .catch(() => {});
      } else output += chunk;
    });
  }
  // Even partial snapshots (exit 3) must never report success.
  const { code } = await task.completed;
  if (code !== 0 || overflow)
    throw new Error(`Restic ${args[0]} failed (${code}).`);
  return captureOutput ? output : undefined;
}
export function privateConfig(file) {
  const stat = lstatSync(file);
  if (
    !stat.isFile() ||
    stat.mode & 0o077 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error("Expected private operator-owned configuration.");
  return parseEnv(readFileSync(file, "utf8"));
}
export async function backupAction(
  action,
  { refreshLedger = true, applyRetention = false, signal } = {},
) {
  signal?.throwIfAborted();
  if (action === "init") {
    mkdirSync(privateDir, { recursive: true, mode: 0o700 });
    const password = resolve(privateDir, "restic-password");
    writeFileSync(password, randomBytes(48).toString("base64") + "\n", {
      mode: 0o600,
      flag: "wx",
    });
    writeFileSync(
      configFile,
      `RESTIC_REPOSITORY=${resolve(root, ".artifacts/encrypted-backups/database")}\nLEDGER_REPOSITORY=${resolve(root, ".artifacts/encrypted-backups/deletion-ledger")}\nRESTIC_PASSWORD_FILE=${password}\n`,
      { mode: 0o600, flag: "wx" },
    );
    return;
  }
  const config = privateConfig(configFile);
  if (
    !config.RESTIC_REPOSITORY ||
    !config.LEDGER_REPOSITORY ||
    config.RESTIC_REPOSITORY === config.LEDGER_REPOSITORY
  )
    throw new Error("Separate data and deletion-ledger repositories required.");
  privateConfig(config.RESTIC_PASSWORD_FILE); // Validate permissions; content is never logged.
  const env = { ...process.env, ...config };
  if (action === "init-repositories") {
    await runRestic(["init"], env, root, { signal });
    await runRestic(
      ["init"],
      {
        ...env,
        RESTIC_REPOSITORY: config.LEDGER_REPOSITORY,
      },
      root,
      { signal },
    );
  } else if (action === "retention") {
    // Ledger history is deliberately excluded. Retention is never scheduled by the worker.
    let selection;
    for (const args of retentionCommands(config, applyRetention)) {
      if (args[0] === "forget")
        selection = retentionSummary(
          await runRestic([...args, "--json"], env, root, {
            captureOutput: true,
            signal,
          }),
        );
      else await runRestic(args, env, root, { signal });
    }
    return { dryRun: !applyRetention, ...selection };
  } else if (action === "check") {
    for (const repo of [config.RESTIC_REPOSITORY, config.LEDGER_REPOSITORY])
      await runRestic(
        ["check", "--read-data"],
        {
          ...env,
          RESTIC_REPOSITORY: repo,
        },
        root,
        { signal },
      );
  } else if (action === "snapshot" || action === "ledger") {
    mkdirSync(privateDir, { recursive: true, mode: 0o700 });
    const temp = await mkdtemp(join(privateDir, "capture-"));
    try {
      const staging = privateConfig(resolve(root, ".env.staging"));
      const ledgerOnly = action === "ledger";
      const directory = resolve(temp, ledgerOnly ? "ledger" : "snapshot");
      const capturedAt = await capture(directory, staging, ledgerOnly, {
        signal,
      });
      await runRestic(
        [
          "backup",
          "--host",
          "gym4me-staging",
          "--tag",
          action,
          ledgerOnly ? "ledger" : "snapshot",
        ],
        {
          ...env,
          RESTIC_REPOSITORY: ledgerOnly
            ? config.LEDGER_REPOSITORY
            : config.RESTIC_REPOSITORY,
        },
        temp,
        { signal },
      );
      if (!ledgerOnly && refreshLedger)
        await backupAction("ledger", { signal });
      return { capturedAt };
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  } else
    throw new Error(
      "Use init, init-repositories, snapshot, ledger, check, or retention.",
    );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    const action = process.argv[2];
    const separateLedger = process.argv[3] === "--separate-ledger-worker";
    const applyRetention =
      action === "retention" && process.argv[3] === "--apply";
    if (
      process.argv.length > 4 ||
      (process.argv[3] &&
        !(separateLedger && action === "snapshot") &&
        !applyRetention)
    )
      throw new Error("Invalid backup arguments.");
    const receipt = await backupAction(action, {
      refreshLedger: !separateLedger,
      applyRetention,
      signal: controller.signal,
    });
    // No paths, repository credentials or account identifiers enter stdout.
    console.log(JSON.stringify({ operation: action, ...receipt }));
  } catch {
    console.error(
      "Backup operation failed; no success was recorded. Check configuration, dependencies and storage privately.",
    );
    process.exitCode = 1;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
