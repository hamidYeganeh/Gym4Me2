import { ConfigService } from '@nestjs/config';
import { PushJobsController } from './push-jobs.controller';
import {
  validateEnvironment,
  type Environment,
} from '../../config/environment';
import type { RetentionService } from '../profile/retention.service';

test('retention jobs reject missing authorization and propagate failures without reporting success', async () => {
  const secret = 's'.repeat(64);
  const config = new ConfigService<Environment, true>(
    validateEnvironment({
      DATABASE_URL: 'postgresql://example:example@localhost/example_test',
      PUSH_JOBS_SECRET: secret,
    }),
  );
  const run = jest.fn().mockResolvedValue({ deletedAccounts: 1 });
  const controller = new PushJobsController(
    config,
    undefined as never,
    undefined as never,
    undefined,
    undefined,
    undefined,
    { run } as unknown as RetentionService,
  );
  await expect(controller.retain(undefined)).rejects.toThrow();
  await expect(controller.retain('Bearer wrong')).rejects.toThrow();
  expect(run).not.toHaveBeenCalled();
  await expect(controller.retain(`Bearer ${secret}`)).resolves.toEqual({
    deletedAccounts: 1,
  });
  expect(run).toHaveBeenCalledWith(true);
  run.mockRejectedValueOnce(new Error('Independent receipt unavailable'));
  await expect(controller.retain(`Bearer ${secret}`)).rejects.toThrow(
    'Independent receipt unavailable',
  );
});
