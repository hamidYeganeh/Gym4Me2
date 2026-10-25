CREATE TABLE growth_offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), occurrence_id uuid NOT NULL UNIQUE REFERENCES sport_occurrences(id),
 discount_basis_points integer NOT NULL CHECK(discount_basis_points BETWEEN 1 AND 5000),
 max_uses integer NOT NULL CHECK(max_uses BETWEEN 1 AND 10000),
 ends_at timestamptz NOT NULL, active boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1, created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
