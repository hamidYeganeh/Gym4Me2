CREATE TABLE growth_games (
 id uuid PRIMARY KEY, organizer_id uuid NOT NULL REFERENCES users(id), order_id uuid NOT NULL UNIQUE REFERENCES sport_orders(id),
 occurrence_id uuid NOT NULL REFERENCES sport_occurrences(id), title text NOT NULL CHECK(length(title) BETWEEN 2 AND 160),
 player_count integer NOT NULL CHECK(player_count BETWEEN 2 AND 12), deadline timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'recruiting' CHECK(status IN ('recruiting','confirmed','cancelled')),
 public boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX growth_game_due ON growth_games(status,deadline,id);
CREATE TABLE growth_game_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game_id uuid NOT NULL REFERENCES growth_games(id),
 slot integer NOT NULL CHECK(slot BETWEEN 1 AND 12), amount_minor bigint NOT NULL CHECK(amount_minor>0),
 user_id uuid REFERENCES users(id), order_id uuid UNIQUE REFERENCES sport_orders(id),
 UNIQUE(game_id,slot), UNIQUE(game_id,user_id), CHECK((user_id IS NULL)=(order_id IS NULL))
);
