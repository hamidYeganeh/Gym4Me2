-- PH5: append-only financial evidence; existing customer data is never reset.
CREATE TABLE business_plan_catalog (
 code text PRIMARY KEY CHECK(code IN('basic','pro')), amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 branch_limit integer NOT NULL CHECK(branch_limit BETWEEN 1 AND 1000), advanced_finance boolean NOT NULL,
 terms text NOT NULL, revision integer NOT NULL DEFAULT 1
);
INSERT INTO business_plan_catalog VALUES
 ('basic',0,1,false,'Single active branch. Existing records and obligations remain readable.',1),
 ('pro',0,20,true,'Configurable evaluation plan. Activation uses a simulated payment, not a bank transfer.',1);
CREATE TABLE business_subscriptions (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE, plan_code text NOT NULL REFERENCES business_plan_catalog(code),
 expires_at timestamptz, revision integer NOT NULL DEFAULT 1, terms_snapshot jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Preserve existing branch entitlements until an owner explicitly chooses a plan.
INSERT INTO business_subscriptions(organization_id,plan_code,terms_snapshot)
 SELECT id,'basic',jsonb_build_object('legacyBranchLimit',greatest(1,(SELECT count(*) FROM branches WHERE organization_id=o.id))) FROM organizations o;
CREATE TABLE business_plan_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 plan_code text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0), catalog_revision integer NOT NULL,
 state text NOT NULL CHECK(state IN('succeeded','failed','unknown')), reference text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_commands (
 actor_id uuid NOT NULL REFERENCES users(id), command_key text NOT NULL, request_hash text NOT NULL,
 response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,command_key)
);
CREATE TABLE business_branch_state (
 branch_id uuid PRIMARY KEY REFERENCES branches(id), active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1, reason text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_contract_rules (
 contract_id uuid PRIMARY KEY REFERENCES coaching_contracts(id),
 mode text NOT NULL CHECK(mode IN('percentage','per_session','fixed')),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0), discount_payer text NOT NULL CHECK(discount_payer IN('shared','business')),
 space_minor bigint NOT NULL CHECK(space_minor>=0), platform_bps integer NOT NULL CHECK(platform_bps BETWEEN 0 AND 10000),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_statements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 branch_id uuid NOT NULL REFERENCES branches(id), coach_id uuid NOT NULL REFERENCES users(id),
 from_on date NOT NULL, to_on date NOT NULL CHECK(to_on>=from_on),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','approved','paid')),
 revision integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz, CHECK(to_on-from_on<=366)
);
ALTER TABLE business_statements ADD CONSTRAINT business_statement_period EXCLUDE USING gist
 (branch_id WITH =,coach_id WITH =,daterange(from_on,to_on,'[]') WITH &&);
CREATE TABLE business_earnings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), statement_id uuid NOT NULL REFERENCES business_statements(id),
 contract_id uuid NOT NULL REFERENCES coaching_contracts(id), reservation_id uuid REFERENCES sport_reservations(id),
 source_key text NOT NULL UNIQUE, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 basis_snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_adjustments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), earning_id uuid NOT NULL REFERENCES business_earnings(id),
 amount_minor bigint NOT NULL CHECK(amount_minor<>0), reason text NOT NULL, source_key text NOT NULL UNIQUE,
 actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE business_payouts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), statement_id uuid NOT NULL REFERENCES business_statements(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), method text NOT NULL CHECK(method IN('mock','manual')),
 reference text NOT NULL UNIQUE, state text NOT NULL CHECK(state IN('succeeded','failed','unknown')),
 actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), reconciled_at timestamptz
);
CREATE UNIQUE INDEX business_one_pending_payout ON business_payouts(statement_id) WHERE state='unknown';
CREATE TABLE business_disputes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), earning_id uuid NOT NULL REFERENCES business_earnings(id),
 opened_by uuid NOT NULL REFERENCES users(id), reason text NOT NULL, state text NOT NULL DEFAULT 'open' CHECK(state IN('open','resolved')),
 decision text, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX business_one_open_dispute ON business_disputes(earning_id) WHERE state='open';
CREATE TABLE business_membership_scope (
 membership_id uuid NOT NULL REFERENCES sport_memberships(id), branch_id uuid NOT NULL REFERENCES branches(id),
 service_id uuid NOT NULL REFERENCES sport_services(id), PRIMARY KEY(membership_id,service_id)
);
CREATE TABLE business_allocations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), membership_id uuid NOT NULL REFERENCES sport_memberships(id),
 branch_id uuid NOT NULL REFERENCES branches(id), amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 basis_points integer NOT NULL CHECK(basis_points BETWEEN 0 AND 10000), UNIQUE(membership_id,branch_id)
);
CREATE INDEX business_statements_scope ON business_statements(organization_id,branch_id,coach_id,from_on);
CREATE INDEX business_earnings_statement ON business_earnings(statement_id);
CREATE INDEX business_payout_statement ON business_payouts(statement_id,state);
-- Shared memberships consume the existing single locked membership balance.
-- The scope table only grants explicitly selected services, never an entire tenant.
CREATE FUNCTION business_branch_sale_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bid uuid;
BEGIN
 SELECT s.branch_id INTO bid FROM sport_occurrences o JOIN sport_services s ON s.id=o.service_id WHERE o.id=NEW.occurrence_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(bid::text,96));
 IF EXISTS(SELECT 1 FROM business_branch_state WHERE branch_id=bid AND NOT active)
 THEN RAISE EXCEPTION 'Branch is inactive' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_branch_sale_guard BEFORE INSERT ON sport_reservations FOR EACH ROW EXECUTE FUNCTION business_branch_sale_guard();
CREATE TABLE business_price_templates (
 organization_id uuid NOT NULL REFERENCES organizations(id), kind text NOT NULL CHECK(kind IN('class','course','court','access','membership')),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0), revision integer NOT NULL DEFAULT 1, reason text NOT NULL,
 PRIMARY KEY(organization_id,kind)
);
CREATE TABLE business_price_exceptions (
 branch_id uuid NOT NULL REFERENCES branches(id), kind text NOT NULL CHECK(kind IN('class','course','court','access','membership')),
 amount_minor bigint NOT NULL CHECK(amount_minor>=0), revision integer NOT NULL DEFAULT 1, reason text NOT NULL,
 PRIMARY KEY(branch_id,kind)
);
