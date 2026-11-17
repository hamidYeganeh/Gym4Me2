ALTER TABLE coach_requests
  ADD COLUMN status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_changes')),
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  ADD COLUMN review_note text,
  ADD COLUMN reviewer_id uuid REFERENCES accounts,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN updated_at timestamptz,
  ADD CHECK (
    (status IN ('rejected', 'needs_changes')
      AND review_note IS NOT NULL AND char_length(btrim(review_note)) BETWEEN 1 AND 1200)
    OR (status IN ('pending', 'approved') AND review_note IS NULL)
  );

CREATE INDEX coach_requests_applicant ON coach_requests (applicant_id, submitted_at DESC);
