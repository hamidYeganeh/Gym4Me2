import assert from "node:assert/strict";
import test from "node:test";
import { retentionCommands, retentionSummary } from "./backup-retention.mjs";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { runRestic } from "./staging-backup.mjs";

test("retention has no implicit policy and rejects empty, injected or unbounded values", () => {
  for (const value of [
    undefined,
    "",
    "0",
    "-1",
    "1.5",
    "1d",
    "1 --unsafe-allow-remove-all",
    "999999999999999999999",
  ]) {
    assert.throws(() =>
      retentionCommands({
        BACKUP_RETENTION_DAYS: value,
        BACKUP_RETENTION_LAST: "2",
      }),
    );
    assert.throws(() =>
      retentionCommands({
        BACKUP_RETENTION_DAYS: "30",
        BACKUP_RETENTION_LAST: value,
      }),
    );
  }
});

test("default plan cannot remove data and temporary capture paths do not create independent groups", () => {
  const plan = retentionCommands({
    BACKUP_RETENTION_DAYS: "30",
    BACKUP_RETENTION_LAST: "2",
  });
  assert.equal(plan.length, 1);
  assert.equal(plan[0][0], "forget");
  assert.ok(plan[0].includes("--dry-run"));
  assert.equal(plan[0][plan[0].indexOf("--group-by") + 1], "host,tags");
  assert.equal(plan[0][plan[0].indexOf("--tag") + 1], "snapshot");
  assert.equal(plan[0][plan[0].indexOf("--keep-within") + 1], "30d");
  assert.ok(!plan.flat().includes("ledger"));
});

test("explicit apply validates integrity before forgetting and after pruning", () => {
  const plan = retentionCommands(
    { BACKUP_RETENTION_DAYS: "30", BACKUP_RETENTION_LAST: "2" },
    true,
  );
  assert.deepEqual(
    plan.map((command) => command[0]),
    ["check", "forget", "prune", "check"],
  );
  assert.deepEqual(plan[0], ["check", "--read-data"]);
  assert.deepEqual(plan[3], ["check", "--read-data"]);
  assert.ok(!plan.flat().includes("--unsafe-allow-remove-all"));
});

test("encrypted disposable repositories preserve data in dry-run, prune across capture paths, and retain the ledger", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-retention-test-"));
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith("RESTIC_")),
  );
  const env = {
    ...environment,
    RESTIC_REPOSITORY: join(directory, "backups"),
    RESTIC_PASSWORD: "ephemeral-retention-test-only",
  };
  const ledgerEnv = { ...env, RESTIC_REPOSITORY: join(directory, "ledger") };
  const execute = promisify(execFile);
  const list = async (env) =>
    JSON.parse(
      (
        await execute("restic", ["--no-cache", "snapshots", "--json"], {
          env,
          timeout: 60000,
          maxBuffer: 1024 * 1024,
        })
      ).stdout,
    );
  try {
    await runRestic(["init"], env, directory);
    await runRestic(["init"], ledgerEnv, directory);
    const now = Date.now();
    for (const [index, age] of [3, 2, 0].entries()) {
      const path = join(directory, `capture-${index}`);
      await mkdir(path);
      await writeFile(join(path, "database.dump"), `snapshot-${index}`, {
        mode: 0o600,
      });
      const timestamp = new Date(now - age * 86400000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      await runRestic(
        [
          "backup",
          "--host",
          "gym4me-staging",
          "--tag",
          "snapshot",
          "--time",
          timestamp,
          "database.dump",
        ],
        env,
        path,
      );
    }
    await writeFile(
      join(directory, "deletion-ledger.json"),
      "opaque-tombstone-test",
      { mode: 0o600 },
    );
    await runRestic(
      [
        "backup",
        "--host",
        "gym4me-staging",
        "--tag",
        "ledger",
        "deletion-ledger.json",
      ],
      ledgerEnv,
      directory,
    );
    const policy = { BACKUP_RETENTION_DAYS: "1", BACKUP_RETENTION_LAST: "1" };
    for (const command of retentionCommands(policy)) {
      const output = await runRestic([...command, "--json"], env, directory, {
        captureOutput: true,
      });
      assert.deepEqual(retentionSummary(output), {
        snapshotsKept: 1,
        snapshotsSelectedForRemoval: 2,
      });
    }
    assert.equal((await list(env)).length, 3);
    for (const command of retentionCommands(policy, true))
      await runRestic(command, env, directory);
    const kept = await list(env);
    assert.equal(kept.length, 1);
    assert.ok(kept[0].paths[0].endsWith("capture-2/database.dump"));
    assert.equal((await list(ledgerEnv)).length, 1);
    const restored = join(directory, "restored");
    await runRestic(
      ["restore", "latest", "--target", restored],
      ledgerEnv,
      directory,
    );
    assert.equal(
      await readFile(join(restored, "deletion-ledger.json"), "utf8"),
      "opaque-tombstone-test",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
