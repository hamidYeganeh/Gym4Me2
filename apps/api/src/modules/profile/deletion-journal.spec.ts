import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { put, get, list } from '@vercel/blob';
import { ConfigService } from '@nestjs/config';
import { validateEnvironment } from '../../config/environment';
import { DeletionJournalService } from './deletion-journal.service';
import {
  deletionRecordPrefix,
  openDeletionRecord,
  sealDeletionRecord,
} from './deletion-journal.crypto';
import { readIndependentDeletionLedger } from './deletion-journal.store';
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
  get: jest.fn(),
  list: jest.fn(),
}));
const pair = generateKeyPairSync('x25519');
const publicKey = pair.publicKey
  .export({ format: 'pem', type: 'spki' })
  .toString();
const privateKey = pair.privateKey
  .export({ format: 'pem', type: 'pkcs8' })
  .toString();
const record = {
  version: 1 as const,
  userId: randomUUID(),
  deletedAt: '2026-01-01T00:00:00.000Z',
};
const environment = (extra: Record<string, string> = {}) =>
  validateEnvironment({
    DATABASE_URL: 'postgresql://example:example@localhost/example_test',
    NODE_ENV: 'production',
    AUTH_SECRET: 'a'.repeat(32),
    ...extra,
  });
beforeEach(() => jest.resetAllMocks());

test('seals only the opaque deletion receipt and authenticates ciphertext, recipient and purpose', () => {
  const bytes = sealDeletionRecord(record, publicKey);
  expect(bytes.includes(Buffer.from(record.userId))).toBe(false);
  expect(openDeletionRecord(bytes, privateKey)).toEqual(record);
  const changed = Buffer.from(bytes);
  changed[changed.length - 17] ^= 1;
  expect(() => openDeletionRecord(changed, privateKey)).toThrow();
  const another = generateKeyPairSync('x25519')
    .privateKey.export({ format: 'pem', type: 'pkcs8' })
    .toString();
  expect(() => openDeletionRecord(bytes, another)).toThrow();
});

test('production deletion fails closed without an independent journal', async () => {
  const service = new DeletionJournalService(new ConfigService(environment()));
  await expect(
    service.record(record.userId, new Date(record.deletedAt)),
  ).rejects.toThrow('not configured');
  expect(put).not.toHaveBeenCalled();
});

test('requires a private acknowledgement, appends retries and conceals provider failures', async () => {
  const service = new DeletionJournalService(
    new ConfigService(
      environment({
        DELETION_JOURNAL_PROVIDER: 'vercel-blob',
        DELETION_JOURNAL_RECIPIENT_KEY: publicKey,
        BLOB_READ_WRITE_TOKEN: 'private-test-token',
      }),
    ),
  );
  jest.mocked(put).mockRejectedValueOnce(new Error('secret provider response'));
  await expect(
    service.record(record.userId, new Date(record.deletedAt)),
  ).rejects.toThrow('could not acknowledge');
  jest.mocked(put).mockResolvedValue({} as Awaited<ReturnType<typeof put>>);
  await service.record(record.userId, new Date(record.deletedAt));
  const calls = jest.mocked(put).mock.calls;
  expect(calls[0][0]).not.toBe(calls[1][0]);
  expect(calls[1][2]).toMatchObject({
    access: 'private',
    allowOverwrite: false,
    addRandomSuffix: false,
  });
});

test('recovery independently reads every page, authenticates and deduplicates retried receipts', async () => {
  const pathname = `${deletionRecordPrefix(record.userId)}${randomUUID()}.bin`;
  const item = { pathname, uploadedAt: new Date(record.deletedAt), size: 500 };
  jest
    .mocked(list)
    .mockResolvedValueOnce({
      blobs: [item],
      hasMore: true,
      cursor: 'second',
    } as Awaited<ReturnType<typeof list>>)
    .mockResolvedValueOnce({ blobs: [item], hasMore: false } as Awaited<
      ReturnType<typeof list>
    >);
  jest.mocked(get).mockImplementation(() =>
    Promise.resolve({
      statusCode: 200,
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue(sealDeletionRecord(record, publicKey));
          controller.close();
        },
      }),
    } as Awaited<ReturnType<typeof get>>),
  );
  const ledger = await readIndependentDeletionLedger(
    'private-test-token',
    privateKey,
    new Date('2026-01-02T00:00:00Z'),
  );
  expect(ledger.entries).toEqual([
    { userId: record.userId, deletedAt: record.deletedAt },
  ]);
  expect(jest.mocked(get).mock.calls[0][1]).toMatchObject({
    useCache: false,
    access: 'private',
  });
});

test('recovery refuses missing receipts and active origin writes', async () => {
  jest.mocked(list).mockResolvedValue({
    blobs: [
      {
        pathname: 'missing',
        size: 500,
        uploadedAt: new Date(record.deletedAt),
      },
    ],
    hasMore: false,
  } as Awaited<ReturnType<typeof list>>);
  jest.mocked(get).mockResolvedValue(null);
  await expect(
    readIndependentDeletionLedger('private-test-token', privateKey),
  ).rejects.toThrow('missing');
  jest.mocked(list).mockResolvedValue({
    blobs: [
      { pathname: 'future', size: 500, uploadedAt: new Date('2999-01-01') },
    ],
    hasMore: false,
  } as Awaited<ReturnType<typeof list>>);
  await expect(
    readIndependentDeletionLedger('private-test-token', privateKey),
  ).rejects.toThrow('still active');
});
