CREATE TABLE training_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL,
  result jsonb NOT NULL,
  content jsonb,
  accepted_plan_id uuid REFERENCES training_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes'
);
CREATE INDEX training_recommendations_athlete ON training_recommendations(athlete_id,created_at DESC);
