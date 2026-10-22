ALTER TABLE sport_notifications ADD COLUMN preference text CHECK (preference IN ('messages','invitations','reminders'));

CREATE TABLE web_push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_id uuid NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
 endpoint text NOT NULL UNIQUE CHECK(length(endpoint)<=2048),
 p256dh text NOT NULL, auth text NOT NULL,
 locale text NOT NULL CHECK(locale IN ('fa','en')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 last_test_at timestamptz,
 UNIQUE(session_id)
);
CREATE INDEX web_push_user ON web_push_subscriptions(user_id);
CREATE TABLE web_push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subscription_id uuid NOT NULL REFERENCES web_push_subscriptions(id) ON DELETE CASCADE,
 notification_id uuid NOT NULL REFERENCES sport_notifications(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0,
 due_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
 finished_at timestamptz, result text CHECK(result IN ('accepted','skipped','expired','failed')),
 UNIQUE(subscription_id,notification_id)
);
CREATE INDEX web_push_due ON web_push_deliveries(due_at) WHERE finished_at IS NULL;

-- Queue only future notices; enabling a device never replays old private notices.
CREATE FUNCTION enqueue_web_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO web_push_deliveries(subscription_id,notification_id)
 SELECT p.id,NEW.id FROM web_push_subscriptions p
 JOIN auth_sessions s ON s.id=p.session_id AND s.user_id=p.user_id
 JOIN users u ON u.id=p.user_id
 WHERE p.user_id=NEW.user_id AND s.revoked_at IS NULL AND s.expires_at>now()
 AND s.client='application' AND s.transport='web'
 AND u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending;
 RETURN NEW;
END $$;
CREATE TRIGGER web_push_notice AFTER INSERT ON sport_notifications
 FOR EACH ROW EXECUTE FUNCTION enqueue_web_push();

-- Revocation/erasure cuts off the subscription and all its pending work atomically.
CREATE FUNCTION revoke_web_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.revoked_at IS NOT NULL THEN
  DELETE FROM web_push_subscriptions WHERE session_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER web_push_session_revoke AFTER UPDATE OF revoked_at ON auth_sessions
 FOR EACH ROW EXECUTE FUNCTION revoke_web_push();
CREATE FUNCTION erase_web_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL OR NEW.deletion_pending OR NEW.status<>'active' THEN
  DELETE FROM web_push_subscriptions WHERE user_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER web_push_user_revoke AFTER UPDATE OF deleted_at,deletion_pending,status ON users
 FOR EACH ROW EXECUTE FUNCTION erase_web_push();
