import { deletionLedgerSchema } from './deletion-ledger';
const entry = {
  userId: 'a1371011-b828-4038-86e2-e7d4f6c14e74',
  deletedAt: '2026-10-12T00:00:00.000Z',
};
const ledger = {
  version: 1,
  exportedAt: '2026-10-13T00:00:00.000Z',
  entries: [entry],
};
it('accepts opaque identities and timestamps, rejecting extra private data', () => {
  expect(deletionLedgerSchema.safeParse(ledger).success).toBe(true);
  expect(
    deletionLedgerSchema.safeParse({
      ...ledger,
      entries: [{ ...entry, phone: 'private' }],
    }).success,
  ).toBe(false);
});
it('rejects duplicate or malformed identities and deletions beyond its watermark', () => {
  expect(
    deletionLedgerSchema.safeParse({ ...ledger, entries: [entry, entry] })
      .success,
  ).toBe(false);
  expect(
    deletionLedgerSchema.safeParse({
      ...ledger,
      entries: [{ ...entry, userId: 'invalid' }],
    }).success,
  ).toBe(false);
  expect(
    deletionLedgerSchema.safeParse({
      ...ledger,
      exportedAt: '2026-10-11T00:00:00.000Z',
    }).success,
  ).toBe(false);
});
