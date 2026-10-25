import { get } from '@vercel/blob';
import { createHash, createPublicKey } from 'node:crypto';
import { z } from 'zod';

export const journalAnchorPath = 'gym4me-deletions/manifest.json';
export const journalRecipientFingerprint = (key: string) =>
  createHash('sha256')
    .update(createPublicKey(key).export({ format: 'der', type: 'spki' }))
    .digest('hex');
export function journalOrigin(input: string) {
  const url = new URL(input);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.private.blob.vercel-storage.com') ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('Expected the configured private journal origin.');
  return url.origin;
}

export async function readPrivateJournalObject(
  path: string,
  token: string,
  maximum = 16384,
) {
  const blob = await get(path, {
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
      if (size > maximum) throw new Error('Oversized deletion receipt.');
      chunks.push(Buffer.from(result.value));
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

export async function verifyJournalAnchor(
  token: string,
  key: string,
  expectedOrigin: string,
) {
  const origin = journalOrigin(expectedOrigin);
  const bytes = await readPrivateJournalObject(
    `${origin}/${journalAnchorPath}`,
    token,
    2048,
  );
  const anchor = z
    .object({
      version: z.literal(1),
      kind: z.literal('gym4me-deletion-journal'),
      recipient: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict()
    .parse(JSON.parse(bytes.toString()) as unknown);
  if (anchor.recipient !== journalRecipientFingerprint(key))
    throw new Error('The independent journal recipient does not match.');
  return origin;
}
