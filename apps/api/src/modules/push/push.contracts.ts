import { createECDH } from 'node:crypto';
import { z } from 'zod';

/** Exact browser-vendor hosts only; never fetch a caller-selected arbitrary URL. */
export function allowedPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      ((url.hostname === 'fcm.googleapis.com' &&
        /^\/(?:fcm|wp)\//.test(url.pathname)) ||
        (url.hostname === 'updates.push.services.mozilla.com' &&
          url.pathname.startsWith('/wpush/')) ||
        (url.hostname === 'web.push.apple.com' &&
          url.pathname.startsWith('/')) ||
        (/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname) &&
          url.pathname.startsWith('/')))
    );
  } catch {
    return false;
  }
}
const base64 = (length: number) =>
  z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine((value) => {
      const bytes = Buffer.from(value, 'base64url');
      return bytes.length === length && bytes.toString('base64url') === value;
    });
export const subscriptionSchema = z
  .object({
    endpoint: z.string().max(2048).refine(allowedPushEndpoint),
    keys: z
      .object({
        p256dh: base64(65).refine((value) => {
          try {
            const point = Buffer.from(value, 'base64url');
            if (point[0] !== 4) return false;
            const curve = createECDH('prime256v1');
            curve.generateKeys();
            curve.computeSecret(point);
            return true;
          } catch {
            return false;
          }
        }),
        auth: base64(16),
      })
      .strict(),
    locale: z.enum(['fa', 'en']),
  })
  .strict();
export type PushSubscriptionInput = z.infer<typeof subscriptionSchema>;

export function validVapidPair(publicKey: string, privateKey: string) {
  try {
    const key = createECDH('prime256v1');
    key.setPrivateKey(Buffer.from(privateKey, 'base64url'));
    return key.getPublicKey().toString('base64url') === publicKey;
  } catch {
    return false;
  }
}
