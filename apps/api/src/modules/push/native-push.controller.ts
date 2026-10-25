import {
  Body,
  ForbiddenException,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { SchemaBody } from '../clubs/club.contracts';
import { ConsentGuard } from '../profile/consent.guard';
import { NativePushService, nativeSubscription } from './native-push.service';
@DomainController('profile', 'native-push')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class NativePushController {
  constructor(private readonly service: NativePushService) {}
  private actor(r: AuthRequest) {
    if (r.principal.session.client !== 'application')
      throw new ForbiddenException('Growth.denied');
    return r.principal;
  }
  @Get() read(@Req() r: AuthRequest) {
    return this.service.status(this.actor(r));
  }
  @Post() @SchemaBody(nativeSubscription) register(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.register(this.actor(r), parse(nativeSubscription, b));
  }
  @Post('remove') remove(@Req() r: AuthRequest) {
    return this.service.unregister(this.actor(r));
  }
  @Post('test') test(@Req() r: AuthRequest) {
    return this.service.test(this.actor(r));
  }
}
