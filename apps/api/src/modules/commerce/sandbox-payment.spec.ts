import { ConfigService } from '@nestjs/config';
import { SamanMockPaymentAdapter } from './sandbox-payment';

describe('mock payment environment boundary', () => {
  it('requires an explicit demo flag in production', async () => {
    const production = new SamanMockPaymentAdapter(
      new ConfigService({ NODE_ENV: 'production', DEMO_MODE: false }),
    );
    expect(() => production.create('order', '100', 'success')).toThrow();
    const demo = new SamanMockPaymentAdapter(
      new ConfigService({ NODE_ENV: 'production', DEMO_MODE: true }),
    );
    await expect(demo.verify('order', '100', 'success')).resolves.toBe(
      'verified',
    );
    await expect(demo.verify('order', '100', 'failure')).resolves.toBe(
      'failed',
    );
    await expect(demo.query('order', '100', 'late')).resolves.toBe('verified');
  });
});
