import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs';
import { GamesService } from './games.service';
@Injectable()
export class GamesInterceptor implements NestInterceptor {
  private readonly logger = new Logger(GamesInterceptor.name);
  constructor(private readonly games: GamesService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const r = context
      .switchToHttp()
      .getRequest<{ method: string; path: string }>();
    if (
      r.method !== 'POST' ||
      !/^\/api\/v1\/(sports\/(?:payment-callbacks|account)|profile\/games)(?:\/|$)/.test(
        r.path,
      )
    )
      return next.handle();
    return next.handle().pipe(
      mergeMap(async (result: unknown) => {
        try {
          await this.games.runDue();
        } catch {
          this.logger.warn(
            'Group funding remains pending for the durable worker.',
          );
        }
        return result;
      }),
    );
  }
}
