import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import { DatabaseModule } from '../../database/database.module';
import { DemoStorageService } from './demo-storage.service';
import { DemoMediaController } from './demo-media.controller';
@Module({
  imports: [DatabaseModule],
  controllers: [DemoMediaController],
  providers: [
    DemoStorageService,
    {
      provide: StorageService,
      inject: [ConfigService, DemoStorageService],
      useFactory: (
        config: ConfigService<Environment, true>,
        demo: DemoStorageService,
      ) =>
        config.get('DEMO_MODE', { infer: true }) === true
          ? demo
          : new StorageService(config),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
