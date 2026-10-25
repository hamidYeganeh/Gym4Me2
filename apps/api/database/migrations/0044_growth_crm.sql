CREATE TABLE growth_leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 branch_id uuid NOT NULL,
 contact_id uuid REFERENCES users(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160),
 phone text NOT NULL CHECK(phone ~ '^\+989[0-9]{9}$'),
 stage text NOT NULL DEFAULT 'new' CHECK(stage IN ('new','contacted','trial','won','lost')),
 note text NOT NULL DEFAULT '' CHECK(length(note)<=2000),
 follow_up_at timestamptz,
 revision integer NOT NULL DEFAULT 1,
 archived boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id)
);
CREATE UNIQUE INDEX growth_lead_phone ON growth_leads(branch_id,phone) WHERE NOT archived;
CREATE INDEX growth_lead_followup ON growth_leads(branch_id,follow_up_at,id) WHERE NOT archived;
CREATE TABLE growth_lead_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES growth_leads(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES users(id), stage text NOT NULL, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE growth_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), branch_id uuid NOT NULL,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 120), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 1000),
 stage text NOT NULL CHECK(stage IN ('new','contacted','trial','won','lost','all')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent')),
 revision integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz,
 FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id)
);
CREATE TABLE growth_campaign_deliveries (
 campaign_id uuid NOT NULL REFERENCES growth_campaigns(id), user_id uuid NOT NULL REFERENCES users(id),
 notification_id uuid REFERENCES sport_notifications(id) ON DELETE SET NULL,
 PRIMARY KEY(campaign_id,user_id)
);
