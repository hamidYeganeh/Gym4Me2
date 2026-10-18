ALTER TABLE sport_reservations DROP CONSTRAINT sport_reservations_source_check;
ALTER TABLE sport_reservations ADD CONSTRAINT sport_reservations_source_check CHECK(source IN ('online','reception','import','waitlist'));
ALTER TABLE sport_memberships ADD COLUMN frozen_days integer NOT NULL DEFAULT 0 CHECK(frozen_days>=0);
CREATE INDEX sport_waitlist_fifo ON sport_waitlist(occurrence_id,created_at,id) WHERE status='waiting';
CREATE INDEX sport_outbox_due ON sport_outbox(due_at) WHERE processed_at IS NULL;
CREATE INDEX sport_notifications_account ON sport_notifications(user_id,created_at DESC);
