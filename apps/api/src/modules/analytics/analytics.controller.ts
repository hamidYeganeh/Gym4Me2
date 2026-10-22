import { Get, Query, Req, UseGuards } from '@nestjs/common';
import { DomainController } from '../../platform/http/domain-controller.decorator';
import { ClientHeader, parse } from '../auth/auth.contracts';
import { AuthGuard, ClientGuard, type AuthRequest } from '../auth/auth.guard';
import { ConsentGuard } from '../profile/consent.guard';
import { AnalyticsService } from './analytics.service';
import { analyticsFilters } from './analytics.contracts';

@DomainController('admin', 'analytics')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class AdminAnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get() report(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.report(
      r.principal,
      'admin',
      parse(analyticsFilters, q),
    );
  }
}
@DomainController('business', 'analytics')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class BusinessAnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get() report(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.report(
      r.principal,
      'business',
      parse(analyticsFilters, q),
    );
  }
}
@DomainController('profile', 'coach-analytics')
@ClientHeader()
@UseGuards(ClientGuard, AuthGuard, ConsentGuard)
export class CoachAnalyticsController {
  constructor(private readonly service: AnalyticsService) {}
  @Get() report(@Req() r: AuthRequest, @Query() q: unknown) {
    return this.service.report(
      r.principal,
      'coach',
      parse(analyticsFilters, q),
    );
  }
}
