import { sql } from 'drizzle-orm';
import type { Tx } from '../clubs/club.repository';

/** Retire unsent work and unread notices; keep read notices as history. */
export async function retireReservationReminders(
  tx: Tx,
  reservationId: string,
  exceptKey?: string,
) {
  await tx.execute(sql`
    UPDATE sport_outbox SET processed_at=now(),lease_until=null,last_error=null
    WHERE kind='reservation.reminder' AND aggregate_id=${reservationId}
      AND processed_at IS NULL ${exceptKey ? sql`AND source_key<>${exceptKey}` : sql``}
  `);
  await tx.execute(sql`
    DELETE FROM sport_notifications n USING sport_outbox j,sport_reservations r
    WHERE r.id=${reservationId} AND j.kind='reservation.reminder' AND j.aggregate_id=r.id
      AND n.source_key=j.id::text||':'||r.user_id::text AND n.read_at IS NULL
      ${exceptKey ? sql`AND j.source_key<>${exceptKey}` : sql``}
  `);
}

/** Called in the booking mutation transaction, after its reservation locks. */
export async function scheduleReservationReminders(tx: Tx, orderId: string) {
  const { rows } = await tx.execute<{
    id: string;
    occurrence_id: string;
    revision: number;
  }>(sql`
    SELECT r.id,r.occurrence_id,r.revision FROM sport_reservations r
    JOIN sport_occurrences o ON o.id=r.occurrence_id
    WHERE r.order_id=${orderId} AND r.status='confirmed' AND r.checked_in_at IS NULL
      AND o.status='scheduled' AND o.start_at>now() ORDER BY r.id FOR UPDATE OF r
  `);
  for (const reservation of rows) {
    const key = `reminder:${reservation.id}:${reservation.revision}`;
    await retireReservationReminders(tx, reservation.id, key);
    await tx.execute(sql`
      INSERT INTO sport_outbox(kind,aggregate_id,source_key,payload,due_at)
      SELECT 'reservation.reminder',${reservation.id},${key},
        jsonb_build_object('occurrenceId',o.id),greatest(now(),o.start_at-interval '1 hour')
      FROM sport_occurrences o WHERE o.id=${reservation.occurrence_id}
      ON CONFLICT(source_key) DO NOTHING
    `);
  }
}

export async function retireWaitlistOffer(tx: Tx, waitlistId: string) {
  await tx.execute(sql`
    UPDATE sport_outbox SET processed_at=now(),lease_until=null,last_error=null
    WHERE kind='waitlist.offered' AND aggregate_id=${waitlistId} AND processed_at IS NULL
  `);
  await tx.execute(sql`
    DELETE FROM sport_notifications n USING sport_outbox j,sport_waitlist w
    WHERE w.id=${waitlistId} AND j.kind='waitlist.offered' AND j.aggregate_id=w.id
      AND n.source_key=j.id::text||':'||w.user_id::text AND n.read_at IS NULL
  `);
}

export async function retireOrderWaitlistOffers(tx: Tx, orderId: string) {
  const { rows } = await tx.execute<{ id: string }>(
    sql`SELECT id FROM sport_waitlist WHERE order_id=${orderId}`,
  );
  for (const offer of rows) await retireWaitlistOffer(tx, offer.id);
}
