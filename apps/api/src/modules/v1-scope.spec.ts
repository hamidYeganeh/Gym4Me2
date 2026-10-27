import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { validateEnvironment } from '../config/environment';
import { DatabaseService } from '../database/database.service';
import { configureApi } from '../platform/http/configure-api';
import { WorkspacesModule } from './workspaces.module';

describe('v1 public API scope', () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () =>
              validateEnvironment({
                NODE_ENV: 'test',
                DATABASE_URL:
                  'postgresql://test:test@127.0.0.1:55547/gym4me_v1_scope_test',
                AUTH_SECRET:
                  'isolated-v1-scope-test-secret-no-live-credentials',
              }),
          ],
        }),
        WorkspacesModule,
      ],
    })
      .overrideProvider(DatabaseService)
      .useValue({ db: {} })
      .compile();
    app = module.createNestApplication();
    configureApi(app, {
      corsOrigins: ['http://localhost:7081'],
      docsEnabled: false,
    });
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    ['get', '/sports/games'],
    ['get', '/profile/games'],
    ['post', '/profile/games'],
    ['post', '/profile/games/00000000-0000-4000-8000-000000000001/join'],
    ['get', '/profile/credits'],
    ['post', '/profile/credits/pay'],
    ['post', '/business/credit-networks'],
    ['get', '/profile/nutrition'],
    ['get', '/profile/nutrition/foods'],
    ['post', '/profile/nutrition/entries'],
    ['post', '/profile/training/recommendations'],
    [
      'post',
      '/profile/training/recommendations/00000000-0000-4000-8000-000000000001/accept',
    ],
    ['get', '/sports/calendars'],
    ['get', '/sports/calendars/page'],
    ['get', '/sports/community/calendars/page'],
    [
      'post',
      '/sports/community/calendars/00000000-0000-4000-8000-000000000001/follow',
    ],
  ])('does not publish archived endpoint %s %s', async (method, path) => {
    const client = request(app.getHttpServer());
    const response = await (method === 'get'
      ? client.get(`/api/v1${path}`)
      : client.post(`/api/v1${path}`));
    expect(response.status).toBe(404);
  });

  it.each([
    '/sports/account/bookings',
    '/sports/account/memberships',
    '/sports/account/orders',
    '/profile/training',
    '/sports/community/notifications',
  ])('keeps core endpoint %s protected by authentication', async (path) => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('x-gym-client', 'application')
      .set('Origin', 'http://localhost:7081');
    expect(response.status).toBe(401);
  });
});
