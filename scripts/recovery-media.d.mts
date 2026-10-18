import type { Readable } from "node:stream";
import type { BackupQuery, BackupObject } from "./backup-media.mjs";
export function recoverMedia(options: {
  directory: string;
  ledgerFile: string;
  client: BackupQuery;
  replay: (ledgerFile: string, snapshotAt: string) => Promise<void>;
  upload: (
    object: BackupObject & { size: number },
    stream: Readable,
  ) => Promise<void>;
}): Promise<{
  snapshotAt: string;
  files: number;
  deletions: number;
  restoredObjects: number;
  excludedObjects: number;
}>;
