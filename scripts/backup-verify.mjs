import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export async function verifySnapshot(directory, ledgerFile, now = Date.now()) {
  const manifest = JSON.parse(
    await readFile(resolve(directory, "manifest.json"), "utf8"),
  );
  const ledger = JSON.parse(await readFile(ledgerFile, "utf8"));
  const snapshotAt = Date.parse(manifest.snapshotAt),
    exportedAt = Date.parse(ledger.exportedAt);
  if (
    manifest.version !== 1 ||
    manifest.source !== "gym4me_stage" ||
    !Array.isArray(manifest.files) ||
    !Array.isArray(manifest.objects) ||
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
      !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(entry.userId) ||
      seen.has(entry.userId) ||
      !Number.isFinite(Date.parse(entry.deletedAt)) ||
      Date.parse(entry.deletedAt) > exportedAt
    )
      throw new Error("Invalid deletion ledger.");
    seen.add(entry.userId);
  }
  const names = new Set();
  for (const file of manifest.files) {
    if (
      typeof file.file !== "string" ||
      !/^(database\.dump|objects\/[0-9a-f]{64})$/.test(file.file) ||
      names.has(file.file) ||
      !/^[0-9a-f]{64}$/.test(file.sha256)
    )
      throw new Error("Invalid file manifest.");
    const path = resolve(directory, file.file);
    if (!path.startsWith(resolve(directory) + sep))
      throw new Error("Invalid snapshot path.");
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.size)
      throw new Error("Missing or changed backup file.");
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    if (hash.digest("hex") !== file.sha256)
      throw new Error("Backup checksum mismatch.");
    names.add(file.file);
  }
  if (!names.has("database.dump")) throw new Error("Missing database dump.");
  const keys = new Set();
  for (const object of manifest.objects) {
    if (
      typeof object.key !== "string" ||
      !object.key ||
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
  return {
    snapshotAt: manifest.snapshotAt,
    files: names.size,
    deletions: seen.size,
  };
}
