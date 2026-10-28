-- Public identifiers are separate from internal relational keys, assigned at creation.
ALTER TABLE sport_services ADD COLUMN public_id varchar(40) NOT NULL DEFAULT ('class-' || replace(gen_random_uuid()::text, '-', ''));
CREATE UNIQUE INDEX sport_services_public_id_unique ON sport_services(public_id);
ALTER TABLE coaching_practices ADD COLUMN public_id varchar(40) NOT NULL DEFAULT ('coach-' || replace(gen_random_uuid()::text, '-', ''));
CREATE UNIQUE INDEX coaching_practices_public_id_unique ON coaching_practices(public_id);
