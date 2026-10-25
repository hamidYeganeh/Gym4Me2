import {
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import type { Principal } from '../auth/auth.service';
import { lockWritableAccount } from '../auth/account-lock';
import { deliverSportsNotification } from '../commerce/notification-delivery';
import { rows } from '../commerce/commerce.service';
import { NativePushSender, type NativeDevice } from './native-push.sender';
export const nativeSubscription = z
  .object({
    platform: z.enum(['android', 'ios']),
    token: z
      .string()
      .min(20)
      .max(4096)
      .regex(/^[A-Za-z0-9:_-]+$/),
    locale: z.enum(['fa', 'en']),
  })
  .strict()
  .refine((v) => v.platform !== 'ios' || /^[a-fA-F0-9]{64}$/.test(v.token));
@Injectable()
export class NativePushService {
  constructor(
    private readonly database: DatabaseService,
    private readonly sender: NativePushSender,
  ) {}
  private get db() {
    return this.database.db;
  }
  async status(p: Principal) {
    const [device] = await rows(
      this.db,
      sql`SELECT id,platform FROM native_push_devices WHERE user_id=${p.user.id} AND session_id=${p.session.id}`,
    );
    return { ...this.sender.configuration(), device: device ?? null };
  }
  async register(p: Principal, input: z.infer<typeof nativeSubscription>) {
    if (!this.sender.configuration()[input.platform])
      throw new ServiceUnavailableException('Backend.nativePushUnavailable');
    return this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, p.user.id, 'update');
      const live = await rows(
        tx,
        sql`SELECT id FROM auth_sessions WHERE id=${p.session.id} AND user_id=${p.user.id} AND client='application' AND transport='native' AND revoked_at IS NULL AND expires_at>now() FOR SHARE`,
      );
      if (!live.length)
        throw new ConflictException('Backend.theSessionHasEndedSignInAgain');
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${input.token},48))`,
      );
      await tx.execute(
        sql`DELETE FROM native_push_devices d USING auth_sessions s WHERE d.token=${input.token} AND s.id=d.session_id AND (s.revoked_at IS NOT NULL OR s.expires_at<=now())`,
      );
      const occupied = await rows(
        tx,
        sql`SELECT id FROM native_push_devices WHERE token=${input.token} AND (user_id<>${p.user.id} OR session_id<>${p.session.id})`,
      );
      if (occupied.length)
        throw new ConflictException('Backend.pushDeviceAlreadyRegistered');
      const [saved] = await rows<{ id: string }>(
        tx,
        sql`INSERT INTO native_push_devices(user_id,session_id,platform,token,locale) VALUES(${p.user.id},${p.session.id},${input.platform},${input.token},${input.locale}) ON CONFLICT(session_id) DO UPDATE SET platform=excluded.platform,token=excluded.token,locale=excluded.locale,updated_at=now() RETURNING id`,
      );
      return saved;
    });
  }
  async unregister(p: Principal) {
    await this.db.execute(
      sql`DELETE FROM native_push_devices WHERE user_id=${p.user.id} AND session_id=${p.session.id}`,
    );
    return { success: true };
  }
  async test(p: Principal) {
    const id = await this.db.transaction(async (tx) => {
      await lockWritableAccount(tx, p.user.id);
      const [d] = await rows(
        tx,
        sql`UPDATE native_push_devices SET last_test_at=now() WHERE user_id=${p.user.id} AND session_id=${p.session.id} AND (last_test_at IS NULL OR last_test_at<now()-interval '30 seconds') RETURNING id`,
      );
      if (!d) throw new HttpException('Backend.pushTestWait', 429);
      return deliverSportsNotification(tx, {
        userId: p.user.id,
        title: 'Gym4Me',
        body: '',
        href: '/notifications',
        sourceKey: `native-test:${randomUUID()}`,
      });
    });
    await this.drain();
    const [delivery] = await rows(
      this.db,
      sql`SELECT result FROM native_push_deliveries d JOIN native_push_devices device ON device.id=d.device_id WHERE d.notification_id=${id} AND device.session_id=${p.session.id}`,
    );
    return { result: delivery?.result ?? 'queued' };
  }
  async drain() {
    const jobs = await this.db.transaction((tx) =>
      rows<{
        id: string;
        device_id: string;
        notification_id: string;
        attempts: number;
      }>(
        tx,
        sql`UPDATE native_push_deliveries SET lease_until=now()+interval '1 minute',attempts=attempts+1 WHERE id IN(SELECT id FROM native_push_deliveries WHERE finished_at IS NULL AND due_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT 6) RETURNING *`,
      ),
    );
    for (const job of jobs)
      await this.db.transaction(async (tx) => {
        const [owner] = await rows<{ user_id: string; session_id: string }>(
          tx,
          sql`SELECT user_id,session_id FROM native_push_devices WHERE id=${job.device_id}`,
        );
        if (!owner) return;
        const active = await rows(
          tx,
          sql`SELECT id FROM users WHERE id=${owner.user_id} AND status='active' AND NOT deletion_pending AND deleted_at IS NULL FOR SHARE`,
        );
        const session = await rows(
          tx,
          sql`SELECT id FROM auth_sessions WHERE id=${owner.session_id} AND user_id=${owner.user_id} AND client='application' AND transport='native' AND revoked_at IS NULL AND expires_at>now() FOR SHARE`,
        );
        const [target] = await rows<NativeDevice>(
          tx,
          sql`SELECT d.id,d.platform,d.token,d.locale FROM native_push_devices d JOIN sport_notifications n ON n.id=${job.notification_id} AND n.user_id=d.user_id LEFT JOIN sport_notification_preferences p ON p.user_id=d.user_id WHERE d.id=${job.device_id} AND n.read_at IS NULL AND n.created_at>now()-interval '1 hour' AND CASE n.preference WHEN 'messages' THEN coalesce(p.messages,true) WHEN 'reminders' THEN coalesce(p.reminders,true) WHEN 'invitations' THEN coalesce(p.invitations,true) ELSE true END FOR SHARE OF d,n`,
        );
        const result =
          active.length && session.length && target
            ? await this.sender.send(target, job.notification_id)
            : 'skipped';
        if (result === 'expired') {
          await tx.execute(
            sql`DELETE FROM native_push_devices WHERE id=${job.device_id}`,
          );
          return;
        }
        if (result === 'retry' && job.attempts < 6)
          await tx.execute(
            sql`UPDATE native_push_deliveries SET lease_until=null,due_at=now()+${30 * 2 ** job.attempts}*interval '1 second' WHERE id=${job.id}`,
          );
        else
          await tx.execute(
            sql`UPDATE native_push_deliveries SET finished_at=now(),lease_until=null,result=${result === 'retry' ? 'failed' : result} WHERE id=${job.id}`,
          );
      });
    await this.db.execute(
      sql`DELETE FROM native_push_devices d USING auth_sessions s WHERE d.session_id=s.id AND (s.revoked_at IS NOT NULL OR s.expires_at<=now())`,
    );
    await this.db.execute(
      sql`DELETE FROM native_push_deliveries WHERE finished_at<now()-interval '7 days' OR due_at<now()-interval '1 day'`,
    );
    return { processed: jobs.length };
  }
}
