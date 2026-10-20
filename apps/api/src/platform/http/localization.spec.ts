import {
  type ArgumentsHost,
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { LocaleExceptionFilter } from './localization';

function responseHost(locale = 'en') {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'accept-language': locale } }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  return { response, host };
}
afterEach(() => jest.restoreAllMocks());
test.each(['fa', 'en'])(
  'oversized payloads provide a safe localized size error in %s',
  (locale) => {
    const { response, host } = responseHost(locale);
    new LocaleExceptionFilter().catch(
      new PayloadTooLargeException('File too large; private-upload-name'),
      host,
    );
    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.setHeader).toHaveBeenCalledWith('Content-Language', locale);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'Backend.payloadTooLarge',
        message: expect.any(String) as string,
      }),
    );
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'private-upload-name',
    );
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      '"message":"Backend.',
    );
  },
);
test('driver exceptions cannot expose SQL, phone, token or audit reasons in HTTP and general logs', () => {
  const log = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  const { response, host } = responseHost();
  const canary = 'SQL +989123456789 bearer_secret private-audit-reason';
  new LocaleExceptionFilter().catch(new Error(canary), host);
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({ code: 'Backend.unexpectedError' }),
  );
  expect(log).toHaveBeenCalledTimes(1);
  for (const privateValue of canary.split(' ')) {
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateValue);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      privateValue,
    );
  }
});
test('validation errors expose localized reason guidance without echoing the submitted reason', () => {
  const log = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);
  const { response, host } = responseHost();
  new LocaleExceptionFilter().catch(
    new BadRequestException('Backend.changeReasonRequired'),
    host,
  );
  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith(
    expect.objectContaining({
      code: 'Backend.changeReasonRequired',
    }),
  );
  expect(log).not.toHaveBeenCalled();
});
