ALTER TABLE sport_tickets ADD COLUMN category text NOT NULL DEFAULT 'general' CHECK(category IN ('general','booking_issue','entry_denied','provider_absent','payment','refund','program'));
ALTER TABLE sport_tickets ADD COLUMN priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('normal','urgent'));
ALTER TABLE sport_tickets ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE sport_tickets ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sport_tickets ADD COLUMN resolution text CHECK(resolution IN ('answered','correction','refund_review','provider_contacted'));
CREATE TABLE sport_ticket_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL REFERENCES sport_tickets(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('created','reply','assigned','resolved','reopened')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sport_ticket_event_history ON sport_ticket_events(ticket_id,created_at,id);
CREATE INDEX sport_ticket_operational_queue ON sport_tickets(priority,status,updated_at);
CREATE TABLE sport_program_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES sport_program_requests(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('intake','preparing','delivered','revision_requested')),
 reason text NOT NULL DEFAULT '', assignment_id uuid REFERENCES training_assignments(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sport_program_event_history ON sport_program_events(request_id,created_at,id);

ALTER TABLE sport_program_requests ADD COLUMN revision_due_at timestamptz;
