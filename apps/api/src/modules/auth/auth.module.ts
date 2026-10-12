import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OtpController, SessionsController } from './auth.controller';
import { AuthGuard, ClientGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { KavenegarService } from './kavenegar.service';
@Module({
  imports: [DatabaseModule],
  controllers: [OtpController, SessionsController],
  providers: [AuthService, KavenegarService, AuthGuard, ClientGuard],
  exports: [AuthService, AuthGuard, ClientGuard],
})
export class AuthModule {}
