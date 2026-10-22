import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { WebPushService } from './push.service';
import { RequestDueWork } from '../commerce/request-due-work';

/** Outer interceptor: awaited AFTER the domain jobs interceptor commits notices. */
@Injectable()
export class WebPushInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebPushInterceptor.name);
  private readonly due: RequestDueWork;
  constructor(service: WebPushService) {
    this.due = new RequestDueWork(async () => {
      await service.drain();
    });
  }
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context
      .switchToHttp()
      .getRequest<{ method: string; path: string }>();
    if (
      !/^\/api\/v1\/(?:sports|profile|business|admin)(?:\/|$)/.test(req.path) ||
      req.path.includes('/profile/push')
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        try {
          await this.due.run(
            ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
              ? 'read'
              : 'command',
          );
        } catch {
          this.logger.warn('Web Push work remains queued for retry');
        }
        return result;
      }),
    );
  }
}
