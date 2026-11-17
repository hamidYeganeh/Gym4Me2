CREATE TABLE IF NOT EXISTS coach_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES accounts,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  specialty text NOT NULL CHECK (char_length(specialty) BETWEEN 2 AND 120),
  experience text NOT NULL CHECK (char_length(experience) BETWEEN 2 AND 1200),
  submitted_at timestamptz NOT NULL DEFAULT now()
);
