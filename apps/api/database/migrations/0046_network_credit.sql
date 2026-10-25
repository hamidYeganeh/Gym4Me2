CREATE TABLE credit_networks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issuer_organization_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL CHECK(length(name) BETWEEN 2 AND 160), terms text NOT NULL CHECK(length(terms) BETWEEN 10 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE credit_network_members (
 network_id uuid NOT NULL REFERENCES credit_networks(id), organization_id uuid NOT NULL REFERENCES organizations(id),
 status text NOT NULL CHECK(status IN ('invited','accepted','removed')), accepted_at timestamptz,
 PRIMARY KEY(network_id,organization_id)
);
CREATE TABLE credit_accounts (
 network_id uuid NOT NULL REFERENCES credit_networks(id), user_id uuid NOT NULL REFERENCES users(id),
 balance_minor bigint NOT NULL DEFAULT 0 CHECK(balance_minor>=0), PRIMARY KEY(network_id,user_id)
);
CREATE TABLE credit_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), network_id uuid NOT NULL, user_id uuid NOT NULL,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 delta_minor bigint NOT NULL CHECK(delta_minor<>0), kind text NOT NULL CHECK(kind IN ('grant','spend','refund')),
 order_id uuid REFERENCES sport_orders(id), source_key text NOT NULL UNIQUE, receipt text, actor_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(network_id,user_id) REFERENCES credit_accounts(network_id,user_id)
);
CREATE UNIQUE INDEX credit_order_spend ON credit_entries(order_id) WHERE kind='spend';
CREATE INDEX credit_account_history ON credit_entries(network_id,user_id,created_at,id);
CREATE TABLE credit_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), network_id uuid NOT NULL REFERENCES credit_networks(id), organization_id uuid NOT NULL REFERENCES organizations(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0), reference text NOT NULL UNIQUE, reason text NOT NULL, actor_id uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sport_payments DROP CONSTRAINT sport_payments_provider_check;
ALTER TABLE sport_payments ADD CONSTRAINT sport_payments_provider_check CHECK(provider IN ('sandbox','saman_mock','saman_sandbox','cash','network_credit','team_split'));
