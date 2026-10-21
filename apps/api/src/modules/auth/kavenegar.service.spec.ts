import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { validateEnvironment } from '../../config/environment';
import { KavenegarService } from './kavenegar.service';
import { phoneSchema } from './auth.contracts';
const make = (key?: string) =>
  new KavenegarService(
    new ConfigService(
      validateEnvironment({
        DATABASE_URL: 'postgresql://localhost/test',
        SMS_PROVIDER: key ? 'kavenegar' : 'disabled',
        KAVENEGAR_API_KEY: key,
      }),
    ),
  );
afterEach(() => jest.restoreAllMocks());
test('normalizes Persian, Arabic and international Iranian mobile formats', () => {
  for (const input of [
    '۰۹۱۲۳۴۵۶۷۸۹',
    '٠٩١٢٣٤٥٦٧٨٩',
    '0912 345 6789',
    '+989123456789',
    '00989123456789',
  ])
    expect(phoneSchema.parse(input)).toBe('+989123456789');
  expect(phoneSchema.safeParse('02112345678').success).toBe(false);
});
test('missing credentials never invoke the provider', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  await expect(make().sendOtp('+989123456789', '12345')).rejects.toBeInstanceOf(
    ServiceUnavailableException,
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
test('sends five-digit OTP through the gym4meotp Verify Lookup template using POST', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ return: { status: 200 } }), {
      status: 200,
    }),
  );
  await make('testkey').sendOtp('+989123456789', '12345');
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.kavenegar.com/v1/testkey/verify/lookup.json');
  expect(options?.method).toBe('POST');
  expect(options?.body).toBeInstanceOf(URLSearchParams);
  const body = options!.body as URLSearchParams;
  expect(Object.fromEntries(body)).toEqual({
    receptor: '09123456789',
    token: '12345',
    template: 'gym4meotp',
    type: 'sms',
  });
});
test.each(['network', 'provider', 'malformed'])(
  'redacts all %s errors',
  async (failure) => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    if (failure === 'network')
      fetchMock.mockRejectedValue(new Error('secretkey phone code'));
    else
      fetchMock.mockResolvedValue(
        new Response(
          failure === 'malformed'
            ? 'secretkey'
            : JSON.stringify({
                return: { status: 424, message: 'secretkey phone code' },
              }),
          { status: 200 },
        ),
      );
    await expect(
      make('secretkey').sendOtp('+989123456789', '12345'),
    ).rejects.toThrow('Backend.couldNotSendSmsTryAgainLater');
  },
);

test('adds the server-configured Android hash as token2 without accepting client input', async () => {
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(JSON.stringify({ return: { status: 200 } })),
    );
  const service = new KavenegarService(
    new ConfigService(
      validateEnvironment({
        DATABASE_URL: 'postgresql://localhost/test',
        SMS_PROVIDER: 'kavenegar',
        KAVENEGAR_API_KEY: 'testkey',
        KAVENEGAR_ANDROID_APP_HASH: 'z5rk2X8HKrl',
      }),
    ),
  );
  await service.sendOtp('+989123456789', '12345');
  expect(
    (fetchMock.mock.calls[0][1]?.body as URLSearchParams).get('token2'),
  ).toBe('z5rk2X8HKrl');
});

test('adding a key alone never enables real SMS', async () => {
  const send = jest.spyOn(globalThis, 'fetch');
  const service = new KavenegarService(
    new ConfigService(
      validateEnvironment({
        DATABASE_URL: 'postgresql://localhost/test',
        KAVENEGAR_API_KEY: 'testkey',
      }),
    ),
  );
  await expect(
    service.sendOtp('+989123456789', '12345'),
  ).rejects.toBeInstanceOf(ServiceUnavailableException);
  expect(send).not.toHaveBeenCalled();
});
