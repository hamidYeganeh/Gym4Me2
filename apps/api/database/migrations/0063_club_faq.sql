ALTER TABLE clubs ADD COLUMN faq jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clubs ADD CONSTRAINT clubs_faq_array CHECK (jsonb_typeof(faq) = 'array' AND jsonb_array_length(faq) <= 20);
