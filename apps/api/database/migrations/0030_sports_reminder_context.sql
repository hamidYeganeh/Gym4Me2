-- Existing queued reminders predate occurrence-bound delivery. Retarget pending
-- work to the current booking and database clock; read/delivered history stays.
UPDATE sport_outbox j
SET payload=j.payload||jsonb_build_object('occurrenceId',r.occurrence_id),
    due_at=greatest(now(),o.start_at-interval '1 hour')
FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id
WHERE j.kind='reservation.reminder' AND j.aggregate_id=r.id
  AND j.processed_at IS NULL AND NOT (j.payload ? 'occurrenceId');
--> statement-breakpoint
CREATE INDEX sport_outbox_aggregate_kind ON sport_outbox(aggregate_id,kind);
CREATE INDEX sport_waitlist_order ON sport_waitlist(order_id) WHERE order_id IS NOT NULL;
