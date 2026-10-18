import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';
import { deliverSportsNotification } from './notification-delivery';

export type OrderNoticeKind =
  'order.confirmed' | 'order.cancelled' | 'refund.process' | 'payment.late';

export async function retireOrderNotices(
  tx: Tx,
  orderId: string,
  kinds: [OrderNoticeKind, ...OrderNoticeKind[]],
) {
  const selected = sql.join(
    kinds.map((kind) => sql`${kind}`),
    sql`, `,
  );
  await tx.execute(sql`
    UPDATE sport_outbox SET processed_at=now(),lease_until=null,last_error=null
    WHERE aggregate_id=${orderId} AND kind IN (${selected}) AND processed_at IS NULL
  `);
  await tx.execute(sql`
    DELETE FROM sport_notifications n USING sport_outbox j,sport_orders o
    WHERE o.id=${orderId} AND j.aggregate_id=o.id AND j.kind IN (${selected})
      AND n.source_key=j.id::text||':'||o.user_id::text AND n.read_at IS NULL
  `);
}

export function deliverOrderNotification(
  db: Db,
  job: {
    id: string;
    aggregateId: string;
    kind: OrderNoticeKind;
    payload: { refundId?: string };
  },
) {
  return db.transaction(async (tx) => {
    const { rows: orders } = await tx.execute<{
      user_id: string;
      status: string;
      snapshot: { title: string; kind: string };
    }>(
      sql`SELECT user_id,status,snapshot FROM sport_orders WHERE id=${job.aggregateId} FOR SHARE`,
    );
    const order = orders[0];
    if (!order) return;
    const pending = await tx.execute(
      sql`SELECT id FROM sport_outbox WHERE id=${job.id} AND processed_at IS NULL`,
    );
    if (!pending.rows.length) return;
    const deliver = (title: string, sourceKey = `${job.id}:${order.user_id}`) =>
      deliverSportsNotification(tx, {
        userId: order.user_id,
        title,
        body: order.snapshot.title,
        href: `/orders/detail?id=${job.aggregateId}`,
        sourceKey,
      });
    if (job.kind === 'refund.process') {
      // Legacy work used the job as its notice key; don't duplicate a notice
      // already committed by the previous worker before its acknowledgement.
      const previous = await tx.execute(
        sql`SELECT id FROM sport_notifications WHERE source_key=${`${job.id}:${order.user_id}`}`,
      );
      if (previous.rows.length) return;
      const refunds = await tx.execute<{ id: string }>(sql`
        SELECT id FROM sport_refunds WHERE order_id=${job.aggregateId}
          AND state='succeeded' AND amount_minor>0
          ${job.payload.refundId ? sql`AND id=${job.payload.refundId}` : sql``}
        ORDER BY id
      `);
      for (const refund of refunds.rows)
        await deliver(
          'استرداد وجه شما انجام شد',
          `refund:${refund.id}:${order.user_id}`,
        );
      return;
    }
    if (job.kind === 'order.confirmed') {
      if (!['paid', 'partially_paid'].includes(order.status)) return;
      const approval = await tx.execute<{ pending: boolean }>(sql`
        SELECT EXISTS(SELECT 1 FROM sport_reservations
          WHERE order_id=${job.aggregateId} AND status='pending_approval') pending
      `);
      return deliver(
        approval.rows[0].pending
          ? 'درخواست رزرو در انتظار تأیید میزبان است'
          : order.snapshot.kind === 'membership'
            ? 'عضویت شما فعال شد'
            : 'خرید شما ثبت شد',
      );
    }
    if (job.kind === 'order.cancelled') {
      if (
        ['cancelled', 'partially_refunded', 'refunded'].includes(order.status)
      )
        return deliver('سفارش شما لغو شد');
      return;
    }
    if (order.status === 'review')
      return deliver('پرداخت شما نیاز به بررسی دارد');
  });
}
