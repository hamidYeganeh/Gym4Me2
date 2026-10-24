import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'node:crypto';
import { AuthService } from './auth.service';
import type { KavenegarService } from './kavenegar.service';
import type { DatabaseService } from '../../database/database.service';
import { authRateLimits, otpChallenges } from '../../database/schema';
import {
  validateEnvironment,
  type Environment,
} from '../../config/environment';

const secret = 'test-only-auth-secret-not-a-real-credential';
const phone = '+989123456789';
const config = () =>
  new ConfigService<Environment, true>(
    validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/test',
      AUTH_SECRET: secret,
      DEMO_MODE: 'true',
      SMS_PROVIDER: 'kavenegar',
      KAVENEGAR_API_KEY: 'testkey',
    }),
  );

test('live SMS in a payment demo sends a random challenge for an unseeded real number', async () => {
  let challenge: Record<string, unknown> | undefined;
  const tx = {
    execute: jest.fn().mockResolvedValue({ rows: [] }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: () => Promise.resolve([]) }),
        }),
      }),
    }),
    update: () => ({
      set: () => ({ where: () => Promise.resolve(undefined) }),
    }),
    insert: (table: unknown) => {
      if (table === authRateLimits)
        return {
          values: () => ({
            onConflictDoUpdate: () => ({
              returning: () => Promise.resolve([{ count: 1 }]),
            }),
          }),
        };
      expect(table).toBe(otpChallenges);
      return {
        values: (value: Record<string, unknown>) => {
          challenge = value;
          return Promise.resolve();
        },
      };
    },
  };
  const db = {
    execute: jest.fn(),
    transaction: async (run: (transaction: typeof tx) => Promise<unknown>) =>
      run(tx),
    update: tx.update,
  };
  const sendOtp = jest.fn().mockResolvedValue(undefined);
  const auth = new AuthService({ db } as unknown as DatabaseService, config(), {
    sendOtp,
  } as unknown as KavenegarService);
  const result = await auth.requestOtp(phone, 'application', '127.0.0.1');
  expect(db.execute).not.toHaveBeenCalled(); // No seeded-account lookup or fake delivery.
  expect(sendOtp).toHaveBeenCalledTimes(1);
  const [recipient, code] = sendOtp.mock.calls[0] as [string, string];
  expect(recipient).toBe(phone);
  expect(code).toMatch(/^\d{5}$/);
  expect(challenge?.codeHash).toBe(
    createHmac('sha256', secret)
      .update(`otp:kavenegar:${result.challengeId}:${code}`)
      .digest('hex'),
  );
  expect(result.challengeId).toMatch(/^[0-9a-f-]{36}$/);
  expect(result.expiresIn).toBe(120);
  expect(result.retryAfter).toBe(60);
  expect(result).not.toHaveProperty('code');
});

test.each(['legacy', 'demo'])(
  '%s challenges cannot be used after live-SMS activation',
  async (mode) => {
    const id = randomUUID();
    const challenge = {
      id,
      client: 'application',
      transport: 'web',
      purpose: 'sign-in',
      sentAt: new Date(Date.now() - 1000),
      expiresAt: new Date(Date.now() + 120000),
      consumedAt: null,
      attempts: 0,
      codeHash: createHmac('sha256', secret)
        .update(mode === 'legacy' ? `${id}:11111` : `otp:demo:${id}:11111`)
        .digest('hex'),
    };
    const tx = {
      select: () => ({
        from: () => ({
          where: () => ({ for: () => Promise.resolve([challenge]) }),
        }),
      }),
      update: () => ({
        set: () => ({ where: () => Promise.resolve(undefined) }),
      }),
      insert: jest.fn(),
    };
    const auth = new AuthService(
      {
        db: {
          transaction: async (
            run: (transaction: typeof tx) => Promise<unknown>,
          ) => run(tx),
        },
      } as unknown as DatabaseService,
      config(),
      { sendOtp: jest.fn() } as unknown as KavenegarService,
    );
    await expect(
      auth.verifyOtp(id, '11111', 'application', 'test'),
    ).rejects.toThrow('Backend.theCodeIsIncorrectOrExpired');
    expect(tx.insert).not.toHaveBeenCalled();
  },
);
