import { Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { CommerceService } from '../commerce/commerce.service';
import { WebPushService } from './push.service';

export function authorizedPushJob(
  header: string | undefined,
  secret: string | undefined,
) {
  if (!secret || !header) return false;
  const actual = Buffer.from(header),
    expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
@DomainController('system', 'push-jobs')
export class PushJobsController {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly commerce: CommerceService,
    private readonly push: WebPushService,
  ) {}
  @Get() async run(
    @Headers('authorization') authorization: string | undefined,
  ) {
    if (
      !authorizedPushJob(
        authorization,
        this.config.get('PUSH_JOBS_SECRET', { infer: true }),
      )
    )
      throw new UnauthorizedException();
    await this.commerce.runJobs();
    let processed = 0;
    for (let i = 0; i < 3; i++) {
      const result = await this.push.drain();
      processed += result.processed;
      if (result.processed < 6) break;
    }
    return { processed };
  }
}
