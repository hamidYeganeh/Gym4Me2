-- Older deployments must not erase a pending account without the new receipt path.
-- The setting is local to the transaction and bound to the exact user identity.
CREATE FUNCTION gym4me_require_deletion_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND OLD.deletion_pending
    AND current_setting('gym4me.deletion_receipt_user',true) IS DISTINCT FROM OLD.id::text THEN
  RAISE EXCEPTION 'Independent deletion receipt required' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER gym4me_deletion_receipt_guard BEFORE UPDATE OF deleted_at ON users
FOR EACH ROW EXECUTE FUNCTION gym4me_require_deletion_receipt();
