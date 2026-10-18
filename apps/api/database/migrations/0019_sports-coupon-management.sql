ALTER TABLE sport_coupons ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE sport_coupons ADD COLUMN disabled_at timestamptz;
ALTER TABLE sport_coupons ADD CONSTRAINT sport_coupons_revision_positive CHECK (revision > 0);
