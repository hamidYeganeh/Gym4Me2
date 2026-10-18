ALTER TABLE sport_visits ADD COLUMN exited_at timestamptz;
ALTER TABLE sport_visits ADD COLUMN exit_actor_id uuid REFERENCES users(id);
ALTER TABLE sport_visits ADD COLUMN exit_reason text;
ALTER TABLE sport_attendance ALTER COLUMN actor_id DROP NOT NULL;
