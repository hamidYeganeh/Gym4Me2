import { Get, HttpCode, INestApplication, Param, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { StorageService } from '../src/modules/clubs/storage.service';
import { DatabaseService } from '../src/database/database.service';
import { HealthController } from '../src/modules/system/health/health.controller';
import { configureApi } from '../src/platform/http/configure-api';
import { DomainController } from '../src/platform/http/domain-controller.decorator';

// Test-only controller verifies the contract without shipping fake features.
@DomainController('booking', 'reservations')
class ReservationFixture {
  @Get()
  list() {
    return [];
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id') id: string) {
    return { id, status: 'cancelled' };
  }
}

describe('Versioned API contract', () => {
  let app: INestApplication<App>;
  const database = { checkReadiness: jest.fn<Promise<void>, []>() };

  const storage = { health: jest.fn<Promise<{ status: string }>, []>() };

  beforeEach(async () => {
    storage.health.mockReset().mockResolvedValue({ status: 'ok' });
    database.checkReadiness.mockReset().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      controllers: [HealthController, ReservationFixture],
      providers: [
        { provide: DatabaseService, useValue: database },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApi(app, {
      corsOrigins: ['https://example.com'],
      docsEnabled: true,
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('exposes a domain/feature root and a related action', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/booking/reservations')
      .expect(200, []);
    await request(app.getHttpServer())
      .post('/api/v1/booking/reservations/test-id/cancel')
      .expect(200, { id: 'test-id', status: 'cancelled' });
  });

  it.each([
    '/',
    '/health',
    '/api/health',
    '/api/system/health',
    '/api/v2/system/health',
  ])('does not expose legacy or unimplemented routes: %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(404);
  });

  it('keeps liveness independent of database availability', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/system/health')
      .expect(200, { status: 'ok', service: 'gym4me-api' });
    expect(database.checkReadiness).not.toHaveBeenCalled();
  });

  it('checks the database dependency for readiness', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/system/health/ready')
      .expect(200, {
        status: 'ok',
        service: 'gym4me-api',
        checks: { database: 'up', storage: 'up' },
      });
    expect(database.checkReadiness).toHaveBeenCalledTimes(1);
  });

  it('returns 503 without leaking database errors', async () => {
    database.checkReadiness.mockRejectedValue(
      new Error('postgresql://user:secret@private-host/db'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/system/health/ready')
      .expect(503, {
        status: 'error',
        service: 'gym4me-api',
        checks: { database: 'down', storage: 'up' },
      });
  });

  it('reports storage failure without leaking its endpoint or credentials', async () => {
    storage.health.mockRejectedValue(new Error('S3 private endpoint secret'));
    await request(app.getHttpServer())
      .get('/api/v1/system/health/ready')
      .expect(503, {
        status: 'error',
        service: 'gym4me-api',
        checks: { database: 'up', storage: 'down' },
      });
    await request(app.getHttpServer()).get('/api/v1/system/health').expect(200);
  });

  it('publishes OpenAPI paths with exactly one prefix and version', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/system/docs/json')
      .expect(200);
    const body = response.body as { paths: Record<string, unknown> };
    expect(Object.keys(body.paths).sort()).toEqual([
      '/api/v1/booking/reservations',
      '/api/v1/booking/reservations/{id}/cancel',
      '/api/v1/system/health',
      '/api/v1/system/health/ready',
    ]);
  });

  it('honors configured CORS origins', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/system/health')
      .set('Origin', 'https://example.com')
      .expect('Access-Control-Allow-Origin', 'https://example.com');
    const response = await request(app.getHttpServer())
      .get('/api/v1/system/health')
      .set('Origin', 'https://untrusted.example');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
