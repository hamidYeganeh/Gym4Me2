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
import {
  journalAnchorPath,
  journalRecipientFingerprint,
} from './deletion-journal.anchor';
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
const origin = 'https://journal.private.blob.vercel-storage.com';
const anchor = Buffer.from(
  JSON.stringify({
    version: 1,
    kind: 'gym4me-deletion-journal',
    recipient: journalRecipientFingerprint(publicKey),
  }),
);
const response = (bytes: Buffer) =>
  ({
    statusCode: 200,
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  }) as Awaited<ReturnType<typeof get>>;
const environment = (extra: Record<string, string> = {}) =>
  validateEnvironment({
    DATABASE_URL: 'postgresql://example:example@localhost/example_test',
    NODE_ENV: 'production',
    AUTH_SECRET: 'a'.repeat(32),
    ...extra,
  });
beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(get)
    .mockImplementation((path) =>
      Promise.resolve(
        String(path).endsWith(journalAnchorPath) ? response(anchor) : null,
      ),
    );
});

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
        DELETION_JOURNAL_ORIGIN: origin,
      }),
    ),
  );
  jest.mocked(put).mockRejectedValueOnce(new Error('secret provider response'));
  await expect(
    service.record(record.userId, new Date(record.deletedAt)),
  ).rejects.toThrow('could not acknowledge');
  jest
    .mocked(put)
    .mockResolvedValue({ url: `${origin}/receipt.bin` } as Awaited<
      ReturnType<typeof put>
    >);
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
  const item = {
    pathname,
    url: `${origin}/${pathname}`,
    uploadedAt: new Date(record.deletedAt),
    size: 500,
  };
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
  jest
    .mocked(get)
    .mockImplementation((path) =>
      Promise.resolve(
        response(
          String(path).endsWith(journalAnchorPath)
            ? anchor
            : sealDeletionRecord(record, publicKey),
        ),
      ),
    );
  const ledger = await readIndependentDeletionLedger(
    'private-test-token',
    privateKey,
    origin,
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
        url: `${origin}/missing`,
        size: 500,
        uploadedAt: new Date(record.deletedAt),
      },
    ],
    hasMore: false,
  } as Awaited<ReturnType<typeof list>>);
  await expect(
    readIndependentDeletionLedger('private-test-token', privateKey, origin),
  ).rejects.toThrow('missing');
  jest.mocked(list).mockResolvedValue({
    blobs: [
      {
        pathname: 'future',
        url: `${origin}/future`,
        size: 500,
        uploadedAt: new Date('2999-01-01'),
      },
    ],
    hasMore: false,
  } as Awaited<ReturnType<typeof list>>);
  await expect(
    readIndependentDeletionLedger('private-test-token', privateKey, origin),
  ).rejects.toThrow('still active');
});

test('an empty or incorrect store cannot masquerade as an empty deletion ledger', async () => {
  jest.mocked(list).mockResolvedValue({ blobs: [], hasMore: false });
  jest.mocked(get).mockResolvedValueOnce(null);
  await expect(
    readIndependentDeletionLedger('wrong-store-token', privateKey, origin),
  ).rejects.toThrow('missing');
  expect(list).not.toHaveBeenCalled();
  const wrongKey = generateKeyPairSync('x25519')
    .privateKey.export({ format: 'pem', type: 'pkcs8' })
    .toString();
  await expect(
    readIndependentDeletionLedger('private-test-token', wrongKey, origin),
  ).rejects.toThrow('recipient');
  expect(list).not.toHaveBeenCalled();
});

test('a valid empty journal is accepted only after origin and recipient checks', async () => {
  jest.mocked(list).mockResolvedValue({ blobs: [], hasMore: false });
  expect(
    (
      await readIndependentDeletionLedger(
        'private-test-token',
        privateKey,
        origin,
      )
    ).entries,
  ).toEqual([]);
  await expect(
    readIndependentDeletionLedger(
      'private-test-token',
      privateKey,
      'https://public.blob.vercel-storage.com',
    ),
  ).rejects.toThrow('private journal origin');
});
