import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import type { DatabaseService } from '../../database/database.service';
import type { KavenegarService } from './kavenegar.service';
import type { Environment } from '../../config/environment';

describe('demo sign-in boundary', () => {
  it('rejects unseeded numbers and phone changes before creating a challenge or sending SMS', async () => {
    const execute = jest.fn().mockResolvedValue({ rows: [] });
    const transaction = jest.fn();
    const sendOtp = jest.fn();
    const auth = new AuthService(
      { db: { execute, transaction } } as unknown as DatabaseService,
      new ConfigService<Environment, true>({
        DEMO_MODE: true,
        SMS_PROVIDER: 'disabled',
      }),
      { sendOtp } as unknown as KavenegarService,
    );
    await expect(
      auth.requestOtp('+989123456789', 'application', '127.0.0.1'),
    ).rejects.toThrow('Backend.signInIsNotConfiguredYet');
    execute.mockResolvedValue({ rows: [{ user_id: 'seeded' }] });
    await expect(
      auth.requestOtp(
        '+989000000001',
        'application',
        '127.0.0.1',
        'web',
        'seeded',
      ),
    ).rejects.toThrow('Backend.signInIsNotConfiguredYet');
    expect(transaction).not.toHaveBeenCalled();
    expect(sendOtp).not.toHaveBeenCalled();
  });
});
