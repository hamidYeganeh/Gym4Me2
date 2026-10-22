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
import { ConsentGuard } from '../profile/consent.guard';
import { subscriptionSchema } from './push.contracts';
import { WebPushService } from './push.service';

@DomainController('system', 'push')
export class PushConfigurationController {
  constructor(private readonly service: WebPushService) {}
  @Get() configuration() {
    return this.service.configuration();
  }
}
@DomainController('profile', 'push')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard)
export class WebPushController {
  constructor(private readonly service: WebPushService) {}
  private principal(req: AuthRequest) {
    if (
      req.principal.session.client !== 'application' ||
      req.principal.session.transport !== 'web'
    )
      throw new ForbiddenException();
    return req.principal;
  }
  @Get() status(@Req() req: AuthRequest) {
    return this.service.status(this.principal(req));
  }
  @Post('subscribe')
  @UseGuards(ConsentGuard)
  subscribe(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.service.subscribe(
      this.principal(req),
      parse(subscriptionSchema, body),
    );
  }
  @Post('unsubscribe') unsubscribe(@Req() req: AuthRequest) {
    return this.service.unsubscribe(this.principal(req));
  }
  @Post('test')
  @UseGuards(ConsentGuard)
  test(@Req() req: AuthRequest) {
    return this.service.test(this.principal(req));
  }
}
