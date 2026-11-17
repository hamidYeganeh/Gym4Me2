CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), phone text NOT NULL UNIQUE, password_hash text
);
CREATE TABLE IF NOT EXISTS account_roles (
  account_id uuid REFERENCES accounts, role text CHECK (role IN ('admin','business')),
  PRIMARY KEY (account_id, role)
);
CREATE TABLE IF NOT EXISTS otp (
  phone text, scope text, digest text NOT NULL, sent_at timestamptz NOT NULL DEFAULT now(),
  attempts int NOT NULL DEFAULT 0, PRIMARY KEY (phone, scope)
);
CREATE TABLE IF NOT EXISTS auth_limits (
  key text PRIMARY KEY, window_start timestamptz NOT NULL, attempts int NOT NULL
);
CREATE TABLE IF NOT EXISTS club_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), applicant_id uuid NOT NULL REFERENCES accounts,
  profile jsonb NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
  reviewer_id uuid REFERENCES accounts, rejection_reason text,
  CHECK ((status = 'rejected') = (rejection_reason IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS club_requests_applicant ON club_requests(applicant_id, submitted_at DESC);
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY REFERENCES club_requests, profile jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS club_memberships (
  club_id uuid REFERENCES clubs, account_id uuid REFERENCES accounts,
  role text CHECK (role IN ('owner','manager','viewer')), PRIMARY KEY (club_id, account_id, role)
);
CREATE INDEX IF NOT EXISTS club_memberships_account ON club_memberships(account_id, club_id);
