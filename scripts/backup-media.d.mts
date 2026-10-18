import type { Readable } from "node:stream";

export interface BackupQuery {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}
export interface BackupFile {
  file: string;
  size: number;
  sha256: string;
}
export interface BackupObject {
  key: string;
  file: string;
  contentType: string;
}
export function mediaReferences(
  client: BackupQuery,
): Promise<{ sources: string[]; keys: string[] }>;
export function saveBackupFile(
  directory: string,
  file: string,
  stream:
    | Readable
    | Iterable<string | Uint8Array>
    | AsyncIterable<string | Uint8Array>,
): Promise<BackupFile>;
export function captureMedia(
  client: BackupQuery,
  loadObject: (
    key: string,
  ) => Promise<{ Body?: unknown; ContentType?: string }>,
  directory: string,
): Promise<{
  files: BackupFile[];
  objects: BackupObject[];
  mediaSources: string[];
}>;
export function selectRestoreMedia<T extends { key: string }>(
  client: BackupQuery,
  objects: readonly T[],
): Promise<T[]>;
