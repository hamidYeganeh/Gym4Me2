import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { connect } from 'node:http2';
import { sign } from 'node:crypto';
import type { Environment } from '../../config/environment';
export type NativeDevice = {
  id: string;
  platform: 'android' | 'ios';
  token: string;
  locale: string;
};
export type NativeOutcome = 'accepted' | 'expired' | 'retry' | 'failed';
@Injectable()
export class NativePushSender {
  private auth?: GoogleAuth;
  constructor(private readonly config: ConfigService<Environment, true>) {}
  configuration() {
    return {
      android: !!this.config.get('FCM_SERVICE_ACCOUNT_JSON', { infer: true }),
      ios: !!(
        this.config.get('APNS_PRIVATE_KEY', { infer: true }) &&
        this.config.get('APNS_KEY_ID', { infer: true }) &&
        this.config.get('APNS_TEAM_ID', { infer: true })
      ),
    };
  }
  async send(
    device: NativeDevice,
    notificationId: string,
  ): Promise<NativeOutcome> {
    try {
      return device.platform === 'android'
        ? await this.android(device, notificationId)
        : await this.ios(device, notificationId);
    } catch {
      return 'retry';
    }
  }
  private async android(d: NativeDevice, id: string): Promise<NativeOutcome> {
    const raw = this.config.get('FCM_SERVICE_ACCOUNT_JSON', { infer: true });
    if (!raw) return 'failed';
    const credentials = JSON.parse(raw) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    if (!/^[a-z][a-z0-9-]{4,62}$/.test(credentials.project_id)) return 'failed';
    this.auth ??= new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const token = await this.auth.getAccessToken();
    if (!token) return 'retry';
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`,
      {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: d.token,
            notification: {
              title: 'Gym4Me',
              body:
                d.locale === 'fa'
                  ? 'اعلان تازه در برنامه داری.'
                  : 'You have a new notification.',
            },
            data: { notificationId: id, bindingId: d.id },
            android: {
              ttl: '3600s',
              notification: { tag: `gym4me:${id}`, channel_id: 'gym4me' },
            },
          },
        }),
      },
    );
    if (response.ok) {
      await response.body?.cancel();
      return 'accepted';
    }
    const failure = (await response.json().catch(() => ({}))) as {
      error?: { details?: { errorCode?: string }[] };
    };
    if (failure.error?.details?.some((e) => e.errorCode === 'UNREGISTERED'))
      return 'expired';
    return response.status === 429 || response.status >= 500
      ? 'retry'
      : 'failed';
  }
  private async ios(d: NativeDevice, id: string): Promise<NativeOutcome> {
    const key = this.config.get('APNS_PRIVATE_KEY', { infer: true }),
      keyId = this.config.get('APNS_KEY_ID', { infer: true }),
      team = this.config.get('APNS_TEAM_ID', { infer: true });
    if (!key || !keyId || !team) return 'failed';
    const encode = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString('base64url');
    const input =
      encode({ alg: 'ES256', kid: keyId }) +
      '.' +
      encode({ iss: team, iat: Math.floor(Date.now() / 1000) });
    const jwt =
      input +
      '.' +
      sign('sha256', Buffer.from(input), {
        key,
        dsaEncoding: 'ieee-p1363',
      }).toString('base64url');
    return new Promise((resolve) => {
      const client = connect(
        this.config.get('APNS_SANDBOX', { infer: true })
          ? 'https://api.sandbox.push.apple.com'
          : 'https://api.push.apple.com',
      );
      let finished = false;
      const done = (outcome: NativeOutcome) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        client.destroy();
        resolve(outcome);
      };
      const timer = setTimeout(() => done('retry'), 8000);
      client.on('error', () => done('retry'));
      const request = client.request({
        ':method': 'POST',
        ':path': `/3/device/${d.token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': 'com.gym4me.app',
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-collapse-id': id,
        'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
      });
      request.on('response', (headers) => {
        const status = Number(headers[':status']);
        request.resume();
        request.on('end', () =>
          done(
            status === 200
              ? 'accepted'
              : status === 410
                ? 'expired'
                : status === 429 || status >= 500
                  ? 'retry'
                  : 'failed',
          ),
        );
      });
      request.on('error', () => done('retry'));
      request.end(
        JSON.stringify({
          aps: {
            alert: {
              title: 'Gym4Me',
              body:
                d.locale === 'fa'
                  ? 'اعلان تازه در برنامه داری.'
                  : 'You have a new notification.',
            },
            sound: 'default',
          },
          notificationId: id,
          bindingId: d.id,
        }),
      );
    });
  }
}
