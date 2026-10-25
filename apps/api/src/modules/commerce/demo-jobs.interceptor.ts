import { AdvancedBusinessService } from '../advanced-business/ph5.service';
import { GamesService } from '../growth/games.service';
import { Optional } from '@nestjs/common';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { from, mergeMap } from 'rxjs';
import type { Environment } from '../../config/environment';
import { CommerceService } from './commerce.service';
import { RequestDueWork } from './request-due-work';

/** Serverless demos finish durable payment/refund work while a request is alive. */
@Injectable()
export class DemoJobsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DemoJobsInterceptor.name);
  private readonly dueWork: RequestDueWork;
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly commerce: CommerceService,
    @Optional() private readonly advanced?: AdvancedBusinessService,
    @Optional() private readonly games?: GamesService,
  ) {
    this.dueWork = new RequestDueWork(async () => {
      await this.commerce.runJobs();
      await this.advanced?.reconcileDue();
      await this.games?.runDue();
    });
  }
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; path: string }>();
    const demo = this.config.get('DEMO_MODE', { infer: true }) === true;
    if (
      demo &&
      request.method === 'GET' &&
      /^\/api\/v1\/(?:sports\/(?:services|games)|profile\/training|profile\/coaching-collaboration|sports\/community\/notifications|business\/advanced|profile\/settlements)(?:\/|$)/.test(
        request.path,
      )
    ) {
      return from(this.flush('read')).pipe(mergeMap(() => next.handle()));
    }
    if (
      this.config.get('DEMO_MODE', { infer: true }) !== true ||
      ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ||
      !/^\/api\/v1\/(?:sports\/(?:account|payment-callbacks)|profile\/coaching|profile\/training|business\/sports|business\/advanced|profile\/settlements|admin\/advanced|admin\/sports)(?:[/-]|$)/.test(
        request.path,
      )
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        await this.flush('command');
        return result;
      }),
    );
  }
  private async flush(mode: 'read' | 'command') {
    try {
      await this.dueWork.run(mode);
    } catch {
      this.logger.warn('Demo jobs remain pending for the next request');
    }
  }
}
