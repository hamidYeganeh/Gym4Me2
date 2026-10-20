CREATE TABLE coaching_practices (
 user_id uuid PRIMARY KEY REFERENCES coach_profiles(user_id) ON DELETE CASCADE,
 specialties text[] NOT NULL DEFAULT '{}', goals text[] NOT NULL DEFAULT '{}',
 city text NOT NULL DEFAULT '', experience_years integer NOT NULL DEFAULT 0 CHECK(experience_years BETWEEN 0 AND 80),
 review_status text NOT NULL DEFAULT 'draft' CHECK(review_status IN('draft','pending','approved','rejected')),
 review_reason text, review_expires_at timestamptz, published boolean NOT NULL DEFAULT false,
 buffer_minutes integer NOT NULL DEFAULT 0 CHECK(buffer_minutes BETWEEN 0 AND 120),
 travel_minutes integer NOT NULL DEFAULT 0 CHECK(travel_minutes BETWEEN 0 AND 240),
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coaching_credentials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coach_id uuid NOT NULL REFERENCES coaching_practices(user_id) ON DELETE CASCADE,
 title text NOT NULL, issuer text NOT NULL, expires_at timestamptz NOT NULL,
 object_key text, content_type text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coaching_invite_attempts (
 coach_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_invite_attempt_window ON coaching_invite_attempts(coach_id,created_at);
CREATE TABLE coaching_services (
 service_id uuid PRIMARY KEY REFERENCES sport_services(id) ON DELETE CASCADE,
 coach_id uuid NOT NULL REFERENCES coaching_practices(user_id),
 mode text NOT NULL CHECK(mode IN('private','semi_private','online','introduction')),
 entry_amount_minor bigint NOT NULL DEFAULT 0 CHECK(entry_amount_minor>=0)
);
CREATE TABLE coaching_availability (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), coach_id uuid NOT NULL REFERENCES coaching_practices(user_id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('available','blocked')), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at>starts_at)
);
CREATE TABLE coaching_assessments (
 relationship_id uuid PRIMARY KEY REFERENCES coaching_relationships(id) ON DELETE CASCADE,
 goals text NOT NULL DEFAULT '', level text NOT NULL DEFAULT '', equipment text NOT NULL DEFAULT '', limitations text NOT NULL DEFAULT '',
 shared boolean NOT NULL DEFAULT false, revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coaching_session_notes (
 reservation_id uuid PRIMARY KEY REFERENCES sport_reservations(id) ON DELETE CASCADE,
 coach_id uuid NOT NULL REFERENCES users(id), student_id uuid NOT NULL REFERENCES users(id),
 note text NOT NULL DEFAULT '', follow_up text NOT NULL DEFAULT '', shared boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE coaching_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id),
 branch_id uuid NOT NULL REFERENCES branches(id), coach_id uuid NOT NULL REFERENCES users(id),
 version integer NOT NULL, starts_on date NOT NULL, ends_on date,
 share_basis_points integer NOT NULL CHECK(share_basis_points BETWEEN 0 AND 10000),
 basis text NOT NULL CHECK(basis IN('gross','net')), costs_minor bigint NOT NULL DEFAULT 0 CHECK(costs_minor>=0),
 terms text NOT NULL, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(branch_id,coach_id,version), CHECK(ends_on IS NULL OR ends_on>=starts_on)
);
CREATE TABLE coaching_ledger (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id uuid NOT NULL REFERENCES coaching_contracts(id),
 kind text NOT NULL CHECK(kind IN('income','payment','adjustment')), amount_minor bigint NOT NULL CHECK(amount_minor<>0),
 reservation_id uuid REFERENCES sport_reservations(id), reference text NOT NULL, confirmed boolean NOT NULL DEFAULT false,
 actor_id uuid NOT NULL REFERENCES users(id), command_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,command_key), CHECK(kind='adjustment' OR amount_minor>0)
);
CREATE TABLE coaching_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid NOT NULL UNIQUE REFERENCES sport_reservations(id),
 coach_id uuid NOT NULL REFERENCES users(id), student_id uuid NOT NULL REFERENCES users(id),
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), body text NOT NULL,
 published boolean NOT NULL DEFAULT false, example text NOT NULL DEFAULT '', example_consent boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
-- One global scheduling seam, including classes created by the business panel.
CREATE FUNCTION coaching_claim_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p coaching_practices; o sport_occurrences; special boolean;
BEGIN
 IF NOT NEW.active THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.coach_user_id::text,83));
 SELECT * INTO p FROM coaching_practices WHERE user_id=NEW.coach_user_id FOR SHARE;
 SELECT * INTO o FROM sport_occurrences WHERE id=NEW.occurrence_id;
 NEW.period=tstzrange(o.start_at-make_interval(mins=>coalesce(p.buffer_minutes,0)),o.end_at+make_interval(mins=>coalesce(p.buffer_minutes,0)+coalesce(p.travel_minutes,0)),'[)');
 IF EXISTS(SELECT 1 FROM coaching_availability a WHERE a.coach_id=NEW.coach_user_id AND a.kind='blocked' AND tstzrange(a.starts_at,a.ends_at,'[)') && NEW.period) THEN
 RAISE EXCEPTION 'Coach time blocked' USING ERRCODE='23P01'; END IF;
 SELECT EXISTS(SELECT 1 FROM coaching_services WHERE service_id=o.service_id) INTO special;
 IF special AND NOT EXISTS(SELECT 1 FROM branch_coaches bc JOIN sport_services s ON s.branch_id=bc.branch_id WHERE s.id=o.service_id AND bc.coach_id=NEW.coach_user_id AND bc.status='active' AND (bc.ends_on IS NULL OR bc.ends_on>=current_date)) THEN RAISE EXCEPTION 'Coach affiliation inactive' USING ERRCODE='23P01'; END IF;
 IF special AND (p.review_status IS DISTINCT FROM 'approved' OR p.review_expires_at<=now() OR NOT EXISTS(
 SELECT 1 FROM coaching_availability a WHERE a.coach_id=NEW.coach_user_id AND a.kind='available' AND a.starts_at<=lower(NEW.period) AND a.ends_at>=upper(NEW.period))) THEN
 RAISE EXCEPTION 'Coach availability required' USING ERRCODE='23P01'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coaching_claim_guard BEFORE INSERT OR UPDATE ON sport_coach_claims FOR EACH ROW EXECUTE FUNCTION coaching_claim_guard();
CREATE FUNCTION coaching_availability_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.coach_id::text,83));
 IF NEW.kind='blocked' AND EXISTS(SELECT 1 FROM sport_coach_claims c WHERE c.coach_user_id=NEW.coach_id AND c.active AND c.period && tstzrange(NEW.starts_at,NEW.ends_at,'[)')) THEN
 RAISE EXCEPTION 'Coach has scheduled sessions' USING ERRCODE='23P01'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coaching_availability_guard BEFORE INSERT OR UPDATE ON coaching_availability FOR EACH ROW EXECUTE FUNCTION coaching_availability_guard();
ALTER TABLE coaching_relationships ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE coaching_relationships ADD COLUMN recipient_key text;
CREATE UNIQUE INDEX coaching_invitation_recipient ON coaching_relationships(coach_id,recipient_key) WHERE recipient_key IS NOT NULL;
CREATE FUNCTION coaching_capacity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m text;
BEGIN
 SELECT mode INTO m FROM coaching_services WHERE service_id=NEW.service_id;
 IF m IN('private','online','introduction') AND NEW.capacity<>1 OR m='semi_private' AND NEW.capacity>8 THEN
 RAISE EXCEPTION 'Coaching capacity invalid' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER coaching_capacity_guard BEFORE INSERT OR UPDATE OF capacity ON sport_occurrences FOR EACH ROW EXECUTE FUNCTION coaching_capacity_guard();
CREATE UNIQUE INDEX coaching_income_source ON coaching_ledger(contract_id,reservation_id) WHERE kind='income' AND reservation_id IS NOT NULL;
ALTER TABLE coaching_relationships ADD COLUMN initiated_by uuid REFERENCES users(id);
ALTER TABLE coaching_relationships ADD COLUMN revision integer NOT NULL DEFAULT 1;
