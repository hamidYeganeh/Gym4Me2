CREATE TABLE club_review_reactions (
  review_id uuid NOT NULL REFERENCES club_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍','❤️','😂','😮','😢','🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id, emoji)
);
--> statement-breakpoint
CREATE TABLE coach_review_reactions (
  review_id uuid NOT NULL REFERENCES coaching_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (emoji IN ('👍','❤️','😂','😮','😢','🙏')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id, emoji)
);
--> statement-breakpoint
CREATE INDEX club_review_reactions_user_idx ON club_review_reactions(user_id);
--> statement-breakpoint
CREATE INDEX coach_review_reactions_user_idx ON coach_review_reactions(user_id);
