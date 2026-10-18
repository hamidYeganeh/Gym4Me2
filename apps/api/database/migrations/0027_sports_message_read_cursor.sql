-- Acknowledgements refer to a message tuple, never a client's clock or archive action.
-- Legacy read_at cannot prove which message was rendered; do not manufacture receipts.
ALTER TABLE sport_conversation_preferences
 ADD COLUMN read_message_at timestamptz,
 ADD COLUMN read_message_id uuid,
 ADD CONSTRAINT sport_conversation_read_cursor_pair CHECK
 ((read_message_at IS NULL) = (read_message_id IS NULL));
-- Retain a historical watermark when a message is moderated or purged.
CREATE INDEX sport_conversation_read_cursor
 ON sport_conversation_preferences(conversation_id,read_message_at,read_message_id)
 WHERE read_message_id IS NOT NULL;
