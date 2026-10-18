import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  rm,
  mkdir,
  chmod,
  symlink,
} from "node:fs/promises";
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
    await writeFile(join(root, "manifest.json"), JSON.stringify(manifest), {
      mode: 0o600,
    });
    const ledger = join(root, "ledger.json");
    await writeFile(
      ledger,
      JSON.stringify({
        version: 1,
        exportedAt: new Date(now).toISOString(),
        entries: [],
      }),
      { mode: 0o600 },
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

test("verification rejects linked/private-file violations and malformed metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "gym4me-verify-test-"));
  const snapshot = join(root, "snapshot"),
    external = join(root, "external");
  const now = Date.now(),
    key = "sports/documents/private.pdf";
  const objectFile = `objects/${createHash("sha256").update(key).digest("hex")}`;
  const ledger = join(root, "ledger.json"),
    manifestFile = join(snapshot, "manifest.json");
  const file = (name) => ({
    file: name,
    size: 7,
    sha256: createHash("sha256").update("fixture").digest("hex"),
  });
  const manifest = {
    version: 1,
    source: "gym4me_stage",
    snapshotAt: new Date(now - 1000).toISOString(),
    files: [file("database.dump"), file(objectFile)],
    objects: [{ key, file: objectFile, contentType: "application/pdf" }],
  };
  const data = {
    version: 1,
    exportedAt: new Date(now).toISOString(),
    entries: [],
  };
  const json = (path, value) =>
    writeFile(path, JSON.stringify(value), { mode: 0o600 });
  try {
    await mkdir(join(snapshot, "objects"), { recursive: true, mode: 0o700 });
    await mkdir(external, { mode: 0o700 });
    await writeFile(join(snapshot, "database.dump"), "fixture", {
      mode: 0o600,
    });
    await writeFile(join(snapshot, objectFile), "fixture", { mode: 0o600 });
    await json(manifestFile, manifest);
    await json(ledger, data);
    await verifySnapshot(snapshot, ledger, now);
    await chmod(manifestFile, 0o644);
    await assert.rejects(verifySnapshot(snapshot, ledger, now), /private/);
    await chmod(manifestFile, 0o600);
    await rm(join(snapshot, "objects"), { recursive: true });
    await writeFile(join(external, objectFile.split("/")[1]), "fixture", {
      mode: 0o600,
    });
    await symlink(external, join(snapshot, "objects"));
    await assert.rejects(verifySnapshot(snapshot, ledger, now), /private/);
    await rm(join(snapshot, "objects"));
    await mkdir(join(snapshot, "objects"), { mode: 0o700 });
    await symlink(
      join(external, objectFile.split("/")[1]),
      join(snapshot, objectFile),
    );
    await assert.rejects(verifySnapshot(snapshot, ledger, now));
    await rm(join(snapshot, objectFile));
    await writeFile(join(snapshot, objectFile), "fixture", { mode: 0o600 });
    for (const value of [
      null,
      { ...manifest, files: [null] },
      { ...manifest, objects: [null] },
      { ...manifest, files: [{ ...file("database.dump"), size: -1 }] },
    ]) {
      await json(manifestFile, value);
      await assert.rejects(verifySnapshot(snapshot, ledger, now), /Invalid/);
    }
    await json(manifestFile, manifest);
    await json(ledger, { ...data, entries: [null] });
    await assert.rejects(verifySnapshot(snapshot, ledger, now), /Invalid/);
    await rm(ledger);
    await symlink(manifestFile, ledger);
    await assert.rejects(verifySnapshot(snapshot, ledger, now));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
