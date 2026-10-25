-- Existing paid memberships can be corrected explicitly without rewriting the sold service version.
ALTER TABLE sport_memberships ADD COLUMN benefit_service_ids jsonb CHECK(benefit_service_ids IS NULL OR jsonb_typeof(benefit_service_ids)='array');
ALTER TABLE sport_memberships ADD COLUMN entry_allowed_override boolean;
