ALTER TABLE accounts ADD COLUMN IF NOT EXISTS profile jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_profile_username
  ON accounts (lower(profile->>'username')) WHERE profile IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES accounts ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('admin','business','applicant')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour'
);
CREATE INDEX IF NOT EXISTS auth_sessions_account ON auth_sessions (account_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions (expires_at);
