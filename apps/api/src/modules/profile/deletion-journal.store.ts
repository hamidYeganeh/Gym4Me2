import { get, list } from '@vercel/blob';
import { deletionLedgerSchema } from './deletion-ledger';
import {
  deletionJournalPrefix,
  deletionRecordPrefix,
  openDeletionRecord,
} from './deletion-journal.crypto';

/** Call only after stopping origin writes and draining in-flight retention work. */
export async function readIndependentDeletionLedger(
  token: string,
  privateKey: string,
  capturedAt = new Date(),
) {
  const entries = new Map<string, string>();
  let cursor: string | undefined;
  let scanned = 0;
  do {
    const page = await list({
      prefix: deletionJournalPrefix,
      cursor,
      limit: 1000,
      token,
    });
    for (const item of page.blobs) {
      if (
        ++scanned > 100000 ||
        item.size > 16384 ||
        item.uploadedAt > capturedAt
      )
        throw new Error(
          'Journal exceeds limits or origin writes are still active.',
        );
      const blob = await get(item.pathname, {
        access: 'private',
        useCache: false,
        token,
        abortSignal: AbortSignal.timeout(10000),
      });
      if (!blob || blob.statusCode !== 200)
        throw new Error('An independent deletion receipt is missing.');
      const reader = blob.stream.getReader();
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for (;;) {
          const result = await reader.read();
          if (result.done) break;
          size += result.value.byteLength;
          if (size > 16384) throw new Error('Oversized deletion receipt.');
          chunks.push(Buffer.from(result.value));
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
      const record = openDeletionRecord(Buffer.concat(chunks), privateKey);
      if (
        !item.pathname.startsWith(deletionRecordPrefix(record.userId)) ||
        Date.parse(record.deletedAt) > capturedAt.getTime()
      )
        throw new Error(
          'Deletion receipt does not match its identity or capture time.',
        );
      const previous = entries.get(record.userId);
      if (!previous || Date.parse(record.deletedAt) < Date.parse(previous))
        entries.set(record.userId, record.deletedAt);
    }
    if (page.hasMore && (!page.cursor || page.cursor === cursor))
      throw new Error('Invalid deletion journal pagination.');
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return deletionLedgerSchema.parse({
    version: 1,
    exportedAt: capturedAt.toISOString(),
    entries: [...entries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([userId, deletedAt]) => ({ userId, deletedAt })),
  });
}
