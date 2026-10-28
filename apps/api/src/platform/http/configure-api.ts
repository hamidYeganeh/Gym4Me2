import { INestApplication, VersioningType } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  LocaleExceptionFilter,
  ReadinessLocalizationInterceptor,
} from './localization';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface ApiOptions {
  corsOrigins: string[];
  docsEnabled: boolean;
  trustLoopbackProxy?: boolean;
}

export function configureApi(app: INestApplication, options: ApiOptions): void {
  if (options.trustLoopbackProxy) {
    // The VPS binds the API to loopback; nginx replaces incoming forwarded IPs.
    // Trust only local hops, never an arbitrary caller or a fixed hop count.
    const adapter = app.getHttpAdapter();
    if (!(adapter instanceof ExpressAdapter))
      throw new Error('Trusted loopback proxy requires the Express adapter');
    adapter.set('trust proxy', 'loopback');
  }
  app.use(
    (
      _req: unknown,
      res: { setHeader: (name: string, value: string) => void },
      next: () => void,
    ) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
  );
  app.useGlobalFilters(new LocaleExceptionFilter());
  app.useGlobalInterceptors(new ReadinessLocalizationInterceptor());
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({ origin: options.corsOrigins, credentials: true });

  if (options.docsEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Gym4Me API')
      .setDescription(
        'Versioned APIs: /api/v1/{domain}/{feature}/{action-or-resource}',
      )
      .setVersion('1')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/system/docs', app, document, {
      jsonDocumentUrl: '/api/v1/system/docs/json',
      yamlDocumentUrl: '/api/v1/system/docs/yaml',
    });
  }
}
