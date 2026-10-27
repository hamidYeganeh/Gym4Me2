import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Environment } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import type { Principal } from '../auth/auth.service';
import { lockWritableAccount } from '../auth/account-lock';
import { deliverSportsNotification } from '../commerce/notification-delivery';
import type { PushSubscriptionInput } from './push.contracts';
import { WebPushSender, type PushTarget } from './push.sender';

@Injectable()
export class WebPushService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
    private readonly sender: WebPushSender,
  ) {}
  configuration() {
    const enabled =
      this.config.get('PUSH_PROVIDER', { infer: true }) === 'web-push';
    return {
      enabled,
      publicKey: enabled
        ? this.config.get('WEB_PUSH_PUBLIC_KEY', { infer: true })
        : null,
    };
  }
  private get db() {
    return this.database.db;
  }
  async status(p: Principal) {
    const { rows } = await this.db.execute<{ id: string }>(
      sql`SELECT id FROM web_push_subscriptions WHERE user_id=${p.user.id} AND session_id=${p.session.id}`,
    );
    return { ...this.configuration(), subscriptionId: rows[0]?.id ?? null };
  }
  async subscribe(p: Principal, input: PushSubscriptionInput) {
    if (!this.configuration().enabled) throw new ServiceUnavailableException();
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, p.user.id, 'update');
      const live = await tx.execute(
        sql`SELECT id FROM auth_sessions WHERE id=${p.session.id} AND user_id=${p.user.id} AND revoked_at IS NULL AND expires_at>now() AND client='application' AND transport='web' FOR SHARE`,
      );
      if (!live.rows.length)
        throw new ConflictException('Backend.theSessionHasEndedSignInAgain');
      // Serialize the same browser endpoint across accounts without exposing its owner.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.endpoint},36))`,
      );
      await tx.execute(
        sql`DELETE FROM web_push_subscriptions p USING auth_sessions s WHERE p.endpoint=${input.endpoint} AND s.id=p.session_id AND (s.revoked_at IS NOT NULL OR s.expires_at<=now())`,
      );
      const occupied = await tx.execute(
        sql`SELECT id FROM web_push_subscriptions WHERE endpoint=${input.endpoint} AND (user_id<>${p.user.id} OR session_id<>${p.session.id})`,
      );
      if (occupied.rows.length)
        throw new ConflictException('Backend.pushDeviceAlreadyRegistered');
      const { rows } = await tx.execute<{ id: string }>(sql`
    INSERT INTO web_push_subscriptions(user_id,session_id,endpoint,p256dh,auth,locale)
    VALUES(${p.user.id},${p.session.id},${input.endpoint},${input.keys.p256dh},${input.keys.auth},${input.locale})
    ON CONFLICT(session_id) DO UPDATE SET endpoint=EXCLUDED.endpoint,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,locale=EXCLUDED.locale,updated_at=now()
    RETURNING id`);
      return { subscriptionId: rows[0].id };
    });
  }
  async unsubscribe(p: Principal) {
    await this.db.execute(
      sql`DELETE FROM web_push_subscriptions WHERE user_id=${p.user.id} AND session_id=${p.session.id}`,
    );
    return { success: true };
  }
  async test(p: Principal) {
    if (!this.configuration().enabled) throw new ServiceUnavailableException();
    const notificationId = await this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, p.user.id);
      const { rows } = await tx.execute<{ id: string }>(
        sql`UPDATE web_push_subscriptions SET last_test_at=now() WHERE user_id=${p.user.id} AND session_id=${p.session.id} AND (last_test_at IS NULL OR last_test_at<now()-interval '30 seconds') RETURNING id`,
      );
      if (!rows[0]) throw new HttpException('Backend.pushTestWait', 429);
      const id = await deliverSportsNotification(tx, {
        userId: p.user.id,
        title: 'Gym4Me',
        body: '',
        href: '/notifications',
        sourceKey: `push-test:${randomUUID()}`,
      });
      if (!id) throw new ConflictException();
      await tx.execute(
        sql`DELETE FROM web_push_deliveries WHERE notification_id=${id} AND subscription_id<>${rows[0].id}`,
      );
      return id;
    });
    await this.drain();
    const { rows } = await this.db.execute<{ result: string | null }>(
      sql`SELECT d.result FROM web_push_deliveries d JOIN web_push_subscriptions s ON s.id=d.subscription_id WHERE d.notification_id=${notificationId} AND s.session_id=${p.session.id}`,
    );
    return {
      status:
        rows[0]?.result === 'accepted'
          ? 'accepted'
          : rows[0] && rows[0].result === null
            ? 'queued'
            : 'failed',
    };
  }
  async drain() {
    if (!this.configuration().enabled) return { processed: 0 };
    // Short HTTP timeout and bounded batch keep serverless requests alive until send.
    const { rows: jobs } = await this.db.transaction((tx) =>
      tx.execute<{
        id: string;
        subscription_id: string;
        notification_id: string;
        attempts: number;
      }>(sql`
   UPDATE web_push_deliveries SET lease_until=now()+interval '90 seconds',attempts=attempts+1
   WHERE id IN(SELECT id FROM web_push_deliveries WHERE finished_at IS NULL AND due_at<=now()
    AND (lease_until IS NULL OR lease_until<now()) AND attempts<6 ORDER BY due_at,id FOR UPDATE SKIP LOCKED LIMIT 6)
   RETURNING id,subscription_id,notification_id,attempts`),
    );
    // Two parallel vendor calls maximum; never launch an unbounded fanout.
    for (let offset = 0; offset < jobs.length; offset += 2)
      await Promise.all(
        jobs.slice(offset, offset + 2).map(async (job) => {
          await this.db.transaction(async (tx) => {
            const { rows: owner } = await tx.execute<{
              user_id: string;
              session_id: string;
            }>(
              sql`SELECT user_id,session_id FROM web_push_subscriptions WHERE id=${job.subscription_id}`,
            );
            const user = owner[0];
            if (!user) return;
            // Same lock order as subscribe/account deletion; revoke cannot finish mid-send.
            const account = await tx.execute(
              sql`SELECT id FROM users WHERE id=${user.user_id} AND status='active' AND deleted_at IS NULL AND NOT deletion_pending FOR SHARE`,
            );
            const session = await tx.execute(
              sql`SELECT id FROM auth_sessions WHERE id=${user.session_id} AND user_id=${user.user_id} AND revoked_at IS NULL AND expires_at>now() AND client='application' AND transport='web' FOR SHARE`,
            );
            const { rows: targets } = await tx.execute<PushTarget>(sql`
     SELECT p.id,p.endpoint,p.p256dh,p.auth,p.locale FROM web_push_subscriptions p
     JOIN sport_notifications n ON n.id=${job.notification_id} AND n.user_id=p.user_id
     LEFT JOIN sport_notification_preferences pref ON pref.user_id=p.user_id
     WHERE p.id=${job.subscription_id} AND n.read_at IS NULL AND n.created_at>now()-interval '1 hour'
     AND CASE n.preference WHEN 'messages' THEN coalesce(pref.messages,true)
       WHEN 'reminders' THEN coalesce(pref.reminders,true) WHEN 'invitations' THEN coalesce(pref.invitations,true) ELSE true END
     FOR SHARE OF p,n`);
            let outcome:
              'accepted' | 'expired' | 'retry' | 'failed' | 'skipped' =
              'skipped';
            if (account.rows.length && session.rows.length && targets[0])
              outcome = await this.sender.send(targets[0], job.notification_id);
            if (outcome === 'expired') {
              await tx.execute(
                sql`DELETE FROM web_push_subscriptions WHERE id=${job.subscription_id}`,
              );
              return;
            }
            if (outcome === 'retry' && job.attempts < 6) {
              await tx.execute(
                sql`UPDATE web_push_deliveries SET lease_until=null,due_at=now()+${Math.min(1800, 30 * 2 ** job.attempts)}*interval '1 second' WHERE id=${job.id}`,
              );
            } else
              await tx.execute(
                sql`UPDATE web_push_deliveries SET finished_at=now(),lease_until=null,result=${outcome === 'retry' ? 'failed' : outcome} WHERE id=${job.id}`,
              );
          });
        }),
      );
    await this.db.execute(
      sql`DELETE FROM web_push_subscriptions p USING auth_sessions s WHERE p.session_id=s.id AND (s.revoked_at IS NOT NULL OR s.expires_at<=now())`,
    );
    await this.db.execute(
      sql`DELETE FROM web_push_deliveries WHERE finished_at<now()-interval '7 days' OR (finished_at IS NULL AND due_at<now()-interval '1 day')`,
    );
    return { processed: jobs.length };
  }
}
