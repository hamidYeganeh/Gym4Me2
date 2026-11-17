CREATE TABLE IF NOT EXISTS fitness_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  capacity integer NOT NULL CHECK (capacity BETWEEN 1 AND 10000),
  approval boolean NOT NULL,
  waitlist boolean NOT NULL,
  details jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS fitness_sessions_club ON fitness_sessions (club_id, starts_at);

CREATE TABLE IF NOT EXISTS fitness_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES fitness_sessions(id),
  name text NOT NULL,
  phone text NOT NULL CHECK (phone ~ '^\+989[0-9]{9}$'),
  notes text NOT NULL,
  status text NOT NULL CHECK (status IN ('confirmed', 'pending', 'waitlisted')),
  UNIQUE (session_id, phone)
);

CREATE INDEX IF NOT EXISTS fitness_reservations_phone ON fitness_reservations (phone);
