import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { map } from 'rxjs';
import { hasMessage, resolveLocale, translate } from '@repo/i18n/backend';

type Locale = 'fa' | 'en';
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
function localizeFields(value: unknown, locale: Locale) {
  if (!Array.isArray(value)) return undefined;
  return value.map((item: unknown) => {
    const field = record(item);
    const code = hasMessage(field.message)
      ? field.message
      : 'Backend.invalidField';
    return { ...field, code, message: translate(code, locale) };
  });
}
@Catch()
export class LocaleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LocaleExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    // Driver errors can embed SQL parameters, including phone numbers or token
    // hashes. Keep raw exceptions out of general logs in every environment.
    if (!(exception instanceof HttpException))
      this.logger.error(
        'Unexpected HTTP failure; sensitive exception details suppressed.',
      );
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const locale = resolveLocale(request.headers['accept-language']);
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const details = record(payload);
    // Keep the existing machine-readable system readiness contract intact.
    if (
      status === 503 &&
      details.status === 'error' &&
      details.service === 'gym4me-api'
    ) {
      response.status(status).json(details);
      return;
    }
    const message = typeof payload === 'string' ? payload : details.message;
    const code = hasMessage(message)
      ? message
      : status >= 500
        ? 'Backend.unexpectedError'
        : 'Backend.requestFailed';
    const parameters = record(details.parameters);
    const safeParameters = Object.fromEntries(
      Object.entries(parameters).filter(
        ([, value]) => typeof value === 'string' || typeof value === 'number',
      ),
    ) as Record<string, string | number>;
    response.setHeader('Content-Language', locale);
    response.status(status).json({
      statusCode: status,
      code,
      message: translate(code, locale, safeParameters),
      ...(Object.keys(safeParameters).length
        ? { parameters: safeParameters }
        : {}),
      ...(Array.isArray(details.fields)
        ? { fields: localizeFields(details.fields, locale) }
        : {}),
    });
  }
}
@Injectable()
export class ReadinessLocalizationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const locale = resolveLocale(request.headers['accept-language']);
    // Only the explicit publication-readiness contract contains message codes.
    return next.handle().pipe(
      map((value: unknown) => {
        const data = record(value);
        if (typeof data.ready === 'boolean' && Array.isArray(data.errors))
          return { ...data, errors: localizeFields(data.errors, locale) };
        return value;
      }),
    );
  }
}
