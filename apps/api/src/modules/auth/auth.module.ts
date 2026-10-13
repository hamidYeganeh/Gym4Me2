import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OtpController, SessionsController } from './auth.controller';
import { AuthGuard, ClientGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { KavenegarService } from './kavenegar.service';
@Module({
  imports: [DatabaseModule],
  controllers: [OtpController, SessionsController, PasswordController],
  providers: [
    PasswordService,
    AuthService,
    KavenegarService,
    AuthGuard,
    ClientGuard,
  ],
  exports: [AuthService, AuthGuard, ClientGuard],
})
export class AuthModule {}
