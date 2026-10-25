CREATE TABLE sport_dependents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), guardian_id uuid NOT NULL REFERENCES users(id),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 120), birth_date date NOT NULL,
 gender text NOT NULL CHECK(gender IN ('male','female','unspecified')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sport_guardian_dependents ON sport_dependents(guardian_id,status);
ALTER TABLE sport_orders ADD COLUMN dependent_id uuid REFERENCES sport_dependents(id);
ALTER TABLE sport_reservations ADD COLUMN dependent_id uuid REFERENCES sport_dependents(id);
ALTER TABLE sport_memberships ADD COLUMN dependent_id uuid REFERENCES sport_dependents(id);
ALTER TABLE sport_visits ADD COLUMN dependent_id uuid REFERENCES sport_dependents(id);
DROP INDEX sport_active_reservation;
CREATE UNIQUE INDEX sport_active_reservation ON sport_reservations(user_id,occurrence_id,coalesce(dependent_id,'00000000-0000-0000-0000-000000000000'::uuid)) WHERE status IN ('held','pending_approval','confirmed');
