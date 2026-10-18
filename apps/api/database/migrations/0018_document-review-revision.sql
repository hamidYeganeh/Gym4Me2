ALTER TABLE sport_documents
  ADD COLUMN revision integer NOT NULL DEFAULT 1,
  ADD COLUMN reviewed_at timestamptz;
