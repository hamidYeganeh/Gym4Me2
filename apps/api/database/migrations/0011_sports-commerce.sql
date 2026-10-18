CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE sport_resources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 branch_id uuid NOT NULL, name text NOT NULL, active boolean NOT NULL DEFAULT true,
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id)
);
CREATE TABLE sport_conflict_units (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, branch_id uuid NOT NULL, name text NOT NULL,
 FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id), UNIQUE(organization_id,id)
);
CREATE TABLE sport_resource_units (
 organization_id uuid NOT NULL, resource_id uuid NOT NULL, unit_id uuid NOT NULL,
 PRIMARY KEY(resource_id,unit_id), FOREIGN KEY(organization_id,resource_id) REFERENCES sport_resources(organization_id,id),
 FOREIGN KEY(organization_id,unit_id) REFERENCES sport_conflict_units(organization_id,id)
);
CREATE TABLE sport_services (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), branch_id uuid NOT NULL,
 title text NOT NULL, kind text NOT NULL CHECK(kind IN ('class','course','court','access','membership')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')), revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id),
 FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id)
);
CREATE TABLE sport_service_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES sport_services(id), version integer NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>=0), currency text NOT NULL DEFAULT 'IRR' CHECK(currency='IRR'),
 description text NOT NULL, policy jsonb NOT NULL, requirements jsonb NOT NULL DEFAULT '[]',
 resource_ids uuid[] NOT NULL DEFAULT '{}', duration_days integer CHECK(duration_days>0), session_count integer CHECK(session_count>0),
 coach_name text NOT NULL DEFAULT '', level text NOT NULL DEFAULT '', visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN ('public','unlisted')),
 approval_required boolean NOT NULL DEFAULT false, show_participants boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(service_id,version)
);
CREATE TABLE sport_occurrences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES sport_services(id), version_id uuid NOT NULL REFERENCES sport_service_versions(id),
 start_at timestamptz NOT NULL, end_at timestamptz NOT NULL, capacity integer NOT NULL CHECK(capacity>0),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','cancelled','completed')), revision integer NOT NULL DEFAULT 1,
 CHECK(end_at>start_at), UNIQUE(service_id,start_at)
);
CREATE TABLE sport_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), service_id uuid NOT NULL REFERENCES sport_services(id),
 version_id uuid NOT NULL REFERENCES sport_service_versions(id), organization_id uuid NOT NULL REFERENCES organizations(id),
 branch_id uuid NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','frozen','expired','cancelled')),
 starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz, granted integer CHECK(granted>0), consumed integer NOT NULL DEFAULT 0 CHECK(consumed>=0),
 freeze_until timestamptz, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(granted IS NULL OR consumed<=granted), FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id)
);
CREATE TABLE sport_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), organization_id uuid NOT NULL REFERENCES organizations(id),
 service_id uuid NOT NULL REFERENCES sport_services(id), version_id uuid NOT NULL REFERENCES sport_service_versions(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0), refunded_minor bigint NOT NULL DEFAULT 0 CHECK(refunded_minor>=0),
 currency text NOT NULL DEFAULT 'IRR' CHECK(currency='IRR'), snapshot jsonb NOT NULL,
 status text NOT NULL DEFAULT 'awaiting_payment' CHECK(status IN ('awaiting_payment','paid','partially_refunded','refunded','cancelled','review')),
 idempotency_key text NOT NULL, request_hash text NOT NULL, expires_at timestamptz NOT NULL, revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(refunded_minor<=amount_minor), UNIQUE(user_id,idempotency_key)
);
CREATE TABLE sport_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), occurrence_id uuid NOT NULL REFERENCES sport_occurrences(id),
 order_id uuid NOT NULL REFERENCES sport_orders(id), membership_id uuid REFERENCES sport_memberships(id),
 status text NOT NULL DEFAULT 'held' CHECK(status IN ('held','pending_approval','confirmed','cancelled','expired','completed','no_show')),
 expires_at timestamptz NOT NULL, revision integer NOT NULL DEFAULT 1, consumed boolean NOT NULL DEFAULT false,
 source text NOT NULL DEFAULT 'online' CHECK(source IN ('online','reception','import')), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,occurrence_id)
);
CREATE UNIQUE INDEX sport_active_reservation ON sport_reservations(user_id,occurrence_id) WHERE status IN ('held','pending_approval','confirmed');
CREATE INDEX sport_occurrence_reservations ON sport_reservations(occurrence_id,status,expires_at);
CREATE TABLE sport_occupancies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), unit_id uuid NOT NULL REFERENCES sport_conflict_units(id),
 occurrence_id uuid REFERENCES sport_occurrences(id), reservation_id uuid REFERENCES sport_reservations(id),
 period tstzrange NOT NULL, active boolean NOT NULL DEFAULT true, CHECK(num_nonnulls(occurrence_id,reservation_id)=1),
 EXCLUDE USING gist(unit_id WITH =,period WITH &&) WHERE(active)
);
CREATE TABLE sport_entitlement_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), membership_id uuid NOT NULL REFERENCES sport_memberships(id),
 reservation_id uuid REFERENCES sport_reservations(id), kind text NOT NULL CHECK(kind IN ('grant','hold','release','consume','restore','adjust','freeze','renew')),
 quantity integer NOT NULL, source_key text NOT NULL UNIQUE, actor_id uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES sport_orders(id),
 provider text NOT NULL DEFAULT 'sandbox' CHECK(provider IN ('sandbox','cash')),
 reference text NOT NULL UNIQUE, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 scenario text NOT NULL CHECK(scenario IN ('success','failure','timeout','late')),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','verified','failed','unknown')),
 actor_id uuid REFERENCES users(id), verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES sport_orders(id),
 reservation_id uuid REFERENCES sport_reservations(id), amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 reason text NOT NULL, source_key text NOT NULL UNIQUE, provider_reference text,
 state text NOT NULL DEFAULT 'requested' CHECK(state IN ('requested','processing','unknown','succeeded','failed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_journals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), order_id uuid NOT NULL REFERENCES sport_orders(id),
 source_key text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_journal_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), journal_id uuid NOT NULL REFERENCES sport_journals(id), account text NOT NULL,
 debit_minor bigint NOT NULL DEFAULT 0 CHECK(debit_minor>=0), credit_minor bigint NOT NULL DEFAULT 0 CHECK(credit_minor>=0),
 CHECK((debit_minor>0 AND credit_minor=0) OR (credit_minor>0 AND debit_minor=0))
);
CREATE FUNCTION sport_balanced_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target uuid;
BEGIN target:=COALESCE(NEW.journal_id,OLD.journal_id);
 IF EXISTS(SELECT 1 FROM sport_journal_lines WHERE journal_id=target GROUP BY journal_id HAVING sum(debit_minor)<>sum(credit_minor)) THEN
 RAISE EXCEPTION 'Unbalanced sports journal'; END IF; RETURN NULL; END $$;
CREATE CONSTRAINT TRIGGER sport_journal_balance AFTER INSERT OR UPDATE OR DELETE ON sport_journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sport_balanced_journal();
CREATE TABLE sport_waitlist (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), occurrence_id uuid NOT NULL REFERENCES sport_occurrences(id),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','offered','accepted','withdrawn','expired')),
 offer_expires_at timestamptz, order_id uuid REFERENCES sport_orders(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,occurrence_id)
);
CREATE TABLE sport_access_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), reservation_id uuid REFERENCES sport_reservations(id),
 membership_id uuid REFERENCES sport_memberships(id), token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, consumed_at timestamptz,
 CHECK(num_nonnulls(reservation_id,membership_id)=1)
);
CREATE TABLE sport_visits (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), branch_id uuid NOT NULL REFERENCES branches(id),
 token_id uuid UNIQUE REFERENCES sport_access_tokens(id), actor_id uuid NOT NULL REFERENCES users(id), reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid NOT NULL UNIQUE REFERENCES sport_reservations(id),
 visit_id uuid REFERENCES sport_visits(id), actor_id uuid NOT NULL REFERENCES users(id), status text NOT NULL CHECK(status IN ('present','absent')),
 reason text NOT NULL, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, aggregate_id uuid NOT NULL, payload jsonb NOT NULL,
 source_key text NOT NULL UNIQUE, due_at timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0,
 processed_at timestamptz, lease_until timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), service_id uuid NOT NULL REFERENCES sport_services(id),
 name text NOT NULL, object_key text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','expired')),
 expires_at timestamptz, reviewed_by uuid REFERENCES users(id), reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES sport_services(id), code text NOT NULL,
 basis_points integer NOT NULL CHECK(basis_points BETWEEN 0 AND 10000), max_uses integer NOT NULL CHECK(max_uses>0),
 expires_at timestamptz NOT NULL, UNIQUE(service_id,code)
);
