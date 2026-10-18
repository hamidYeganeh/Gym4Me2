ALTER TABLE sport_calendars
 ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX sport_calendar_page ON sport_calendars(created_at DESC,id DESC);
CREATE INDEX sport_calendar_follow_page ON sport_calendar_follows(user_id,created_at DESC,calendar_id DESC);
