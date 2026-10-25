import { ConflictException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';
import { deliverSportsNotification } from './notification-delivery';

/** Queries bind the membership as m. FIFO allocation uses only verified,
 * non-refunded payments, so receipt submissions never extend access. */
export const membershipBillingCurrent = sql`NOT EXISTS(SELECT 1 FROM sport_installment_plans bp JOIN sport_installments due ON due.plan_id=bp.id WHERE bp.order_id=m.order_id AND due.due_on+bp.grace_days<(now() AT TIME ZONE 'Asia/Tehran')::date AND (SELECT coalesce(sum(amount_minor),0) FROM sport_installments WHERE plan_id=bp.id AND ordinal<=due.ordinal)>(SELECT coalesce(sum(paid.amount_minor),0) FROM sport_payments paid WHERE paid.order_id=bp.order_id AND paid.state='verified')-coalesce((SELECT sum(amount_minor) FROM sport_refunds WHERE order_id=bp.order_id AND state='succeeded'),0))`;

export async function assertMembershipBilling(db: Db | Tx, id: string) {
  const result = await db.execute(
    sql`SELECT id FROM sport_memberships m WHERE m.id=${id} AND ${membershipBillingCurrent}`,
  );
  if (!result.rows.length)
    throw new ConflictException('Closure.installmentOverdue');
}
export async function canActivateInInstallments(
  db: Db | Tx,
  orderId: string,
  received: string,
) {
  const result = await db.execute(
    sql`SELECT p.id FROM sport_installment_plans p JOIN sport_installments first_due ON first_due.plan_id=p.id AND first_due.ordinal=1 WHERE p.order_id=${orderId} AND p.activation='after_first' AND first_due.amount_minor<=${received}::bigint`,
  );
  return result.rows.length > 0;
}
export async function billingRows(db: Db | Tx, orderId: string) {
  const result = await db.execute(
    sql`WITH paid AS(SELECT (SELECT coalesce(sum(amount_minor),0) FROM sport_payments WHERE order_id=${orderId} AND state='verified')-coalesce((SELECT sum(amount_minor) FROM sport_refunds WHERE order_id=${orderId} AND state='succeeded'),0) amount), schedule AS(SELECT d.*,p.order_id,p.activation,p.grace_days,p.revision,sum(d.amount_minor) OVER(ORDER BY d.ordinal)-d.amount_minor before_minor FROM sport_installment_plans p JOIN sport_installments d ON d.plan_id=p.id WHERE p.order_id=${orderId}) SELECT s.id,s.ordinal,s.due_on::text,s.amount_minor::text,s.activation,s.grace_days,s.revision,(s.due_on<=(now() AT TIME ZONE 'Asia/Tehran')::date+1) remind,greatest(0,s.amount_minor-greatest(0,paid.amount-s.before_minor))::text remaining_minor,(s.due_on+s.grace_days<(now() AT TIME ZONE 'Asia/Tehran')::date AND paid.amount<s.before_minor+s.amount_minor) overdue FROM schedule s CROSS JOIN paid ORDER BY s.ordinal`,
  );
  return result.rows;
}
export async function remindInstallments(tx: Tx) {
  const result = await tx.execute(
    sql`SELECT DISTINCT p.order_id,o.user_id,o.snapshot->>'title' title FROM sport_installment_plans p JOIN sport_installments d ON d.plan_id=p.id JOIN sport_orders o ON o.id=p.order_id WHERE o.status='partially_paid' AND d.due_on<=(now() AT TIME ZONE 'Asia/Tehran')::date+1 ORDER BY p.order_id LIMIT 100`,
  );
  for (const o of result.rows) {
    const dues = await billingRows(tx, String(o.order_id));
    for (const d of dues)
      if (BigInt(String(d.remaining_minor)) > 0n && d.remind) {
        await deliverSportsNotification(tx, {
          userId: String(o.user_id),
          title: d.overdue
            ? 'Closure.installmentOverdue'
            : 'Closure.installmentDue',
          body: 'Closure.openInstallments',
          href: `/orders/detail?id=${String(o.order_id)}`,
          sourceKey: `installment:${String(d.id)}:${d.overdue ? 'overdue' : 'due'}`,
          preference: 'reminders',
        });
      }
  }
}
