import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import { readVerifiedSnapshot } from "./backup-verify.mjs";
import { selectRestoreMedia } from "./backup-media.mjs";

/** The destination database must already be restored and remain offline. */
export async function recoverMedia({
  directory,
  ledgerFile,
  client,
  replay,
  upload,
}) {
  const { manifest, summary } = await readVerifiedSnapshot(
    directory,
    ledgerFile,
    Date.now(),
  );
  // Do not upload even one object until the current trusted ledger has been applied.
  await replay(ledgerFile, summary.snapshotAt);
  const allowed = await selectRestoreMedia(client, manifest.objects);
  const files = new Map(manifest.files.map((file) => [file.file, file]));
  for (const object of allowed) {
    const file = files.get(object.file);
    const stream = createReadStream(resolve(directory, object.file));
    try {
      await upload({ ...object, size: file.size }, stream);
    } finally {
      stream.destroy();
    }
  }
  return {
    ...summary,
    restoredObjects: allowed.length,
    excludedObjects: manifest.objects.length - allowed.length,
  };
}
