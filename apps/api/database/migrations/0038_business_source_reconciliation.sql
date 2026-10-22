-- Immutable event jobs avoid lock-order coupling between commerce and statements.
CREATE TABLE business_source_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES sport_orders(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX business_source_job_due ON business_source_jobs(created_at,id);
CREATE FUNCTION business_order_correction_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.refunded_minor IS DISTINCT FROM OLD.refunded_minor AND EXISTS(SELECT 1 FROM business_earnings e WHERE e.basis_snapshot->>'orderId'=NEW.id::text)
 THEN INSERT INTO business_source_jobs(order_id) VALUES(NEW.id); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_order_correction_job AFTER UPDATE OF refunded_minor ON sport_orders FOR EACH ROW EXECUTE FUNCTION business_order_correction_job();
CREATE FUNCTION business_session_correction_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status THEN
 INSERT INTO business_source_jobs(order_id) SELECT (basis_snapshot->>'orderId')::uuid FROM business_earnings WHERE reservation_id=NEW.id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER business_session_correction_job AFTER UPDATE OF status ON sport_reservations FOR EACH ROW EXECUTE FUNCTION business_session_correction_job();

CREATE INDEX business_earning_order ON business_earnings((basis_snapshot->>'orderId'));
