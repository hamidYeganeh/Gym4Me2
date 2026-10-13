import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { capture } from "./backup-capture.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const privateDir = resolve(root, ".ops-private");
const configFile = resolve(privateDir, "backup.env");
export async function runRestic(args, env, cwd = root) {
  await new Promise((resolveRun, reject) => {
    const child = spawn(env.RESTIC_BIN ?? "restic", ["--no-cache", ...args], {
      env,
      cwd,
      stdio: ["ignore", "ignore", "ignore"],
      timeout: 30 * 60 * 1000,
    });
    child.once("error", () => reject(new Error("Restic unavailable.")));
    // Even partial snapshots (exit 3) must never report success.
    child.once("close", (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`Restic ${args[0]} failed (${code}).`)),
    );
  });
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
export async function backupAction(action) {
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
    await runRestic(["init"], env);
    await runRestic(["init"], {
      ...env,
      RESTIC_REPOSITORY: config.LEDGER_REPOSITORY,
    });
  } else if (action === "check") {
    for (const repo of [config.RESTIC_REPOSITORY, config.LEDGER_REPOSITORY])
      await runRestic(["check", "--read-data"], {
        ...env,
        RESTIC_REPOSITORY: repo,
      });
  } else if (action === "snapshot" || action === "ledger") {
    mkdirSync(privateDir, { recursive: true, mode: 0o700 });
    const temp = await mkdtemp(join(privateDir, "capture-"));
    try {
      const staging = privateConfig(resolve(root, ".env.staging"));
      const ledgerOnly = action === "ledger";
      const directory = resolve(temp, ledgerOnly ? "ledger" : "snapshot");
      await capture(directory, staging, ledgerOnly);
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
      );
      if (!ledgerOnly) await backupAction("ledger");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  } else
    throw new Error("Use init, init-repositories, snapshot, ledger, or check.");
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await backupAction(process.argv[2]);
    console.log("Backup operation completed.");
  } catch {
    console.error(
      "Backup operation failed; no success was recorded. Check configuration, dependencies and storage privately.",
    );
    process.exitCode = 1;
  }
}
