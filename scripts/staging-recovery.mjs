import { mkdtemp, rm, chmod } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { privateConfig, runRestic } from "./staging-backup.mjs";
import { verifySnapshot } from "./backup-verify.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
// Preparation only: deliberately never starts an API or overwrites a database.
const command = process.argv[2];
if (!["verify", "prepare"].includes(command))
  throw new Error("Use verify or prepare.");
const base = resolve(root, ".ops-private");
mkdirSync(base, { recursive: true, mode: 0o700 });
const directory = await mkdtemp(join(base, "recovery-"));
try {
  const config = privateConfig(resolve(base, "backup.env"));
  privateConfig(config.RESTIC_PASSWORD_FILE);
  const env = { ...process.env, ...config };
  await runRestic(
    [
      "restore",
      "latest",
      "--host",
      "gym4me-staging",
      "--tag",
      "snapshot",
      "--target",
      directory,
    ],
    env,
  );
  await runRestic(
    [
      "restore",
      "latest",
      "--host",
      "gym4me-staging",
      "--tag",
      "ledger",
      "--target",
      directory,
    ],
    { ...env, RESTIC_REPOSITORY: config.LEDGER_REPOSITORY },
  );
  const ledger = resolve(directory, "ledger/deletion-ledger.json");
  await chmod(ledger, 0o600);
  const verified = await verifySnapshot(resolve(directory, "snapshot"), ledger);
  console.log(
    JSON.stringify({
      verified: true,
      ...verified,
      ...(command === "prepare"
        ? {
            directory,
            next: "Keep destination offline. Restore database/media into an isolated destination, then replay ledger/deletion-ledger.json with the existing deletion-ledger replay command and --apply before enabling traffic.",
          }
        : {}),
    }),
  );
} catch {
  await rm(directory, { recursive: true, force: true });
  console.error(
    "Recovery verification failed. Keep restored services offline. A current trusted deletion mirror is required.",
  );
  process.exitCode = 1;
} finally {
  if (command === "verify")
    await rm(directory, { recursive: true, force: true });
}
