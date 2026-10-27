-- Transaction start timestamps can precede time spent waiting for the ticket lock.
-- Allocate sequence numbers at insertion so concurrent replies retain their order.
ALTER TABLE sport_ticket_events ADD COLUMN sequence bigserial;
ALTER TABLE sport_ticket_messages ADD COLUMN sequence bigserial;
ALTER TABLE sport_program_events ADD COLUMN sequence bigserial;
CREATE INDEX sport_ticket_message_sequence ON sport_ticket_messages(ticket_id,sequence);
CREATE INDEX sport_ticket_event_sequence ON sport_ticket_events(ticket_id,sequence);
CREATE INDEX sport_program_event_sequence ON sport_program_events(request_id,sequence);
