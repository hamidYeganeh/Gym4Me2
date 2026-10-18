ALTER TABLE sport_payments DROP CONSTRAINT sport_payments_provider_check;
ALTER TABLE sport_payments ADD CONSTRAINT sport_payments_provider_check CHECK(provider IN ('sandbox','saman_mock','cash'));
