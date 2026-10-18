ALTER TABLE sport_message_reports ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE sport_message_reports ADD COLUMN reviewed_by uuid REFERENCES users(id);
ALTER TABLE sport_message_reports ADD COLUMN reviewed_at timestamptz;
ALTER TABLE sport_message_reports ADD COLUMN decision_reason text;
ALTER TABLE sport_message_reports ADD CONSTRAINT sport_message_reports_status_check CHECK(status IN ('open','dismissed','removed'));
