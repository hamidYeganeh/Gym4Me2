CREATE TABLE coach_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaching_practices(user_id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position BETWEEN 0 AND 4),
  title text NOT NULL DEFAULT '' CHECK (char_length(title) <= 120),
  before_key text NOT NULL,
  after_key text NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, position) DEFERRABLE INITIALLY DEFERRED
);
