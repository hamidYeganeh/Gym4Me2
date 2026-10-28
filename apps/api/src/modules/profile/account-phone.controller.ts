import { ForbiddenException, Post, UseGuards } from '@nestjs/common';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard } from '../auth/auth.guard';
import { ConsentGuard } from './consent.guard';
@DomainController('profile', 'account')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AccountPhoneController {
  @Post('phone/request') request() {
    throw new ForbiddenException('Backend.phoneChangesDisabled');
  }
  @Post('phone/verify') verify() {
    throw new ForbiddenException('Backend.phoneChangesDisabled');
  }
}
