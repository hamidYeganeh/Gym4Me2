import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { z } from 'zod';

export const deletionRecordSchema = z
  .object({
    version: z.literal(1),
    userId: z.uuid(),
    deletedAt: z.iso.datetime(),
  })
  .strict();
export type DeletionRecord = z.infer<typeof deletionRecordSchema>;
export const deletionJournalPrefix = 'gym4me-deletions/v1/';
export const deletionRecordPrefix = (userId: string) =>
  `${deletionJournalPrefix}${createHash('sha256').update(userId).digest('hex')}/`;
const context = Buffer.from('gym4me-deletion-journal-v1');
const derive = (
  privateKey: ReturnType<typeof createPrivateKey>,
  publicKey: ReturnType<typeof createPublicKey>,
) =>
  Buffer.from(
    hkdfSync(
      'sha256',
      diffieHellman({ privateKey, publicKey }),
      Buffer.alloc(0),
      context,
      32,
    ),
  );

export function sealDeletionRecord(input: DeletionRecord, recipient: string) {
  const record = deletionRecordSchema.parse(input);
  const pair = generateKeyPairSync('x25519');
  const publicKey = createPublicKey(recipient);
  if (publicKey.asymmetricKeyType !== 'x25519')
    throw new Error('Deletion journal requires an X25519 recipient.');
  const nonce = randomBytes(12);
  const header = Buffer.from(
    JSON.stringify({
      version: 1,
      purpose: 'deletion-journal',
      key: pair.publicKey.export({ format: 'jwk' }),
      nonce: nonce.toString('base64url'),
    }) + '\n',
  );
  const cipher = createCipheriv(
    'aes-256-gcm',
    derive(pair.privateKey, publicKey),
    nonce,
  );
  cipher.setAAD(header);
  return Buffer.concat([
    header,
    cipher.update(JSON.stringify(record)),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
}

export function openDeletionRecord(bytes: Buffer, recipient: string) {
  const split = bytes.indexOf(10);
  if (bytes.length > 16384 || split < 0 || split > 4096)
    throw new Error('Invalid deletion journal envelope.');
  const header = bytes.subarray(0, split + 1);
  const metadata = z
    .object({
      version: z.literal(1),
      purpose: z.literal('deletion-journal'),
      key: z.object({
        kty: z.literal('OKP'),
        crv: z.literal('X25519'),
        x: z.string(),
      }),
      nonce: z.string().regex(/^[A-Za-z0-9_-]{16}$/),
    })
    .strict()
    .parse(JSON.parse(header.toString()) as unknown);
  const key = createPrivateKey(recipient);
  if (key.asymmetricKeyType !== 'x25519' || bytes.length < split + 18)
    throw new Error('Invalid deletion journal key or payload.');
  const decipher = createDecipheriv(
    'aes-256-gcm',
    derive(key, createPublicKey({ key: metadata.key, format: 'jwk' })),
    Buffer.from(metadata.nonce, 'base64url'),
  );
  decipher.setAAD(header);
  decipher.setAuthTag(bytes.subarray(-16));
  return deletionRecordSchema.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(split + 1, -16)),
        decipher.final(),
      ]).toString(),
    ) as unknown,
  );
}
