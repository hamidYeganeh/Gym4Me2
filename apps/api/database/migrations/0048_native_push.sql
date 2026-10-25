CREATE TABLE native_push_devices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 session_id uuid NOT NULL UNIQUE REFERENCES auth_sessions(id) ON DELETE CASCADE,
 platform text NOT NULL CHECK(platform IN ('android','ios')), token text NOT NULL UNIQUE CHECK(length(token) BETWEEN 20 AND 4096),
 locale text NOT NULL CHECK(locale IN ('fa','en')), last_test_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE native_push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), device_id uuid NOT NULL REFERENCES native_push_devices(id) ON DELETE CASCADE,
 notification_id uuid NOT NULL REFERENCES sport_notifications(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0, due_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
 finished_at timestamptz, result text CHECK(result IN ('accepted','skipped','expired','failed')), UNIQUE(device_id,notification_id)
);
CREATE INDEX native_push_due ON native_push_deliveries(due_at) WHERE finished_at IS NULL;
CREATE FUNCTION enqueue_native_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO native_push_deliveries(device_id,notification_id)
 SELECT d.id,NEW.id FROM native_push_devices d JOIN auth_sessions s ON s.id=d.session_id JOIN users u ON u.id=d.user_id
 WHERE d.user_id=NEW.user_id AND s.user_id=u.id AND s.client='application' AND s.transport='native' AND s.revoked_at IS NULL AND s.expires_at>now()
 AND u.status='active' AND u.deleted_at IS NULL AND NOT u.deletion_pending;
 RETURN NEW;
END $$;
CREATE TRIGGER native_push_notice AFTER INSERT ON sport_notifications FOR EACH ROW EXECUTE FUNCTION enqueue_native_push();
CREATE FUNCTION revoke_native_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.revoked_at IS NOT NULL THEN DELETE FROM native_push_devices WHERE session_id=NEW.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER native_push_session_revoke AFTER UPDATE OF revoked_at ON auth_sessions FOR EACH ROW EXECUTE FUNCTION revoke_native_push();
CREATE FUNCTION erase_native_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.deleted_at IS NOT NULL OR NEW.deletion_pending OR NEW.status<>'active' THEN DELETE FROM native_push_devices WHERE user_id=NEW.id; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER native_push_user_revoke AFTER UPDATE OF deleted_at,deletion_pending,status ON users FOR EACH ROW EXECUTE FUNCTION erase_native_push();
