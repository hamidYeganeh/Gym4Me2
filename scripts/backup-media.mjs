import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { lstat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

// Fixed queries only: snapshots from before a feature's migration remain readable.
const sources = new Map([
  [
    "coaching_credentials",
    "SELECT object_key AS key FROM public.coaching_credentials WHERE object_key IS NOT NULL",
  ],
  [
    "club_media",
    "SELECT object_key AS key FROM public.club_media WHERE object_key IS NOT NULL",
  ],
  [
    "sport_service_images",
    "SELECT object_key AS key FROM public.sport_service_images",
  ],
  ["sport_documents", "SELECT object_key AS key FROM public.sport_documents"],
  [
    "sport_messages",
    "SELECT image_key AS key FROM public.sport_messages WHERE image_key IS NOT NULL AND deleted_at IS NULL",
  ],
]);

export async function mediaReferences(client) {
  const available = await client.query(
    "SELECT name FROM unnest($1::text[]) AS name WHERE to_regclass('public.' || name) IS NOT NULL ORDER BY name",
    [[...sources.keys()]],
  );
  const included = available.rows.map(({ name }) => name);
  if (included.some((name) => !sources.has(name)))
    throw new Error("Unknown media source.");
  if (!included.length) return { sources: [], keys: [] };
  const { rows } = await client.query(
    included.map((name) => sources.get(name)).join(" UNION "),
  );
  const keys = new Set();
  for (const { key } of rows) {
    if (typeof key !== "string" || !key.length || Buffer.byteLength(key) > 1024)
      throw new Error(
        "Invalid referenced object key; refusing an incomplete backup.",
      );
    keys.add(key);
  }
  return { sources: included, keys: [...keys].sort() };
}

async function privateDirectory(directory) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stat = await lstat(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.mode & 0o077 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error("Expected private operator-owned backup directory.");
}

export async function saveBackupFile(directory, file, stream) {
  if (!/^(database\.dump|objects\/[0-9a-f]{64})$/.test(file))
    throw new Error("Invalid backup filename.");
  await privateDirectory(directory);
  if (file.startsWith("objects/"))
    await privateDirectory(resolve(directory, "objects"));
  const hash = createHash("sha256");
  let size = 0;
  await pipeline(
    stream,
    new Transform({
      transform(chunk, _encoding, done) {
        hash.update(chunk);
        size += chunk.length;
        done(null, chunk);
      },
    }),
    createWriteStream(resolve(directory, file), { mode: 0o600, flags: "wx" }),
  );
  return { file, size, sha256: hash.digest("hex") };
}

/** Use the same open repeatable-read client as pg_export_snapshot. */
export async function captureMedia(client, loadObject, directory) {
  const references = await mediaReferences(client);
  const files = [],
    objects = [];
  for (const key of references.keys) {
    const object = await loadObject(key);
    if (!object?.Body)
      throw new Error(
        "Missing referenced media; refusing an incomplete backup.",
      );
    const file = `objects/${createHash("sha256").update(key).digest("hex")}`;
    files.push(await saveBackupFile(directory, file, object.Body));
    objects.push({
      key,
      file,
      contentType: object.ContentType ?? "application/octet-stream",
    });
  }
  return { files, objects, mediaSources: references.sources };
}

/** Run after deletion replay, before any upload or reopening the restored API. */
export async function selectRestoreMedia(client, objects) {
  const references = await mediaReferences(client);
  const byKey = new Map();
  for (const object of objects) {
    if (!object || typeof object.key !== "string" || byKey.has(object.key))
      throw new Error("Invalid media manifest.");
    byKey.set(object.key, object);
  }
  if (references.keys.some((key) => !byKey.has(key)))
    throw new Error(
      "Snapshot is missing referenced media; keep restored API offline.",
    );
  // A newer deletion ledger may have removed document/message references.
  return references.keys.map((key) => byKey.get(key));
}
