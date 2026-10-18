import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, mkdir, symlink, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import {
  captureMedia,
  mediaReferences,
  saveBackupFile,
  selectRestoreMedia,
} from "./backup-media.mjs";

const names = [
  "club_media",
  "sport_documents",
  "sport_messages",
  "sport_service_images",
];
function referenceFixture(keys, available = names) {
  const queries = [];
  return {
    queries,
    async query(sql, values) {
      queries.push(sql);
      if (values) return { rows: available.map((name) => ({ name })) };
      return { rows: keys.map((key) => ({ key })) };
    },
  };
}
test("capture includes all feature media, deduplicates references and streams checksummed private files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-media-capture-"));
  const keys = [
    "clubs/test/cover.webp",
    "sports/service-images/test/cover.webp",
    "sports/documents/test/proof.pdf",
    "sports/messages/test/photo.webp",
  ];
  const client = referenceFixture([...keys, keys[0]]);
  const loaded = [];
  try {
    const captured = await captureMedia(
      client,
      async (key) => {
        loaded.push(key);
        return {
          Body: Readable.from([Buffer.from("bytes:"), Buffer.from(key)]),
          ContentType: key.endsWith("pdf") ? "application/pdf" : "image/webp",
        };
      },
      directory,
    );
    assert.deepEqual(captured.mediaSources, names);
    assert.deepEqual(loaded, [...keys].sort());
    assert.equal(captured.objects.length, 4);
    for (const object of captured.objects) {
      assert.equal(
        object.file,
        `objects/${createHash("sha256").update(object.key).digest("hex")}`,
      );
      const bytes = await readFile(join(directory, object.file));
      assert.equal(bytes.toString(), `bytes:${object.key}`);
      const file = captured.files.find((item) => item.file === object.file);
      assert.equal(file.size, bytes.length);
      assert.equal(
        file.sha256,
        createHash("sha256").update(bytes).digest("hex"),
      );
      assert.equal(
        (await stat(join(directory, object.file))).mode & 0o777,
        0o600,
      );
    }
    assert.match(client.queries[1], /public\.sport_service_images/);
    assert.match(client.queries[1], /public\.sport_documents/);
    assert.match(client.queries[1], /deleted_at IS NULL/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("older schemas query only present tables, while bad reference metadata fails closed", async () => {
  const old = referenceFixture(["clubs/old/cover.webp"], ["club_media"]);
  assert.deepEqual(await mediaReferences(old), {
    sources: ["club_media"],
    keys: ["clubs/old/cover.webp"],
  });
  assert.doesNotMatch(old.queries[1], /sport_/);
  assert.deepEqual(await mediaReferences(referenceFixture([], [])), {
    sources: [],
    keys: [],
  });
  await assert.rejects(
    mediaReferences(referenceFixture([""])),
    /Invalid referenced/,
  );
  await assert.rejects(
    mediaReferences(referenceFixture(["x".repeat(1025)])),
    /Invalid referenced/,
  );
});
test("missing objects or failed streams cannot produce successful capture", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-media-missing-"));
  try {
    await assert.rejects(
      captureMedia(referenceFixture(["missing"]), async () => ({}), directory),
      /Missing referenced/,
    );
    await assert.rejects(
      captureMedia(
        referenceFixture(["unreadable"]),
        async () => {
          throw new Error("storage unavailable");
        },
        directory,
      ),
      /storage unavailable/,
    );
    const stream = Readable.from(
      (async function* () {
        yield Buffer.from("partial");
        throw new Error("interrupted object");
      })(),
    );
    await assert.rejects(
      saveBackupFile(directory, "database.dump", stream),
      /interrupted object/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
test("restore selection runs against current references and excludes newer deleted attachments", async () => {
  const objects = [
    { key: "cover", file: "cover-file" },
    { key: "deleted-document", file: "private-file" },
    { key: "deleted-message", file: "message-file" },
  ];
  assert.deepEqual(
    await selectRestoreMedia(referenceFixture(["cover"]), objects),
    [objects[0]],
  );
  await assert.rejects(
    selectRestoreMedia(referenceFixture(["missing"]), objects),
    /keep restored API offline/,
  );
  await assert.rejects(
    selectRestoreMedia(referenceFixture(["cover"]), [objects[0], objects[0]]),
    /Invalid media manifest/,
  );
});
test("capture rejects unsafe paths, public directories and symlinked object directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "gym4me-media-path-"));
  try {
    await assert.rejects(
      saveBackupFile(root, "../outside", Readable.from("bytes")),
      /Invalid backup filename/,
    );
    const publicDir = join(root, "public");
    await mkdir(publicDir, { mode: 0o755 });
    await assert.rejects(
      saveBackupFile(publicDir, "database.dump", Readable.from("bytes")),
      /private operator-owned/,
    );
    const target = join(root, "target");
    await mkdir(target, { mode: 0o700 });
    await symlink(target, join(root, "objects"));
    await assert.rejects(
      saveBackupFile(root, `objects/${"a".repeat(64)}`, Readable.from("bytes")),
      /private operator-owned/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
