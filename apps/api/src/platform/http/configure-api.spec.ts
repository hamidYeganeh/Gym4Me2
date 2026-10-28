import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import type { Server } from 'node:http';
import { configureApi } from './configure-api';

@Module({})
class ProbeModule {}

describe('VPS proxy client addresses', () => {
  let app: INestApplication<Server>;
  afterEach(async () => app?.close());

  async function probe(trustLoopbackProxy: boolean) {
    app = await NestFactory.create(ProbeModule, { logger: false });
    configureApi(app, {
      corsOrigins: [],
      docsEnabled: false,
      trustLoopbackProxy,
    });
    app
      .getHttpAdapter()
      .get(
        '/probe',
        (req: { ip: string }, res: { json(body: unknown): void }) => {
          res.json({ ip: req.ip });
        },
      );
    await app.init();
    return request(app.getHttpServer());
  }

  it('ignores forwarded addresses by default', async () => {
    const response = await (
      await probe(false)
    )
      .get('/probe')
      .set('X-Forwarded-For', '198.51.100.7');
    expect(response.status).toBe(200);
    expect(response.text).not.toContain('198.51.100.7');
  });

  it('uses the nearest untrusted address and ignores spoofed addresses further left', async () => {
    const response = await (
      await probe(true)
    )
      .get('/probe')
      .set('X-Forwarded-For', '203.0.113.123, 198.51.100.7');
    expect(response.status).toBe(200);
    expect(response.text).toBe(JSON.stringify({ ip: '198.51.100.7' }));
  });
});
