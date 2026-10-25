CREATE TABLE sport_installment_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES sport_orders(id),
 activation text NOT NULL CHECK(activation IN ('after_first','after_full')),
 grace_days integer NOT NULL DEFAULT 0 CHECK(grace_days BETWEEN 0 AND 30),
 revision integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES users(id),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_installments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES sport_installment_plans(id),
 ordinal integer NOT NULL CHECK(ordinal>0), due_on date NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), UNIQUE(plan_id,ordinal)
);
CREATE INDEX sport_installment_due_dates ON sport_installments(due_on,plan_id);
