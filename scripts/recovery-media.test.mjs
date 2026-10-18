import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { recoverMedia } from "./recovery-media.mjs";

test("recovery verifies first, replays deletions before uploads, and fails closed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-recovery-gate-"));
  const file = (name) => ({
    file: name,
    size: 7,
    sha256: createHash("sha256").update("fixture").digest("hex"),
  });
  const objects = ["sports/cover.webp", "sports/documents/deleted.pdf"].map(
    (key) => ({
      key,
      file: `objects/${createHash("sha256").update(key).digest("hex")}`,
      contentType: "application/octet-stream",
    }),
  );
  const snapshotAt = new Date(Date.now() - 1000).toISOString();
  const manifest = {
    version: 1,
    source: "gym4me_stage",
    snapshotAt,
    files: [
      file("database.dump"),
      ...objects.map((object) => file(object.file)),
    ],
    objects,
  };
  const ledgerFile = join(directory, "ledger.json"),
    events = [];
  let keys = objects.map((object) => object.key);
  const json = (name, data) =>
    writeFile(join(directory, name), JSON.stringify(data), { mode: 0o600 });
  const client = {
    query(sql) {
      if (sql.includes("to_regclass"))
        return Promise.resolve({
          rows: [{ name: "sport_documents" }, { name: "sport_service_images" }],
        });
      events.push("references");
      return Promise.resolve({ rows: keys.map((key) => ({ key })) });
    },
  };
  const replay = (file, at) => {
    assert.equal(file, ledgerFile);
    assert.equal(at, snapshotAt);
    events.push("replay");
    keys = [objects[0].key];
    return Promise.resolve();
  };
  const upload = async (object, stream) => {
    events.push(`upload:${object.key}`);
    assert.equal(object.size, 7);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).toString(), "fixture");
  };
  const options = { directory, ledgerFile, client, replay, upload };
  try {
    await mkdir(join(directory, "objects"), { mode: 0o700 });
    for (const entry of manifest.files)
      await writeFile(join(directory, entry.file), "fixture", { mode: 0o600 });
    await json("manifest.json", manifest);
    await json("ledger.json", {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries: [],
    });
    assert.deepEqual(await recoverMedia(options), {
      snapshotAt,
      files: 3,
      deletions: 0,
      restoredObjects: 1,
      excludedObjects: 1,
    });
    assert.deepEqual(events, [
      "replay",
      "references",
      `upload:${objects[0].key}`,
    ]);
    events.length = 0;
    await assert.rejects(
      recoverMedia({
        ...options,
        replay: () => Promise.reject(new Error("replay failed")),
      }),
      /replay failed/,
    );
    assert.deepEqual(events, []);
    await assert.rejects(
      recoverMedia({
        ...options,
        replay: () => {
          events.push("replay");
          keys = ["missing-key"];
          return Promise.resolve();
        },
      }),
      /missing referenced media/,
    );
    assert.deepEqual(events, ["replay", "references"]);
    events.length = 0;
    await writeFile(join(directory, "database.dump"), "changed");
    await assert.rejects(recoverMedia(options), /checksum/);
    assert.deepEqual(events, []);
    await writeFile(join(directory, "database.dump"), "fixture");
    await json("ledger.json", {
      version: 1,
      exportedAt: new Date(Date.now() - 11 * 60000).toISOString(),
      entries: [],
    });
    await assert.rejects(recoverMedia(options), /stale|older/);
    assert.deepEqual(events, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
