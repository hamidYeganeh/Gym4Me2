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

/** Serverless demos finish durable payment/refund work while a request is alive. */
@Injectable()
export class DemoJobsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DemoJobsInterceptor.name);
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly commerce: CommerceService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context
      .switchToHttp()
      .getRequest<{ method: string; path: string }>();
    const demo = this.config.get('DEMO_MODE', { infer: true }) === true;
    if (
      demo &&
      request.method === 'GET' &&
      /^\/api\/v1\/(?:sports\/services|profile\/training|profile\/coaching-collaboration|sports\/community\/notifications)(?:\/|$)/.test(
        request.path,
      )
    ) {
      return from(this.flush()).pipe(mergeMap(() => next.handle()));
    }
    if (
      this.config.get('DEMO_MODE', { infer: true }) !== true ||
      ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ||
      !/^\/api\/v1\/(?:sports\/account|profile\/coaching|profile\/training|business\/sports|admin\/sports)(?:[/-]|$)/.test(
        request.path,
      )
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        await this.flush();
        return result;
      }),
    );
  }
  private async flush() {
    try {
      await this.commerce.runJobs();
    } catch {
      this.logger.warn('Demo jobs remain pending for the next request');
    }
  }
}
