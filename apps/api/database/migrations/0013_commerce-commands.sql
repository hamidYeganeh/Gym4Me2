CREATE TABLE sport_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), service_id uuid NOT NULL REFERENCES sport_services(id),
 version_id uuid NOT NULL REFERENCES sport_service_versions(id), input_hash text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor>=0),
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sport_orders DROP CONSTRAINT sport_orders_status_check;
ALTER TABLE sport_orders ADD CONSTRAINT sport_orders_status_check CHECK(status IN ('awaiting_payment','partially_paid','paid','partially_refunded','refunded','cancelled','review'));
ALTER TABLE sport_payments DROP CONSTRAINT sport_payments_order_id_key;
CREATE INDEX sport_payments_order ON sport_payments(order_id,created_at);
ALTER TABLE sport_memberships ADD COLUMN order_id uuid UNIQUE REFERENCES sport_orders(id);
ALTER TABLE sport_messages ADD COLUMN request_hash text NOT NULL DEFAULT '';
ALTER TABLE sport_service_versions ADD COLUMN coach_user_id uuid REFERENCES users(id);
CREATE TABLE sport_coach_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coach_user_id uuid NOT NULL REFERENCES users(id), occurrence_id uuid NOT NULL UNIQUE REFERENCES sport_occurrences(id),
 period tstzrange NOT NULL, active boolean NOT NULL DEFAULT true, EXCLUDE USING gist(coach_user_id WITH =,period WITH &&) WHERE(active)
);
CREATE TABLE sport_command_receipts (
 user_id uuid NOT NULL REFERENCES users(id), command_key text NOT NULL, request_hash text NOT NULL, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,command_key)
);
