import { NativePushService } from '../push/native-push.service';
import { AdvancedBusinessService } from '../advanced-business/ph5.service';
import { LegacyGroupReconciliationService } from '../commerce/legacy-group-reconciliation.service';
import { Optional } from '@nestjs/common';
import { Get, Headers, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { CommerceService } from '../commerce/commerce.service';
import { WebPushService } from './push.service';
import { RetentionService } from '../profile/retention.service';

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
    @Optional() private readonly advanced?: AdvancedBusinessService,
    @Optional() private readonly games?: LegacyGroupReconciliationService,
    @Optional() private readonly nativePush?: NativePushService,
    @Optional() private readonly retention?: RetentionService,
  ) {}
  @Get('retention') async retain(
    @Headers('authorization') authorization: string | undefined,
  ) {
    if (
      !authorizedPushJob(
        authorization,
        this.config.get('PUSH_JOBS_SECRET', { infer: true }),
      )
    )
      throw new UnauthorizedException();
    if (!this.retention) throw new Error('Retention service is unavailable.');
    return this.retention.run(true);
  }
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
    await this.advanced?.reconcileDue();
    await this.games?.runDue();
    let processed = 0;
    for (let i = 0; i < 3; i++) {
      const result = await this.push.drain();
      await this.nativePush?.drain();
      processed += result.processed;
      if (result.processed < 6) break;
    }
    return { processed };
  }
}
