import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

export class AuthRateLimit extends HttpException {
  constructor(readonly retryAfter: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many attempts. Try again later.',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

@Catch(AuthRateLimit)
export class AuthRateLimitFilter implements ExceptionFilter<AuthRateLimit> {
  catch(error: AuthRateLimit, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.set('Retry-After', String(error.retryAfter));
    response.status(error.getStatus()).json(error.getResponse());
  }
}
