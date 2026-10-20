import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { DemoJobsInterceptor } from './demo-jobs.interceptor';
import type { CommerceService } from './commerce.service';

describe('demo serverless jobs', () => {
  const setup = (enabled: boolean) => {
    const runJobs = jest.fn().mockResolvedValue({ processed: 1 });
    return {
      runJobs,
      interceptor: new DemoJobsInterceptor(
        new ConfigService({ DEMO_MODE: enabled }),
        { runJobs } as unknown as CommerceService,
      ),
    };
  };
  const context = (
    method = 'POST',
    path = '/api/v1/sports/account/bookings/id/cancel',
  ) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ method, path }) }),
    }) as ExecutionContext;
  it('awaits pending jobs after a successful demo command and preserves its result', async () => {
    const { interceptor, runJobs } = setup(true);
    expect(
      await firstValueFrom(
        interceptor.intercept(context(), { handle: () => of({ ok: true }) }),
      ),
    ).toEqual({ ok: true });
    expect(runJobs).toHaveBeenCalledTimes(1);
  });
  it('does not run after a failed command, ordinary reads, auth, or outside demo mode', async () => {
    const { interceptor, runJobs } = setup(true);
    await expect(
      firstValueFrom(
        interceptor.intercept(context(), {
          handle: () => throwError(() => new Error('denied')),
        }),
      ),
    ).rejects.toThrow('denied');
    for (const ctx of [
      context('GET'),
      context('POST', '/api/v1/auth/otp/request'),
    ])
      await firstValueFrom(
        interceptor.intercept(ctx, { handle: () => of(true) }),
      );
    expect(runJobs).not.toHaveBeenCalled();
    const production = setup(false);
    await firstValueFrom(
      production.interceptor.intercept(context(), { handle: () => of(true) }),
    );
    expect(production.runJobs).not.toHaveBeenCalled();
  });
  it('refreshes expired holds before public catalog reads in the serverless demo', async () => {
    const { interceptor, runJobs } = setup(true);
    let jobsFinished = false;
    runJobs.mockImplementation(() => {
      jobsFinished = true;
      return Promise.resolve({ processed: 1 });
    });
    const result: unknown = await firstValueFrom(
      interceptor.intercept(context('GET', '/api/v1/sports/services'), {
        handle: () => {
          expect(jobsFinished).toBe(true);
          return of('catalog');
        },
      }),
    );
    expect(result).toBe('catalog');
    expect(runJobs).toHaveBeenCalledTimes(1);
  });
});
