CREATE TABLE nutrition_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 eaten_on date NOT NULL,
 meal text NOT NULL CHECK(meal IN ('breakfast','lunch','dinner','snack')),
 name text NOT NULL,
 grams numeric(10,2) NOT NULL CHECK(grams>0 AND grams<=20000),
 per_100g jsonb NOT NULL,
 calories numeric(12,2) NOT NULL CHECK(calories>=0),
 protein numeric(12,2) NOT NULL CHECK(protein>=0),
 carbs numeric(12,2) NOT NULL CHECK(carbs>=0),
 fat numeric(12,2) NOT NULL CHECK(fat>=0),
 archived boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nutrition_entries_athlete_day ON nutrition_entries(athlete_id,eaten_on,created_at DESC,id);
