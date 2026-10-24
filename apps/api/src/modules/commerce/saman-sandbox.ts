import {
  Injectable,
  ServiceUnavailableException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Environment } from '../../config/environment';
import type { PaymentScenario } from './commerce.contracts';
import {
  SamanMockPaymentAdapter,
  type PaymentAdapter,
} from './sandbox-payment';

// This adapter only reaches BankTest. There is deliberately no live-bank URL override.
const base = 'https://sandbox.banktest.ir/saman/sep.shaparak.ir';
const bankResponseSchema = z.object({
  status: z.number().optional(),
  token: z.string().optional(),
  ResultCode: z.number().optional(),
  Success: z.boolean().optional(),
  TransactionDetail: z
    .object({
      RefNum: z.string().optional(),
      TerminalNumber: z.union([z.number(), z.string()]).optional(),
      OrginalAmount: z.union([z.number(), z.string()]).optional(),
    })
    .optional(),
});
type BankResponse = z.infer<typeof bankResponseSchema>;
type RefundContext = NonNullable<Parameters<PaymentAdapter['refund']>[2]>;

@Injectable()
export class SamanSandboxPaymentAdapter implements PaymentAdapter {
  readonly provider = 'saman_sandbox';
  constructor(private readonly config: ConfigService<Environment, true>) {}
  private terminal() {
    const terminal = this.config.get('SAMAN_SANDBOX_TERMINAL_ID', {
      infer: true,
    });
    if (!terminal)
      throw new ServiceUnavailableException('Payments.unavailable');
    return terminal;
  }
  private proof(reference: string, nativeReturn = false) {
    const secret = this.config.get('AUTH_SECRET', { infer: true });
    if (!secret) throw new ServiceUnavailableException('Payments.unavailable');
    return createHmac('sha256', secret)
      .update(`banktest:${reference}:${nativeReturn ? 'native' : 'web'}`)
      .digest('hex');
  }
  authenticateCallback(reference: string, proof: string, nativeReturn = false) {
    return (
      /^saman-sandbox:[a-f0-9]{40}$/.test(reference) &&
      /^[a-f0-9]{64}$/.test(proof) &&
      timingSafeEqual(
        Buffer.from(proof, 'hex'),
        Buffer.from(this.proof(reference, nativeReturn), 'hex'),
      )
    );
  }
  private async post(
    path: string,
    body: Record<string, unknown>,
  ): Promise<BankResponse> {
    try {
      const response = await fetch(base + path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Gateway unavailable');
      return bankResponseSchema.parse(await response.json());
    } catch {
      // Do not surface provider pages, tokens, bank references or request bodies.
      throw new ServiceUnavailableException('Payments.unavailable');
    }
  }
  async create(
    reference: string,
    amountMinor: string,
    _scenario: PaymentScenario,
    nativeReturn = false,
  ) {
    void _scenario;
    const amount = Number(amountMinor);
    if (!Number.isSafeInteger(amount) || amount <= 0)
      throw new ConflictException('Payments.mismatch');
    const resNum = createHash('sha256')
      .update(reference)
      .digest('hex')
      .slice(0, 40);
    const paymentReference = `saman-sandbox:${resNum}`;
    const callback = new URL(
      '/api/v1/sports/payment-callbacks/saman',
      this.config.get('PUBLIC_API_ORIGIN', { infer: true }),
    );
    callback.searchParams.set('res', resNum);
    callback.searchParams.set(
      'proof',
      this.proof(paymentReference, nativeReturn),
    );
    callback.searchParams.set('return', nativeReturn ? 'native' : 'web');
    const result = await this.post('/OnlinePG/OnlinePG', {
      Action: 'token',
      TerminalId: this.terminal(),
      Amount: amount,
      ResNum: resNum,
      RedirectUrl: callback.href,
    });
    if (
      result.status !== 1 ||
      typeof result.token !== 'string' ||
      !result.token ||
      result.token.length > 2048
    )
      throw new ServiceUnavailableException('Payments.unavailable');
    const gateway = new URL(base + '/OnlinePG/SendToken');
    gateway.searchParams.set('token', result.token);
    return {
      reference: paymentReference,
      state: 'pending' as const,
      gatewayUrl: gateway.href,
    };
  }
  async verify(
    _reference: string,
    amountMinor: string,
    _scenario: PaymentScenario,
    bankReference?: string | null,
  ) {
    void _reference;
    void _scenario;
    if (!bankReference) return 'unknown' as const;
    let result: BankResponse;
    try {
      result = await this.post(
        '/verifyTxnRandomSessionkey/ipg/VerifyTransaction',
        { RefNum: bankReference, TerminalNumber: this.terminal() },
      );
    } catch {
      return 'unknown' as const;
    }
    if (!result.Success || result.ResultCode !== 0) return 'unknown' as const;
    const detail = result.TransactionDetail;
    if (
      !detail ||
      detail.RefNum !== bankReference ||
      String(detail.TerminalNumber) !== this.terminal() ||
      String(detail.OrginalAmount) !== amountMinor
    )
      throw new ConflictException('Payments.mismatch');
    return 'verified' as const;
  }
  query(
    reference: string,
    amountMinor: string,
    scenario: PaymentScenario,
    bankReference?: string | null,
  ) {
    return this.verify(reference, amountMinor, scenario, bankReference);
  }
  async refund(
    _reference: string,
    amountMinor: string,
    context?: RefundContext,
  ) {
    void _reference;
    // SEP reverse is a full-transaction reversal. Never report a partial refund as paid.
    if (!context?.bankReference || context.amountMinor !== amountMinor)
      throw new ConflictException('Payments.refundReview');
    const result = await this.post(
      '/verifyTxnRandomSessionkey/ipg/ReverseTransaction',
      { RefNum: context.bankReference, TerminalNumber: this.terminal() },
    );
    if (!result.Success || result.ResultCode !== 0)
      throw new ServiceUnavailableException('Payments.unavailable');
    const detail = result.TransactionDetail;
    if (
      !detail ||
      detail.RefNum !== context.bankReference ||
      String(detail.TerminalNumber) !== this.terminal() ||
      String(detail.OrginalAmount) !== amountMinor
    )
      throw new ConflictException('Payments.mismatch');
    return { reference: context.bankReference, state: 'succeeded' as const };
  }
}

@Injectable()
export class ConfiguredPaymentAdapter implements PaymentAdapter {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly mock: SamanMockPaymentAdapter,
    private readonly bank: SamanSandboxPaymentAdapter,
  ) {}
  get provider() {
    return this.config.get('PAYMENT_PROVIDER', { infer: true });
  }
  private forReference(reference: string) {
    return reference.startsWith('saman-sandbox:') ? this.bank : this.mock;
  }
  create(
    reference: string,
    amount: string,
    scenario: PaymentScenario,
    nativeReturn = false,
  ) {
    const adapter: PaymentAdapter =
      this.provider === 'saman_sandbox' ? this.bank : this.mock;
    return adapter.create(reference, amount, scenario, nativeReturn);
  }
  verify(
    reference: string,
    amount: string,
    scenario: PaymentScenario,
    bankReference?: string | null,
  ) {
    const adapter: PaymentAdapter = this.forReference(reference);
    return adapter.verify(reference, amount, scenario, bankReference);
  }
  query(
    reference: string,
    amount: string,
    scenario: PaymentScenario,
    bankReference?: string | null,
  ) {
    const adapter: PaymentAdapter = this.forReference(reference);
    return adapter.query(reference, amount, scenario, bankReference);
  }
  authenticateCallback(reference: string, proof: string, nativeReturn = false) {
    const adapter: PaymentAdapter = this.forReference(reference);
    return adapter.authenticateCallback(reference, proof, nativeReturn);
  }
  refund(reference: string, amount: string, context?: RefundContext) {
    return context?.provider === 'saman_sandbox'
      ? this.bank.refund(reference, amount, context)
      : this.mock.refund(reference, amount);
  }
}
