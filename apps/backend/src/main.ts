import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const origins = (
    process.env.APPLICANT_ORIGINS ??
    'http://localhost:3000,http://localhost,capacitor://localhost'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const trustedProxies = process.env.AUTH_TRUSTED_PROXIES?.split(',')
    .map((proxy) => proxy.trim())
    .filter(Boolean);
  if (trustedProxies?.length) app.set('trust proxy', trustedProxies);
  app.enableCors({
    origin: origins,
    exposedHeaders: ['Retry-After'],
    methods: ['GET', 'POST', 'PATCH'],
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3003);
}
void bootstrap();
