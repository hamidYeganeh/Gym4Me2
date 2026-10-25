import { list } from '@vercel/blob';
import {
  readPrivateJournalObject,
  verifyJournalAnchor,
} from './deletion-journal.anchor';
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
  expectedOrigin: string,
  capturedAt = new Date(),
) {
  const origin = await verifyJournalAnchor(token, privateKey, expectedOrigin);
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
      if (new URL(item.url).origin !== origin)
        throw new Error('Unexpected journal store.');
      if (
        ++scanned > 100000 ||
        item.size > 16384 ||
        item.uploadedAt > capturedAt
      )
        throw new Error(
          'Journal exceeds limits or origin writes are still active.',
        );
      const record = openDeletionRecord(
        await readPrivateJournalObject(item.url, token),
        privateKey,
      );
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
