import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment';
import type { PaymentScenario } from './commerce.contracts';

export interface PaymentAdapter {
  readonly provider: string;
  create(
    reference: string,
    amountMinor: string,
    scenario: PaymentScenario,
  ): Promise<{ reference: string; state: 'pending' }>;
  verify(
    reference: string,
    amountMinor: string,
    scenario: PaymentScenario,
  ): Promise<'verified' | 'failed' | 'unknown'>;
  query(
    reference: string,
    amountMinor: string,
    scenario: PaymentScenario,
  ): Promise<'verified' | 'failed' | 'unknown'>;
  refund(
    reference: string,
    amountMinor: string,
  ): Promise<{ reference: string; state: 'succeeded' }>;
  authenticateCallback(reference: string, proof: string): boolean;
}

export const PAYMENT_ADAPTER = Symbol('PAYMENT_ADAPTER');

@Injectable()
export class SamanMockPaymentAdapter implements PaymentAdapter {
  readonly provider = 'saman_mock';
  constructor(private readonly config: ConfigService<Environment, true>) {}
  private assertEnabled() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production')
      throw new ConflictException(
        'Saman mock payments are disabled in production',
      );
  }
  /** Test-bank transport proof. Never expose this value to a browser. */
  signCallback(reference: string) {
    this.assertEnabled();
    return createHmac('sha256', this.config.get('AUTH_SECRET', { infer: true }))
      .update(`saman-mock:${reference}`)
      .digest('hex');
  }
  authenticateCallback(reference: string, proof: string) {
    this.assertEnabled();
    if (!/^[a-f0-9]{64}$/i.test(proof)) return false;
    const expected = Buffer.from(this.signCallback(reference), 'hex');
    return timingSafeEqual(expected, Buffer.from(proof, 'hex'));
  }
  create(reference: string, amountMinor: string, scenario: PaymentScenario) {
    this.assertEnabled();
    if (BigInt(amountMinor) < 0n || !scenario)
      throw new ConflictException('Invalid payment');
    return Promise.resolve({
      reference: `saman-mock:${reference}`,
      state: 'pending' as const,
    });
  }
  verify(reference: string, amountMinor: string, scenario: PaymentScenario) {
    this.assertEnabled();
    if (!reference || BigInt(amountMinor) < 0n)
      throw new ConflictException('Invalid payment');
    return Promise.resolve(
      scenario === 'failure'
        ? ('failed' as const)
        : ['timeout', 'late'].includes(scenario)
          ? ('unknown' as const)
          : ('verified' as const),
    );
  }
  async query(
    reference: string,
    amountMinor: string,
    scenario: PaymentScenario,
  ) {
    return this.verify(
      reference,
      amountMinor,
      scenario === 'late' ? 'success' : scenario,
    );
  }
  refund(reference: string, amountMinor: string) {
    this.assertEnabled();
    return Promise.resolve({
      reference: createHash('sha256')
        .update(`${reference}:${amountMinor}`)
        .digest('hex'),
      state: 'succeeded' as const,
    });
  }
}
