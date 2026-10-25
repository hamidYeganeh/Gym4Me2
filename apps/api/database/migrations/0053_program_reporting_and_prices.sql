ALTER TABLE business_price_templates DROP CONSTRAINT business_price_templates_kind_check;
ALTER TABLE business_price_templates ADD CONSTRAINT business_price_templates_kind_check CHECK(kind IN ('class','course','court','access','membership','program'));
ALTER TABLE business_price_exceptions DROP CONSTRAINT business_price_exceptions_kind_check;
ALTER TABLE business_price_exceptions ADD CONSTRAINT business_price_exceptions_kind_check CHECK(kind IN ('class','course','court','access','membership','program'));
