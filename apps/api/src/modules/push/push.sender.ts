import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import type { Environment } from '../../config/environment';
import { allowedPushEndpoint } from './push.contracts';

export type PushOutcome = 'accepted' | 'expired' | 'retry' | 'failed';
export type PushTarget = {
  endpoint: string;
  p256dh: string;
  auth: string;
  id: string;
  locale: string;
};
export function pushOutcome(error: unknown): PushOutcome {
  const status =
    error && typeof error === 'object' && 'statusCode' in error
      ? error.statusCode
      : 0;
  if (status === 404 || status === 410) return 'expired';
  if (
    status === 429 ||
    status === 0 ||
    (typeof status === 'number' && status >= 500)
  )
    return 'retry';
  return 'failed';
}
@Injectable()
export class WebPushSender {
  constructor(private readonly config: ConfigService<Environment, true>) {}
  async send(target: PushTarget, notificationId: string): Promise<PushOutcome> {
    if (!allowedPushEndpoint(target.endpoint)) return 'failed';
    try {
      // Never send message text, health data, payment amounts or signed media URLs.
      await webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        JSON.stringify({
          version: 1,
          bindingId: target.id,
          notificationId,
          locale: target.locale,
        }),
        {
          vapidDetails: {
            subject: this.config.get('WEB_PUSH_SUBJECT', { infer: true }),
            publicKey: this.config.get('WEB_PUSH_PUBLIC_KEY', { infer: true }),
            privateKey: this.config.get('WEB_PUSH_PRIVATE_KEY', {
              infer: true,
            }),
          },
          TTL: 3600,
          urgency: 'normal',
          timeout: 3500,
        },
      );
      return 'accepted';
    } catch (error) {
      return pushOutcome(error);
    }
  }
}
