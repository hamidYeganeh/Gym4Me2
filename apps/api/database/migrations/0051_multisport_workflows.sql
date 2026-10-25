ALTER TABLE sport_services DROP CONSTRAINT sport_services_kind_check;
ALTER TABLE sport_services ADD CONSTRAINT sport_services_kind_check CHECK(kind IN ('class','course','court','access','membership','program'));
ALTER TABLE sport_service_versions ADD COLUMN sport_id uuid REFERENCES sports(id);
ALTER TABLE sport_service_versions ADD COLUMN offering jsonb NOT NULL DEFAULT '{"includedServiceIds":[],"entryAllowed":true,"entryLimitPerDay":null,"audience":"all","maxTickets":20,"deliveryDays":3,"supportDays":30,"confirmation":"instant"}';
ALTER TABLE sport_reservations ADD COLUMN quantity integer NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 20);
ALTER TABLE sport_reservations ADD COLUMN checked_in_at timestamptz;
ALTER TABLE sport_reservations ADD COLUMN admitted_count integer NOT NULL DEFAULT 0 CHECK(admitted_count>=0 AND admitted_count<=quantity);
ALTER TABLE sport_memberships ADD COLUMN renewed_from_id uuid REFERENCES sport_memberships(id);
CREATE UNIQUE INDEX sport_membership_single_renewal ON sport_memberships(renewed_from_id) WHERE renewed_from_id IS NOT NULL AND status NOT IN ('cancelled');
CREATE TABLE sport_entry_passes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid NOT NULL REFERENCES sport_reservations(id),
 ordinal integer NOT NULL CHECK(ordinal>0), name text NOT NULL, birth_date date,
 gender text NOT NULL DEFAULT 'unspecified' CHECK(gender IN ('male','female','unspecified')),
 admitted_at timestamptz, UNIQUE(reservation_id,ordinal)
);
ALTER TABLE sport_access_tokens ADD COLUMN entry_pass_id uuid REFERENCES sport_entry_passes(id);
ALTER TABLE sport_visits ADD COLUMN reservation_id uuid REFERENCES sport_reservations(id);
ALTER TABLE sport_visits ADD COLUMN entry_pass_id uuid UNIQUE REFERENCES sport_entry_passes(id);
CREATE UNIQUE INDEX sport_reservation_single_visit ON sport_visits(token_id) WHERE token_id IS NOT NULL;
ALTER TABLE sport_payments DROP CONSTRAINT sport_payments_provider_check;
ALTER TABLE sport_payments ADD CONSTRAINT sport_payments_provider_check CHECK(provider IN ('sandbox','saman_mock','saman_sandbox','cash','pos','bank_transfer','network_credit','team_split'));
CREATE TABLE sport_manual_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES sport_orders(id),
 method text NOT NULL CHECK(method IN ('cash','pos','bank_transfer')), amount_minor bigint NOT NULL CHECK(amount_minor>0),
 reference text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 submitted_by uuid NOT NULL REFERENCES users(id), reviewed_by uuid REFERENCES users(id), reason text NOT NULL DEFAULT '',
 idempotency_key text NOT NULL, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(submitted_by,idempotency_key), UNIQUE(order_id,method,reference)
);
CREATE TABLE sport_program_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES sport_orders(id),
 athlete_id uuid NOT NULL REFERENCES users(id), coach_id uuid NOT NULL REFERENCES users(id),
 relationship_id uuid REFERENCES coaching_relationships(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'intake' CHECK(status IN ('intake','queued','preparing','delivered','revision_requested','cancelled')),
 intake jsonb NOT NULL DEFAULT '{}', due_at timestamptz NOT NULL, support_ends_at timestamptz,
 assignment_id uuid REFERENCES training_assignments(id) ON DELETE SET NULL, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sport_program_coach_queue ON sport_program_requests(coach_id,status,due_at);
ALTER TABLE sport_orders ADD COLUMN coordination_approved boolean NOT NULL DEFAULT false;
CREATE TABLE sport_makeup_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid NOT NULL REFERENCES sport_reservations(id),
 previous_occurrence_id uuid NOT NULL REFERENCES sport_occurrences(id), target_occurrence_id uuid NOT NULL REFERENCES sport_occurrences(id),
 actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coach_program_shops (
 coach_id uuid PRIMARY KEY REFERENCES coaching_practices(user_id),
 organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id), branch_id uuid NOT NULL UNIQUE REFERENCES branches(id)
);
