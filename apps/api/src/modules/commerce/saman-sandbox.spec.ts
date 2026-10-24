import type { Environment } from '../../config/environment';
import { ConfigService } from '@nestjs/config';
import { SamanMockPaymentAdapter } from './sandbox-payment';
import {
  ConfiguredPaymentAdapter,
  SamanSandboxPaymentAdapter,
} from './saman-sandbox';

const terminal = '123456';
const config = new ConfigService<Environment, true>({
  AUTH_SECRET: 's'.repeat(64),
  SAMAN_SANDBOX_TERMINAL_ID: terminal,
  PUBLIC_API_ORIGIN: 'https://api.example.test',
  PAYMENT_PROVIDER: 'saman_sandbox',
  NODE_ENV: 'test',
});
const response = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200 });
const verified = (detail = {}) => ({
  Success: true,
  ResultCode: 0,
  TransactionDetail: {
    RefNum: 'bank-receipt-1',
    TerminalNumber: terminal,
    OrginalAmount: 10000,
    ...detail,
  },
});
let bank: SamanSandboxPaymentAdapter;
afterEach(() => jest.restoreAllMocks());
beforeEach(() => {
  bank = new SamanSandboxPaymentAdapter(config);
});

test('creates a BankTest token with a signed callback and server amount', async () => {
  const fetcher = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(response({ status: 1, token: 'test-token' }));
  const created = await bank.create('order:attempt', '10000', 'failure');
  const request = JSON.parse(
    fetcher.mock.calls[0][1]!.body as string,
  ) as Record<string, string | number>;
  const callback = new URL(request.RedirectUrl as string);
  expect(fetcher.mock.calls[0][0]).toBe(
    'https://sandbox.banktest.ir/saman/sep.shaparak.ir/OnlinePG/OnlinePG',
  );
  expect(request).toMatchObject({
    Amount: 10000,
    TerminalId: terminal,
    Action: 'token',
  });
  expect(callback.origin).toBe('https://api.example.test');
  expect(
    bank.authenticateCallback(
      created.reference,
      callback.searchParams.get('proof')!,
    ),
  ).toBe(true);
  expect(
    bank.authenticateCallback(
      created.reference + '0',
      callback.searchParams.get('proof')!,
    ),
  ).toBe(false);
  expect(bank.authenticateCallback(created.reference, '0'.repeat(64))).toBe(
    false,
  );
  expect(created.gatewayUrl).toBe(
    'https://sandbox.banktest.ir/saman/sep.shaparak.ir/OnlinePG/SendToken?token=test-token',
  );
});

test('cannot approve before a callback receipt, regardless of client scenario', async () => {
  const fetcher = jest.spyOn(global, 'fetch');
  expect(await bank.verify('reference', '10000', 'success')).toBe('unknown');
  expect(await bank.query('reference', '10000', 'late')).toBe('unknown');
  expect(fetcher).not.toHaveBeenCalled();
});

test('requires successful verification matching reference, terminal and exact IRR amount', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(response(verified()));
  expect(
    await bank.verify('reference', '10000', 'failure', 'bank-receipt-1'),
  ).toBe('verified');
});

test.each([
  { RefNum: 'another-receipt' },
  { TerminalNumber: '654321' },
  { OrginalAmount: 10001 },
  {},
])('rejects mismatched or missing verification details: %j', async (detail) => {
  const data = Object.keys(detail).length
    ? verified(detail)
    : { Success: true, ResultCode: 0 };
  jest.spyOn(global, 'fetch').mockResolvedValue(response(data));
  await expect(
    bank.verify('reference', '10000', 'success', 'bank-receipt-1'),
  ).rejects.toThrow('Payments.mismatch');
});

test.each([null, { Success: false, ResultCode: -2 }])(
  'keeps unavailable/unsuccessful verification unresolved',
  async (data) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(response(data));
    expect(
      await bank.verify('reference', '10000', 'success', 'bank-receipt-1'),
    ).toBe('unknown');
  },
);

test('handles HTML rejection and transport timeouts without leaking provider contents', async () => {
  const fetcher = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(new Response('<html>private provider page</html>'));
  expect(await bank.verify('reference', '10000', 'success', 'receipt')).toBe(
    'unknown',
  );
  fetcher.mockRejectedValue(new Error('provider-secret'));
  await expect(bank.create('order', '10000', 'success')).rejects.toThrow(
    'Payments.unavailable',
  );
});

test('only reverses the exact whole receipt and validates the reversal response', async () => {
  const fetcher = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(response(verified()));
  const context = {
    provider: bank.provider,
    reference: 'saman-sandbox:order',
    amountMinor: '10000',
    bankReference: 'bank-receipt-1',
  };
  await expect(bank.refund('refund', '5000', context)).rejects.toThrow(
    'Payments.refundReview',
  );
  expect(fetcher).not.toHaveBeenCalled();
  expect(await bank.refund('refund', '10000', context)).toMatchObject({
    state: 'succeeded',
  });
  fetcher.mockResolvedValue(response(verified({ OrginalAmount: 9999 })));
  await expect(bank.refund('refund', '10000', context)).rejects.toThrow(
    'Payments.mismatch',
  );
});

test('keeps older mock attempts routed to their original provider after cutover', async () => {
  const router = new ConfiguredPaymentAdapter(
    config,
    new SamanMockPaymentAdapter(config),
    bank,
  );
  expect(router.provider).toBe('saman_sandbox');
  expect(await router.verify('saman-mock:old-order', '10000', 'success')).toBe(
    'verified',
  );
  expect(
    await router.verify('saman-sandbox:new-order', '10000', 'success'),
  ).toBe('unknown');
});

test('binds the mobile return mode to its signed callback', async () => {
  const fetcher = jest
    .spyOn(global, 'fetch')
    .mockResolvedValue(response({ status: 1, token: 'test-token' }));
  const created = await bank.create(
    'native-order:attempt',
    '10000',
    'success',
    true,
  );
  const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string) as {
    RedirectUrl: string;
  };
  const callback = new URL(payload.RedirectUrl);
  expect(callback.searchParams.get('return')).toBe('native');
  expect(
    bank.authenticateCallback(
      created.reference,
      callback.searchParams.get('proof')!,
      true,
    ),
  ).toBe(true);
  expect(
    bank.authenticateCallback(
      created.reference,
      callback.searchParams.get('proof')!,
      false,
    ),
  ).toBe(false);
});
