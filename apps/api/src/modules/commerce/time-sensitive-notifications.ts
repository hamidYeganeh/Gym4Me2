import { sql } from 'drizzle-orm';
import type { Db } from '../clubs/club.repository';
import { deliverSportsNotification } from './notification-delivery';

type Job = {
  kind: 'reservation.reminder' | 'waitlist.offered';
  aggregateId: string;
  id: string;
  payload: { occurrenceId?: string };
};

/** Delivery and the relevant state change share the same resource row locks. */
export function deliverTimeSensitiveNotification(db: Db, job: Job) {
  return db.transaction(async (tx) => {
    let userId: string;
    if (job.kind === 'reservation.reminder') {
      if (!job.payload.occurrenceId) return;
      // Match reschedule/host cancellation order: occurrence before reservation.
      const occurrence = await tx.execute<{ id: string }>(sql`
        SELECT id FROM sport_occurrences WHERE id=${job.payload.occurrenceId}
          AND status='scheduled' AND start_at>now()
          AND start_at<=now()+interval '1 hour' FOR SHARE
      `);
      if (!occurrence.rows.length) return;
      const reservation = await tx.execute<{ user_id: string }>(sql`
        SELECT user_id FROM sport_reservations WHERE id=${job.aggregateId}
          AND occurrence_id=${job.payload.occurrenceId} AND status='confirmed' AND checked_in_at IS NULL FOR SHARE
      `);
      if (!reservation.rows[0]) return;
      userId = reservation.rows[0].user_id;
    } else {
      const offer = await tx.execute<{ user_id: string; order_id: string }>(sql`
        SELECT user_id,order_id FROM sport_waitlist WHERE id=${job.aggregateId}
          AND status='offered' AND offer_expires_at>now() FOR SHARE
      `);
      if (!offer.rows[0]) return;
      const order = await tx.execute<{ id: string }>(sql`
        SELECT id FROM sport_orders WHERE id=${offer.rows[0].order_id}
          AND status='awaiting_payment' AND expires_at>now() FOR SHARE
      `);
      if (!order.rows.length) return;
      userId = offer.rows[0].user_id;
    }
    // A worker can already have leased a job that a concurrent mutation retires.
    const pending = await tx.execute<{ id: string }>(sql`
      SELECT id FROM sport_outbox WHERE id=${job.id} AND processed_at IS NULL
    `);
    if (!pending.rows.length) return;
    await deliverSportsNotification(tx, {
      userId,
      title:
        job.kind === 'reservation.reminder'
          ? 'یادآوری جلسه ورزشی'
          : 'ظرفیت برای شما آزاد شد؛ پیشنهاد را بررسی کنید',
      body: '',
      href:
        job.kind === 'reservation.reminder'
          ? `/bookings/detail?id=${job.aggregateId}`
          : '/waitlist',
      sourceKey: `${job.id}:${userId}`,
      ...(job.kind === 'reservation.reminder'
        ? { preference: 'reminders' as const }
        : {}),
    });
  });
}
