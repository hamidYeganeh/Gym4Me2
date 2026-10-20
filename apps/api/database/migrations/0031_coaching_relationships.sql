CREATE TABLE coaching_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coach_profiles(user_id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','declined','ended')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (coach_id <> student_id),
  UNIQUE (coach_id, student_id)
);
CREATE INDEX coaching_relationships_student ON coaching_relationships(student_id, created_at, id);
CREATE INDEX coaching_relationships_coach ON coaching_relationships(coach_id, created_at, id);
