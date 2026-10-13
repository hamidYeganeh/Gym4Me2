import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ServiceUnavailableException } from '@nestjs/common';
const COST = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
let inFlight = 0;
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  // Bound memory even when requests arrive concurrently from many sources.
  if (inFlight >= 4)
    throw new ServiceUnavailableException('Backend.passwordBusy');
  inFlight++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, 64, COST, (error, key) =>
        error ? reject(error) : resolve(key),
      );
    });
  } finally {
    inFlight--;
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt-v1$${salt.toString('hex')}$${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored?: string) {
  const match = stored?.match(/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/);
  // Unknown accounts perform the same KDF work; no fast account-enumeration path.
  const salt = Buffer.from(
    match?.[1] ?? '00000000000000000000000000000000',
    'hex',
  );
  const expected = Buffer.from(match?.[2] ?? '00'.repeat(64), 'hex');
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, expected) && Boolean(match);
}
