import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { configureApi } from '../../platform/http/configure-api';
import { CommerceService } from './commerce.service';
import { SportsPaymentCallbacksController } from './commerce.controller';

let app: INestApplication;
const callback = jest
  .fn()
  .mockResolvedValue('e65f4488-eec9-4768-a30f-918ab23bc953');
beforeAll(async () => {
  const module = await Test.createTestingModule({
    controllers: [SportsPaymentCallbacksController],
    providers: [
      {
        provide: CommerceService,
        useValue: { samanPaymentCallback: callback },
      },
      {
        provide: ConfigService,
        useValue: new ConfigService({
          AUTH_APPLICATION_ORIGIN: 'https://app.example.test',
        }),
      },
    ],
  }).compile();
  app = module.createNestApplication();
  configureApi(app, { corsOrigins: [], docsEnabled: false });
  await app.init();
});
afterAll(async () => app.close());
afterEach(() => callback.mockClear());
const path = `/api/v1/sports/payment-callbacks/saman?res=${'a'.repeat(40)}&proof=${'b'.repeat(64)}`;
test('accepts a bank form without app cookies, discards card data and returns to a fixed app origin', async () => {
  const result = await request(app.getHttpServer() as Server)
    .post(path)
    .type('form')
    .send({
      ResNum: 'a'.repeat(40),
      RefNum: 'receipt+/=',
      Amount: '1',
      TerminalId: 'untrusted',
      SecurePan: 'fake-card',
      returnUrl: 'https://untrusted.example',
    });
  expect(result.status).toBe(303);
  expect(result.headers.location).toBe(
    'https://app.example.test/checkout/status?order=e65f4488-eec9-4768-a30f-918ab23bc953',
  );
  expect(result.headers['cache-control']).toBe('no-store');
  expect(result.headers['referrer-policy']).toBe('no-referrer');
  expect(callback).toHaveBeenCalledWith('a'.repeat(40), 'b'.repeat(64), {
    ResNum: 'a'.repeat(40),
    RefNum: 'receipt+/=',
  });
});
test('normalizes an empty cancelled receipt without trusting the client status', async () => {
  const result = await request(app.getHttpServer() as Server)
    .post(path)
    .type('form')
    .send({ ResNum: 'a'.repeat(40), RefNum: '', Status: '17' });
  expect(result.status).toBe(303);
  expect(callback).toHaveBeenCalledWith('a'.repeat(40), 'b'.repeat(64), {
    ResNum: 'a'.repeat(40),
    RefNum: undefined,
  });
});
test('rejects malformed attempt/proof before invoking payment service', async () => {
  const result = await request(app.getHttpServer() as Server)
    .post(path.replace('proof=', 'bad='))
    .type('form')
    .send({ ResNum: 'a'.repeat(40) });
  expect(result.status).toBe(400);
  expect(callback).not.toHaveBeenCalled();
});
