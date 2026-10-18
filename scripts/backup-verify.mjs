import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { resolve, sep } from "node:path";

const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
function privateOwned(stat) {
  return (
    !(stat.mode & 0o077) && (!process.getuid || stat.uid === process.getuid())
  );
}
async function privateDirectory(path) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !privateOwned(stat))
    throw new Error("Expected a private operator-owned recovery directory.");
}
async function privateFile(path) {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || !privateOwned(stat))
      throw new Error("Expected a private operator-owned recovery file.");
    return { handle, stat };
  } catch (error) {
    await handle.close();
    throw error;
  }
}
async function readPrivateJson(path, limit) {
  const { handle, stat } = await privateFile(path);
  try {
    if (stat.size > limit) throw new Error("Recovery metadata is too large.");
    return JSON.parse(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
}

export async function readVerifiedSnapshot(
  directory,
  ledgerFile,
  now = Date.now(),
) {
  await privateDirectory(directory);
  const manifest = await readPrivateJson(
    resolve(directory, "manifest.json"),
    16 * 1024 * 1024,
  );
  const ledger = await readPrivateJson(ledgerFile, 10 * 1024 * 1024);
  if (!record(manifest) || !record(ledger))
    throw new Error("Invalid recovery metadata.");
  const snapshotAt = Date.parse(manifest.snapshotAt),
    exportedAt = Date.parse(ledger.exportedAt);
  if (
    manifest.version !== 1 ||
    manifest.source !== "gym4me_stage" ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.objects) ||
    typeof manifest.snapshotAt !== "string" ||
    typeof ledger.exportedAt !== "string" ||
    !Number.isFinite(snapshotAt) ||
    !Number.isFinite(exportedAt) ||
    exportedAt < snapshotAt ||
    exportedAt > now ||
    ledger.version !== 1 ||
    !Array.isArray(ledger.entries)
  )
    throw new Error(
      "Invalid snapshot or stale deletion ledger; keep restored API offline.",
    );
  // A current mirror is mandatory. Older mirrors require an operator to recover
  // the latest authoritative ledger, not silently waive deletion replay.
  if (now - exportedAt > 10 * 60 * 1000)
    throw new Error(
      "Deletion mirror is older than its ten-minute recovery window.",
    );
  const seen = new Set();
  for (const entry of ledger.entries) {
    if (
      !record(entry) ||
      typeof entry.userId !== "string" ||
      typeof entry.deletedAt !== "string" ||
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(entry.userId) ||
      seen.has(entry.userId) ||
      !Number.isFinite(Date.parse(entry.deletedAt)) ||
      Date.parse(entry.deletedAt) > exportedAt
    )
      throw new Error("Invalid deletion ledger.");
    seen.add(entry.userId);
  }
  const names = new Set();
  if (manifest.objects.length)
    await privateDirectory(resolve(directory, "objects"));
  for (const file of manifest.files) {
    if (
      !record(file) ||
      typeof file.file !== "string" ||
      !Number.isSafeInteger(file.size) ||
      file.size < 0 ||
      typeof file.sha256 !== "string" ||
      !/^(database\.dump|objects\/[0-9a-f]{64})$/.test(file.file) ||
      names.has(file.file) ||
      !/^[0-9a-f]{64}$/.test(file.sha256)
    )
      throw new Error("Invalid file manifest.");
    const path = resolve(directory, file.file);
    if (!path.startsWith(resolve(directory) + sep))
      throw new Error("Invalid snapshot path.");
    const { handle, stat } = await privateFile(path);
    try {
      if (stat.size !== file.size)
        throw new Error("Missing or changed backup file.");
      const hash = createHash("sha256");
      for await (const chunk of handle.createReadStream({ autoClose: false }))
        hash.update(chunk);
      if (hash.digest("hex") !== file.sha256)
        throw new Error("Backup checksum mismatch.");
    } finally {
      await handle.close();
    }
    names.add(file.file);
  }
  if (!names.has("database.dump")) throw new Error("Missing database dump.");
  const keys = new Set();
  for (const object of manifest.objects) {
    if (
      !record(object) ||
      typeof object.key !== "string" ||
      !object.key ||
      Buffer.byteLength(object.key) > 1024 ||
      typeof object.contentType !== "string" ||
      !object.contentType ||
      /[\r\n]/.test(object.contentType) ||
      keys.has(object.key) ||
      !names.has(object.file) ||
      object.file !==
        `objects/${createHash("sha256").update(object.key).digest("hex")}`
    )
      throw new Error("Invalid media manifest.");
    keys.add(object.key);
  }
  if (names.size !== manifest.objects.length + 1)
    throw new Error("Unmapped backup files.");
  const summary = {
    snapshotAt: manifest.snapshotAt,
    files: names.size,
    deletions: seen.size,
  };
  return { manifest, summary };
}

export async function verifySnapshot(directory, ledgerFile, now = Date.now()) {
  return (await readVerifiedSnapshot(directory, ledgerFile, now)).summary;
}
