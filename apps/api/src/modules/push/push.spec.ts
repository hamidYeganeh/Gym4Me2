import { authorizedPushJob } from './push-jobs.controller';
import { createECDH } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import {
  allowedPushEndpoint,
  subscriptionSchema,
  validVapidPair,
} from './push.contracts';
import { WebPushSender, pushOutcome } from './push.sender';
import {
  validateEnvironment,
  type Environment,
} from '../../config/environment';

const keys = webpush.generateVAPIDKeys();
const curve = createECDH('prime256v1');
curve.generateKeys();
const target = {
  id: 'a1000000-0000-4000-8000-000000000001',
  locale: 'fa',
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  p256dh: curve.getPublicKey().toString('base64url'),
  auth: Buffer.alloc(16, 1).toString('base64url'),
};
describe('Web Push trust and delivery', () => {
  it('fails closed for missing or incorrect background-job authorization', () => {
    const secret = 's'.repeat(64);
    expect(authorizedPushJob('Bearer ' + secret, secret)).toBe(true);
    for (const header of [undefined, '', 'Bearer wrong', secret])
      expect(authorizedPushJob(header, secret)).toBe(false);
    expect(authorizedPushJob('Bearer undefined', undefined)).toBe(false);
  });
  it('accepts browser vendors and rejects arbitrary destinations, credentials and lookalikes', () => {
    for (const url of [
      target.endpoint,
      'https://updates.push.services.mozilla.com/wpush/v2/test',
      'https://web.push.apple.com/test',
      'https://wns2-x.notify.windows.com/test',
    ])
      expect(allowedPushEndpoint(url)).toBe(true);
    for (const url of [
      'http://fcm.googleapis.com/fcm/test',
      'https://localhost/test',
      'https://127.0.0.1/fcm/send/x',
      'https://fcm.googleapis.com.evil.test/fcm/x',
      'https://example.com',
      'https://user@fcm.googleapis.com/fcm/test',
      'https://fcm.googleapis.com:444/fcm/test',
      'https://fcm.googleapis.com/fcm/test#fragment',
    ])
      expect(allowedPushEndpoint(url)).toBe(false);
  });
  it('validates real curve points and fixed-length canonical subscription keys', () => {
    const input = {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
      locale: 'fa',
    };
    expect(subscriptionSchema.safeParse(input).success).toBe(true);
    expect(
      subscriptionSchema.safeParse({
        ...input,
        keys: { ...input.keys, p256dh: Buffer.alloc(65).toString('base64url') },
      }).success,
    ).toBe(false);
    expect(
      subscriptionSchema.safeParse({
        ...input,
        keys: { ...input.keys, auth: 'short' },
      }).success,
    ).toBe(false);
    expect(
      subscriptionSchema.safeParse({ ...input, userId: target.id }).success,
    ).toBe(false);
  });
  it('requires explicit activation and matching server VAPID keys without leaking them', () => {
    const base = { DATABASE_URL: 'postgresql://test:test@localhost/test' };
    expect(validateEnvironment(base).PUSH_PROVIDER).toBe('disabled');
    expect(() =>
      validateEnvironment({ ...base, PUSH_PROVIDER: 'web-push' }),
    ).toThrow('WEB_PUSH');
    expect(validVapidPair(keys.publicKey, keys.privateKey)).toBe(true);
    expect(
      validVapidPair(keys.publicKey, webpush.generateVAPIDKeys().privateKey),
    ).toBe(false);
    expect(() =>
      validateEnvironment({
        ...base,
        PUSH_PROVIDER: 'web-push',
        WEB_PUSH_PUBLIC_KEY: keys.publicKey,
        WEB_PUSH_PRIVATE_KEY: keys.privateKey,
        WEB_PUSH_SUBJECT: 'http://localhost',
      }),
    ).toThrow('WEB_PUSH');
  });
  it('encrypts an authenticated vendor request and sends only opaque device/notice IDs', async () => {
    const config = new ConfigService<Environment, true>(
      validateEnvironment({
        DATABASE_URL: 'postgresql://test:test@localhost/test',
        PUSH_PROVIDER: 'web-push',
        WEB_PUSH_PUBLIC_KEY: keys.publicKey,
        WEB_PUSH_PRIVATE_KEY: keys.privateKey,
      }),
    );
    const send = jest
      .spyOn(webpush, 'sendNotification')
      .mockImplementation((subscription, payload, options) => {
        expect(subscription.endpoint).toBe(target.endpoint);
        const body = JSON.parse(String(payload)) as Record<string, unknown>;
        expect(Object.keys(body).sort()).toEqual([
          'bindingId',
          'locale',
          'notificationId',
          'version',
        ]);
        const request = webpush.generateRequestDetails(
          subscription,
          String(payload),
          options,
        );
        expect(request.headers['Content-Encoding']).toBe('aes128gcm');
        expect(request.headers.Authorization).toMatch(/^vapid /);
        expect(Buffer.isBuffer(request.body)).toBe(true);
        expect(request.body?.includes(Buffer.from(String(payload)))).toBe(
          false,
        );
        return Promise.resolve({ statusCode: 201, body: '', headers: {} });
      });
    try {
      expect(await new WebPushSender(config).send(target, target.id)).toBe(
        'accepted',
      );
      expect(send).toHaveBeenCalledTimes(1);
    } finally {
      send.mockRestore();
    }
  });
  it('retires missing subscriptions and retries only transient failures', () => {
    for (const statusCode of [404, 410])
      expect(pushOutcome({ statusCode })).toBe('expired');
    for (const error of [
      new Error('connection'),
      { statusCode: 429 },
      { statusCode: 503 },
    ])
      expect(pushOutcome(error)).toBe('retry');
    expect(pushOutcome({ statusCode: 401 })).toBe('failed');
    expect(pushOutcome({ statusCode: 400 })).toBe('failed');
  });
});
