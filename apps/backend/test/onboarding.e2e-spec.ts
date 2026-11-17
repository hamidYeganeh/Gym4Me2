import { randomInt } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ClubObjectStorage } from '../src/clubs/club-media.controller';
import { Database } from '../src/onboarding/database';

const suite = process.env.DATABASE_URL ? describe : describe.skip;
suite('Club onboarding (PostgreSQL)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let storage: ClubObjectStorage;
  const admin = `+989${randomInt(100000000, 1000000000)}`;
  const owner = `+989${randomInt(100000000, 1000000000)}`;
  const other = `+989${randomInt(100000000, 1000000000)}`;
  const base = '/api/v1';
  const profile = { name: 'باشگاه آزمایشی', type: 'pool', location: 'تهران' };

  beforeAll(async () => {
    process.env.AUTH_SECRET ??= 'test-secret-for-club-onboarding-only';
    process.env.OTP_MODE = 'console';
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    db = module.get(Database);
    storage = module.get(ClubObjectStorage);
    app = module.createNestApplication();
    await app.init();
    await db.pool.query(
      "WITH a AS (INSERT INTO accounts(phone) VALUES ($1) ON CONFLICT(phone) DO UPDATE SET phone=EXCLUDED.phone RETURNING id) INSERT INTO account_roles SELECT id,'admin' FROM a ON CONFLICT DO NOTHING",
      [admin],
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  async function otp(scope: string, phone: string) {
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      await request(app.getHttpServer())
        .post(`${base}/${scope}/auth/otp`)
        .send({ phone })
        .expect(200);
      const code = String(log.mock.calls[0]?.[0]).slice(-6);
      const confirm = () =>
        request(app.getHttpServer())
          .post(`${base}/${scope}/auth/otp/confirm`)
          .send({ phone, code });
      const result = await confirm().expect(200);
      await confirm().expect(401);
      return result;
    } finally {
      log.mockRestore();
    }
  }

  function cookie(response: request.Response) {
    const values = response.headers['set-cookie'] as unknown as string[];
    return values[0].split(';')[0];
  }

  it('completes provisioned accounts, revokes sessions, and isolates password recovery codes', async () => {
    const client = request(app.getHttpServer());
    const auth = base + '/admin/auth';
    const phone = `+989${randomInt(100000000, 1000000000)}`;
    await db.pool.query(
      "WITH a AS (INSERT INTO accounts(phone) VALUES ($1) RETURNING id) INSERT INTO account_roles SELECT id,'admin' FROM a",
      [phone],
    );
    const profile = {
      name: 'Test Admin',
      username: 'auth-' + randomInt(100000000, 1000000000),
      age: 35,
      interests: ['strength', 'cardio', 'yoga'],
      password: 'initial-test-password',
    };

    await client
      .post(auth + '/account/complete')
      .send(profile)
      .expect(401);
    const signedIn = await otp('admin', phone);
    expect(signedIn.body).toEqual({
      accountComplete: false,
      hasPassword: false,
    });
    const session = cookie(signedIn);
    await client
      .post(auth + '/account/complete')
      .set('Cookie', session)
      .send({ ...profile, interests: ['yoga', 'yoga', 'yoga'] })
      .expect(400);
    await client
      .post(auth + '/account/complete')
      .set('Cookie', session)
      .send(profile)
      .expect(200, { accountComplete: true });
    await client
      .get(auth + '/session')
      .set('Cookie', session)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          accountComplete: true,
          hasPassword: true,
        }),
      );
    const login = (password: string) =>
      client.post(auth + '/login').send({ phone, password });
    const passwordSession = cookie(await login(profile.password).expect(200));
    await client
      .post(auth + '/logout')
      .set('Cookie', session)
      .expect(204);
    await client
      .get(auth + '/session')
      .set('Cookie', session)
      .expect(401);
    await client
      .get(auth + '/session')
      .set('Cookie', passwordSession)
      .expect(200);

    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      await client
        .post(base + '/applicant/auth/password/reset/request')
        .send({ phone })
        .expect(200);
      expect(log).not.toHaveBeenCalled();
      await client
        .post(auth + '/password/reset/request')
        .send({ phone })
        .expect(200);
      const code = String(log.mock.calls[0]?.[0]).slice(-6);
      const payload = { phone, code, password: 'replacement-test-password' };
      await client
        .post(auth + '/otp/confirm')
        .send(payload)
        .expect(401);
      await client
        .post(base + '/applicant/auth/password/reset/confirm')
        .send(payload)
        .expect(401);
      await client
        .post(auth + '/password/reset/confirm')
        .send(payload)
        .expect(200);
      await client
        .post(auth + '/password/reset/confirm')
        .send(payload)
        .expect(401);
      await client
        .get(auth + '/session')
        .set('Cookie', passwordSession)
        .expect(401);
      await login(profile.password).expect(401);
      await login(payload.password).expect(200);
    } finally {
      log.mockRestore();
    }
  });

  it('sets an applicant password with a dedicated reset code', async () => {
    const client = request(app.getHttpServer());
    const phone = `+989${randomInt(100000000, 1000000000)}`;
    const applicant = base + '/applicant/auth';
    const signedIn = await otp('applicant', phone);
    const token = (signedIn.body as { token: string }).token;
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      await client
        .post(applicant + '/password/reset/request')
        .send({ phone })
        .expect(200);
      const code = String(log.mock.calls[0]?.[0]).slice(-6);
      const password = 'new-applicant-password';
      const payload = { phone, code, password };
      await client
        .post(applicant + '/otp/confirm')
        .send(payload)
        .expect(401);
      await client
        .post(applicant + '/password/reset/confirm')
        .send(payload)
        .expect(200);
      await client
        .post(applicant + '/password/reset/confirm')
        .send(payload)
        .expect(401);
      await client
        .get(applicant + '/session')
        .set('Authorization', 'Bearer ' + token)
        .expect(401);
      await client
        .post(applicant + '/login')
        .send({ phone, password })
        .expect(200);
    } finally {
      log.mockRestore();
    }
  });

  it('returns Retry-After for resend and exhausted verification without spending SMS quota on cooldown', async () => {
    const phone = `+989${randomInt(100000000, 1000000000)}`;
    const endpoint = base + '/applicant/auth/otp';
    const client = request(app.getHttpServer());
    const log = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      const send = () => client.post(endpoint).send({ phone });
      const dispatches = await Promise.all([send(), send(), send()]);
      const throttled = dispatches.filter(
        (response) => response.status === 429,
      );
      expect(dispatches.map(({ status }) => status).sort()).toEqual([
        200, 429, 429,
      ]);
      for (const response of throttled) {
        expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
        expect(Number(response.headers['retry-after'])).toBeLessThanOrEqual(60);
        expect(response.body).toMatchObject({
          statusCode: 429,
          retryAfter: Number(response.headers['retry-after']),
        });
      }
      const { rows } = await db.pool.query<{ attempts: number }>(
        'SELECT attempts FROM auth_limits WHERE key=$1',
        ['otp:' + phone],
      );
      expect(rows[0]?.attempts).toBe(1);
      const code = String(log.mock.calls[0]?.[0]).slice(-6);
      const wrong = code === '111111' ? '222222' : '111111';
      const confirm = (value: string) =>
        client.post(endpoint + '/confirm').send({ phone, code: value });
      for (let i = 0; i < 4; i++) await confirm(wrong).expect(401);
      const exhausted = await confirm(wrong).expect(429);
      expect(Number(exhausted.headers['retry-after'])).toBeGreaterThan(0);
      expect(Number(exhausted.headers['retry-after'])).toBeLessThanOrEqual(300);
      await confirm(code).expect(429);
      await db.pool.query(
        "UPDATE otp SET sent_at=now()-interval '61 seconds' WHERE phone=$1",
        [phone],
      );
      await send().expect(200);
      await confirm(String(log.mock.calls[1]?.[0]).slice(-6)).expect(200);
    } finally {
      log.mockRestore();
    }
  });

  it('shares the phone password limit across apps and opens a new window after expiry', async () => {
    const phone = `+989${randomInt(100000000, 1000000000)}`;
    const key = 'password:' + phone;
    await db.pool.query('INSERT INTO auth_limits VALUES ($1, now(), 11)', [
      key,
    ]);
    const login = (scope: string) =>
      request(app.getHttpServer())
        .post(base + '/' + scope + '/auth/login')
        .send({ phone, password: 'invalid-test-password' });
    await login('admin').expect(401);
    const blocked = await login('applicant').expect(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(blocked.headers['retry-after'])).toBeLessThanOrEqual(900);
    await db.pool.query(
      "UPDATE auth_limits SET window_start=now()-interval '15 minutes' WHERE key=$1",
      [key],
    );
    await login('business').expect(401);
  });

  it('uses Kavenegar Verify Lookup and allows retry after a delivery failure', async () => {
    const env = process.env;
    process.env = {
      ...env,
      OTP_MODE: 'kavenegar',
      KAVENEGAR_API_KEY: 'test-key',
      KAVENEGAR_OTP_TEMPLATE: 'gym4meotp',
      KAVENEGAR_PASSWORD_RESET_TEMPLATE: 'g4m-set-password',
    };
    const send = jest.spyOn(globalThis, 'fetch');
    send
      .mockResolvedValueOnce(Response.json({ return: { status: 418 } }))
      .mockResolvedValueOnce(Response.json({ return: { status: 200 } }))
      .mockResolvedValueOnce(Response.json({ return: { status: 200 } }));
    try {
      const phone = `+989${randomInt(100000000, 1000000000)}`;
      const client = request(app.getHttpServer());
      const endpoint = base + '/applicant/auth/otp';
      await client.post(endpoint).send({ phone }).expect(503);
      await client.post(endpoint).send({ phone }).expect(200);
      const url = send.mock.calls[1][0];
      if (!(url instanceof URL)) throw new Error('Expected a URL.');
      expect(url.origin + url.pathname).toBe(
        'https://api.kavenegar.com/v1/test-key/verify/lookup.json',
      );
      expect(url.searchParams.get('receptor')).toBe('0' + phone.slice(3));
      expect(url.searchParams.get('template')).toBe('gym4meotp');
      const code = url.searchParams.get('token');
      expect(code).toMatch(/^\d{6}$/);
      await client
        .post(endpoint + '/confirm')
        .send({ phone, code })
        .expect(200);
      await client
        .post(base + '/admin/auth/password/reset/request')
        .send({ phone: admin })
        .expect(200);
      const resetUrl = send.mock.calls[2][0];
      if (!(resetUrl instanceof URL)) throw new Error('Expected a URL.');
      expect(resetUrl.searchParams.get('template')).toBe('g4m-set-password');
    } finally {
      send.mockRestore();
      process.env = env;
    }
  });

  it('reviews requests once, scopes tokens, and checks each club membership', async () => {
    const client = request(app.getHttpServer());
    const start = await otp('applicant', owner);
    const applicant = 'Bearer ' + (start.body as { token: string }).token;
    const apply = () =>
      client
        .post(base + '/applicant/club-requests')
        .set('Authorization', applicant)
        .send(profile)
        .expect(201);
    const approved = (await apply()).body as { id: string };
    const rejected = (await apply()).body as { id: string };
    await client
      .post(base + '/business/auth/otp')
      .send({ phone: owner })
      .expect(403);
    const adminCookie = cookie(await otp('admin', admin));
    await client
      .get(base + '/admin/club-requests')
      .set('Authorization', applicant)
      .expect(401);
    await client
      .get(base + '/admin/club-requests')
      .set('Cookie', adminCookie)
      .expect(200);

    const review = (id: string, status: string, reason?: string) =>
      client
        .patch(base + '/admin/club-requests/' + id)
        .set('Cookie', adminCookie)
        .send({ status, reason });
    const decisions = await Promise.all([
      review(approved.id, 'approved'),
      review(approved.id, 'approved'),
    ]);
    expect(decisions.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    await review(rejected.id, 'rejected').expect(400);
    await review(rejected.id, 'rejected', 'آدرس نامعتبر است').expect(200);
    const mine = await client
      .get(base + '/applicant/club-requests')
      .set('Authorization', applicant)
      .expect(200);
    expect(mine.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: rejected.id,
          rejectionReason: 'آدرس نامعتبر است',
        }),
      ]),
    );

    const resetLog = jest
      .spyOn(console, 'info')
      .mockImplementation(() => undefined);
    try {
      await client
        .post(base + '/business/auth/password/reset/request')
        .send({ phone: owner })
        .expect(200);
      const code = String(resetLog.mock.calls[0]?.[0]).slice(-6);
      const password = 'test-password-123';
      await client
        .post(base + '/business/auth/password/reset/confirm')
        .send({ phone: owner, code, password })
        .expect(200);
      await client
        .post(base + '/business/auth/login')
        .send({ phone: owner, password })
        .expect(200);
      await client
        .post(base + '/admin/auth/login')
        .send({ phone: owner, password })
        .expect(403);
    } finally {
      resetLog.mockRestore();
    }
    const ownerCookie = cookie(await otp('business', owner));
    await client
      .get(base + '/business/clubs')
      .set('Cookie', ownerCookie)
      .expect(200, []);
    await client
      .get(base + '/business/clubs/setup')
      .set('Cookie', ownerCookie)
      .expect(200)
      .expect((response) =>
        expect(response.body).toEqual([
          {
            id: approved.id,
            profile: { ...profile, description: '', cover: '', logo: '' },
          },
        ]),
      );
    const setup = (id: string) =>
      client
        .post(base + '/business/clubs/setup/' + id)
        .set('Cookie', ownerCookie)
        .send({ ...profile, description: '', cover: '', logo: '' });
    await setup(rejected.id).expect(404);
    await Promise.all([
      setup(approved.id).expect(201),
      setup(approved.id).expect(201),
    ]);
    await client
      .get(base + '/business/clubs/setup')
      .set('Cookie', ownerCookie)
      .expect(200, []);
    await client
      .get(base + '/business/clubs')
      .set('Cookie', ownerCookie)
      .expect(200)
      .expect((response) =>
        expect(response.body).toEqual([
          expect.objectContaining({ id: approved.id }),
        ]),
      );
    await client
      .get(base + '/admin/club-requests')
      .set('Cookie', ownerCookie)
      .expect(401);
    await client
      .patch(base + '/business/clubs/' + approved.id)
      .set('Cookie', ownerCookie)
      .send({ ...profile, description: '', cover: '', logo: '' })
      .expect(200);

    // The first approval and a saved club must never publish the public profile.
    const publicClub = base + '/public/clubs/' + approved.id;
    const businessClub = base + '/business/clubs/' + approved.id;
    const publication = base + '/admin/club-publications/' + approved.id;
    await client.get(publicClub).expect(404);
    await client
      .get(base + '/public/clubs')
      .expect(200)
      .expect(({ body }) => {
        expect(body).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: approved.id }),
          ]),
        );
      });
    await client
      .get(base + '/admin/club-publications')
      .set('Cookie', ownerCookie)
      .expect(401);

    const resourceSuffix = randomInt(100000, 1000000);
    async function resource(path: string, code: string, parentId?: string) {
      const response = await client
        .post(base + '/resources/' + path)
        .set('Cookie', adminCookie)
        .send({ code: `${code}-${resourceSuffix}`, title: code, parentId })
        .expect(201);
      return (response.body as { id: string }).id;
    }
    await client
      .post(base + '/resources/catalogs/equipment')
      .set('Cookie', ownerCookie)
      .send({ code: 'bench', title: 'Bench' })
      .expect(401);
    const countryId = await resource('locations/countries', 'test-country');
    await client
      .post(base + '/resources/locations/cities')
      .set('Cookie', adminCookie)
      .send({
        code: 'invalid-city',
        title: 'Invalid city',
        parentId: countryId,
      })
      .expect(400);
    const provinceId = await resource(
      'locations/provinces',
      'test-province',
      countryId,
    );
    const cityId = await resource('locations/cities', 'test-city', provinceId);
    const categoryId = await resource('catalogs/sport_categories', 'fitness');
    const sportId = await resource('catalogs/sports', 'strength', categoryId);
    const equipmentId = await resource('catalogs/equipment', 'bench');
    const mediaTypeId = await resource(
      'types/gallery_media_types',
      'training-floor',
    );
    const clubTypeId = await resource('types/club_types', 'test-studio');
    const store = jest.spyOn(storage, 'store').mockResolvedValue(undefined);
    const download = jest
      .spyOn(storage, 'downloadUrl')
      .mockResolvedValue('https://storage.example/signed');
    const photo = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1sAAAAASUVORK5CYII=',
      'base64',
    );
    const upload = () =>
      client
        .post(businessClub + '/media')
        .set('Cookie', ownerCookie)
        .attach('file', photo, 'club.png');
    const uploaded = await upload().expect(201);
    const { hash } = uploaded.body as { hash: string };
    await upload().expect(201).expect({ hash, contentType: 'image/png' });
    expect(store.mock.calls.length).toBeLessThanOrEqual(1);
    await client.get(publicClub + '/media/' + hash).expect(404);
    const structured = {
      title: 'Structured club',
      description: 'Full profile',
      clubTypeId,
      location: {
        address: 'Test address',
        lat: 35,
        lng: 51,
        provinceId,
        cityId,
      },
      sports: [{ categoryId, sportId }],
      equipment: [{ id: equipmentId, description: 'Two benches' }],
      gallery: [
        {
          hash,
          title: 'Training floor',
          description: 'Equipment',
          typeId: mediaTypeId,
        },
      ],
    };
    const applicantLogin = await client
      .post(base + '/applicant/auth/login')
      .send({ phone: owner, password: 'test-password-123' })
      .expect(200);
    const renewedApplicant =
      'Bearer ' + (applicantLogin.body as { token: string }).token;
    const application = await client
      .post(base + '/applicant/club-requests')
      .set('Authorization', renewedApplicant)
      .send({
        title: 'Awaiting publication',
        clubTypeId,
        location: structured.location,
      })
      .expect(201);
    const otherClubId = (application.body as { id: string }).id;
    await review(otherClubId, 'approved').expect(200);
    await client.get(base + '/public/clubs/' + otherClubId).expect(404);
    const newSetup = (body: object) =>
      client
        .post(base + '/business/clubs/setup/' + otherClubId)
        .set('Cookie', ownerCookie)
        .send(body);
    // An upload cannot be borrowed from a different approved request.
    await newSetup(structured).expect(400);
    await newSetup({
      ...structured,
      title: 'Awaiting publication',
      gallery: [],
    }).expect(201);
    await client.get(base + '/public/clubs/' + otherClubId).expect(404);

    await client
      .patch(businessClub)
      .set('Cookie', ownerCookie)
      .send({
        ...structured,
        gallery: [{ ...structured.gallery[0], hash: '0'.repeat(64) }],
      })
      .expect(400);
    const pending = await client
      .patch(businessClub)
      .set('Cookie', ownerCookie)
      .send(structured)
      .expect(200);
    const revision = (pending.body as { reviewRevision: number })
      .reviewRevision;
    await client.get(publicClub).expect(404);
    await client.get(publicClub + '/media/' + hash).expect(404);
    await client
      .get(publication + '/media/' + hash)
      .set('Cookie', adminCookie)
      .expect(302);
    const decide = (value: number, status: string, reason?: string) =>
      client
        .patch(publication)
        .set('Cookie', adminCookie)
        .send({ revision: value, status, reason });
    await decide(revision, 'rejected').expect(400);
    await decide(revision, 'rejected', 'Check the description').expect(200);
    await client.get(publicClub).expect(404);
    await client
      .get(businessClub)
      .set('Cookie', ownerCookie)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            reviewStatus: 'rejected',
            rejectionReason: 'Check the description',
          }),
        );
      });
    await client
      .patch(businessClub)
      .set('Cookie', ownerCookie)
      .send(structured)
      .expect(200);
    await decide(revision, 'approved').expect(409);
    await decide(revision + 1, 'approved').expect(200);
    await client
      .get(base + '/public/clubs')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: approved.id, coverHash: hash }),
          ]),
        );
      });
    await client
      .get(publicClub + '/media/' + hash)
      .expect(302)
      .expect('Location', 'https://storage.example/signed');
    await client
      .patch(businessClub)
      .set('Cookie', ownerCookie)
      .send({ ...structured, title: 'Updated draft', gallery: [] })
      .expect(200);
    await client
      .get(publicClub)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ title: structured.title }),
        );
      });
    await decide(revision + 2, 'approved').expect(200);
    await client
      .get(publicClub)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({ title: 'Updated draft' }),
        );
      });
    await client.get(publicClub + '/media/' + hash).expect(404);
    store.mockRestore();
    download.mockRestore();

    await db.pool.query(
      "WITH a AS (INSERT INTO accounts(phone) VALUES ($1) RETURNING id) INSERT INTO account_roles SELECT id,'business' FROM a",
      [other],
    );
    const otherCookie = cookie(await otp('business', other));
    await client
      .get(base + '/business/clubs/' + approved.id)
      .set('Cookie', otherCookie)
      .expect(404);
    await db.pool.query(
      "INSERT INTO club_memberships SELECT $1,id,'viewer' FROM accounts WHERE phone=$2",
      [approved.id, other],
    );
    await client
      .get(base + '/business/clubs/' + approved.id)
      .set('Cookie', otherCookie)
      .expect(200);
    await client
      .patch(base + '/business/clubs/' + approved.id)
      .set('Cookie', otherCookie)
      .send({ ...profile, description: '', cover: '', logo: '' })
      .expect(404);
    await client
      .post(base + '/applicant/auth/logout')
      .set('Authorization', applicant)
      .expect(204);
    await client
      .get(base + '/applicant/auth/session')
      .set('Authorization', applicant)
      .expect(401);
  });
});
