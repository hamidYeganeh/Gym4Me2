CREATE TABLE sport_calendars (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), branch_id uuid NOT NULL,
 title text NOT NULL, description text NOT NULL DEFAULT '', UNIQUE(branch_id),
 FOREIGN KEY(organization_id,branch_id) REFERENCES branches(organization_id,id)
);
CREATE TABLE sport_calendar_follows (
 user_id uuid NOT NULL REFERENCES users(id), calendar_id uuid NOT NULL REFERENCES sport_calendars(id),
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,calendar_id)
);
CREATE TABLE sport_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES sport_services(id),
 invited_by uuid NOT NULL REFERENCES users(id), user_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','accepted','declined')),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(service_id,user_id)
);
CREATE TABLE sport_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurrence_id uuid NOT NULL UNIQUE REFERENCES sport_occurrences(id),
 title text NOT NULL, closed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_conversation_preferences (
 user_id uuid NOT NULL REFERENCES users(id), conversation_id uuid NOT NULL REFERENCES sport_conversations(id),
 archived boolean NOT NULL DEFAULT false, read_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,conversation_id)
);
CREATE TABLE sport_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES sport_conversations(id), sender_id uuid NOT NULL REFERENCES users(id),
 body text NOT NULL CHECK(length(body)<=5000), image_key text, idempotency_key text NOT NULL,
 deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sender_id,idempotency_key), CHECK(length(body)>0 OR image_key IS NOT NULL)
);
CREATE INDEX sport_message_page ON sport_messages(conversation_id,created_at,id);
CREATE TABLE sport_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), title text NOT NULL,
 body text NOT NULL, href text NOT NULL, source_key text NOT NULL UNIQUE, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_notification_preferences (
 user_id uuid PRIMARY KEY REFERENCES users(id), reminders boolean NOT NULL DEFAULT true, messages boolean NOT NULL DEFAULT true, invitations boolean NOT NULL DEFAULT true
);
CREATE TABLE sport_tickets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), order_id uuid REFERENCES sport_orders(id),
 title text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','assigned','resolved')), assigned_to uuid REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_ticket_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES sport_tickets(id), sender_id uuid NOT NULL REFERENCES users(id),
 body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sport_message_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), message_id uuid NOT NULL REFERENCES sport_messages(id),
 reason text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,message_id)
);
