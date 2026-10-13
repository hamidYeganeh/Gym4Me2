import { z } from 'zod';

// Export this from the current database BEFORE restoring an older snapshot.
// Keep it outside the backup being restored and only accept operator-owned files.
export const deletionLedgerSchema = z
  .object({
    version: z.literal(1),
    exportedAt: z.iso.datetime(),
    entries: z
      .array(
        z.object({ userId: z.uuid(), deletedAt: z.iso.datetime() }).strict(),
      )
      .max(100000),
  })
  .strict()
  .superRefine((ledger, ctx) => {
    const seen = new Set<string>();
    for (const entry of ledger.entries) {
      if (
        seen.has(entry.userId) ||
        Date.parse(entry.deletedAt) > Date.parse(ledger.exportedAt)
      )
        ctx.addIssue({ code: 'custom', message: 'Invalid deletion ledger.' });
      seen.add(entry.userId);
    }
  });
export type DeletionLedger = z.infer<typeof deletionLedgerSchema>;
