import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';

@Injectable()
export class KavenegarService {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  async sendOtp(phone: string, code: string): Promise<void> {
    const key = this.config.get('KAVENEGAR_API_KEY', { infer: true });
    if (
      this.config.get('SMS_PROVIDER', { infer: true }) !== 'kavenegar' ||
      !key
    )
      throw new ServiceUnavailableException(
        'Backend.smsDeliveryIsNotConfiguredYet',
      );
    const appHash = this.config.get('KAVENEGAR_ANDROID_APP_HASH', {
      infer: true,
    });
    try {
      const response = await fetch(
        `https://api.kavenegar.com/v1/${key}/verify/lookup.json`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            receptor: phone.replace('+98', '0'),
            token: code,
            ...(appHash ? { token2: appHash } : {}),
            template: this.config.get('KAVENEGAR_OTP_TEMPLATE', {
              infer: true,
            }),
            type: 'sms',
          }),
          signal: AbortSignal.timeout(10000),
          redirect: 'error',
        },
      );
      const data = (await response.json()) as { return?: { status?: number } };
      if (!response.ok || data.return?.status !== 200)
        throw new Error('Provider rejected delivery');
    } catch {
      // Provider errors can include the key, phone and OTP. Never log or return them.
      throw new ServiceUnavailableException(
        'Backend.couldNotSendSmsTryAgainLater',
      );
    }
  }
}
