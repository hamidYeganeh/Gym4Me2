ALTER TABLE sport_payments DROP CONSTRAINT sport_payments_provider_check;
ALTER TABLE sport_payments ADD CONSTRAINT sport_payments_provider_check CHECK(provider IN ('sandbox','saman_mock','saman_sandbox','cash'));
ALTER TABLE sport_payments ADD COLUMN gateway_url text;
ALTER TABLE sport_payments ADD COLUMN bank_reference text;
CREATE UNIQUE INDEX sport_payment_bank_reference_unique ON sport_payments(bank_reference) WHERE provider='saman_sandbox' AND bank_reference IS NOT NULL;
