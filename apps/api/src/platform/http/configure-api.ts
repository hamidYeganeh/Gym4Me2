import { INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface ApiOptions {
  corsOrigins: string[];
  docsEnabled: boolean;
}

export function configureApi(app: INestApplication, options: ApiOptions): void {
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
