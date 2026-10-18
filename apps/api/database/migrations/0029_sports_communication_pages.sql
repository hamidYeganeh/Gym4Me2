ALTER TABLE sport_conversations ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision > 0);
CREATE INDEX sport_conversation_page ON sport_conversations(created_at DESC,id DESC);
CREATE INDEX sport_notification_page ON sport_notifications(user_id,created_at DESC,id DESC);
CREATE INDEX sport_notification_unread_page ON sport_notifications(user_id,created_at DESC,id DESC) WHERE read_at IS NULL;
