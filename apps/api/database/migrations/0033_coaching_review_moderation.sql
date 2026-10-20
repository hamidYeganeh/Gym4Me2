ALTER TABLE coaching_relationships ADD COLUMN future_booking_policy text NOT NULL DEFAULT 'preserve_purchase_terms' CHECK(future_booking_policy='preserve_purchase_terms');
ALTER TABLE coaching_reviews ADD COLUMN reply text NOT NULL DEFAULT '';
ALTER TABLE coaching_reviews ADD COLUMN hidden boolean NOT NULL DEFAULT false;
ALTER TABLE coaching_reviews ADD COLUMN reply_revision integer NOT NULL DEFAULT 0;
CREATE TABLE coaching_review_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), review_id uuid NOT NULL REFERENCES coaching_reviews(id),
 reporter_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','resolved')),
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(review_id,reporter_id)
);
CREATE INDEX coaching_review_reports_queue ON coaching_review_reports(status,created_at);
