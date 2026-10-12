import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import type { Environment } from './config/environment';
import { configureApi } from './platform/http/configure-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  app.enableShutdownHooks();
  configureApi(app, {
    corsOrigins: config.get('CORS_ORIGINS', { infer: true }),
    docsEnabled: config.get('API_DOCS_ENABLED', { infer: true }),
  });
  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
