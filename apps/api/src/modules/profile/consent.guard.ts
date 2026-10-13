import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.guard';
import { PrivacyService } from './privacy.service';
@Injectable()
export class ConsentGuard implements CanActivate {
  constructor(private readonly privacy: PrivacyService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
      await this.privacy.assertConsent(request.principal.user.id);
    return true;
  }
}
