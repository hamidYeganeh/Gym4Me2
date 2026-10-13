import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { verifySnapshot } from "./backup-verify.mjs";
import { runRestic } from "./staging-backup.mjs";
test("encrypted round trip verifies data and rejects stale ledger or tampering", async () => {
  const root = await mkdtemp(join(tmpdir(), "gym4me-restic-test-"));
  const now = Date.now();
  const manifest = {
    version: 1,
    source: "gym4me_stage",
    snapshotAt: new Date(now - 1000).toISOString(),
    objects: [],
    files: [
      {
        file: "database.dump",
        size: 7,
        sha256: createHash("sha256").update("fixture").digest("hex"),
      },
    ],
  };
  const env = {
    ...process.env,
    RESTIC_REPOSITORY: join(root, "encrypted"),
    RESTIC_PASSWORD: "test-only-ephemeral-password",
  };
  delete env.RESTIC_PASSWORD_FILE;
  try {
    await writeFile(join(root, "database.dump"), "fixture", { mode: 0o600 });
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest));
    const ledger = join(root, "ledger.json");
    await writeFile(
      ledger,
      JSON.stringify({
        version: 1,
        exportedAt: new Date(now).toISOString(),
        entries: [],
      }),
    );
    await runRestic(["init"], env, root);
    await runRestic(["backup", "database.dump", "manifest.json"], env, root);
    await runRestic(["check", "--read-data"], env, root);
    await runRestic(
      ["restore", "latest", "--target", join(root, "restore")],
      env,
      root,
    );
    assert.deepEqual(await verifySnapshot(join(root, "restore"), ledger, now), {
      snapshotAt: manifest.snapshotAt,
      files: 1,
      deletions: 0,
    });
    await assert.rejects(
      verifySnapshot(join(root, "restore"), ledger, now + 11 * 60000),
      /older/,
    );
    await writeFile(join(root, "restore/database.dump"), "changed");
    await assert.rejects(
      verifySnapshot(join(root, "restore"), ledger, now),
      /checksum/,
    );
    await assert.rejects(
      runRestic(
        ["snapshots"],
        { ...env, RESTIC_PASSWORD: "wrong-password" },
        root,
      ),
      /failed/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
