import { Module } from '@nestjs/common';
import { ApiConfigModule } from './config/api-config.module';
import { SystemModule } from './modules/system/system.module';

import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces.module';

@Module({
  imports: [ApiConfigModule, SystemModule, AuthModule, WorkspacesModule],
})
export class AppModule {}
