CREATE TABLE sport_occurrence_series (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 service_id uuid NOT NULL REFERENCES sport_services(id),
 version_id uuid NOT NULL,
 actor_id uuid NOT NULL REFERENCES users(id),
 idempotency_key text NOT NULL,
 request_hash text NOT NULL,
 interval_days integer NOT NULL CHECK(interval_days IN (1,7,14)),
 occurrence_count integer NOT NULL CHECK(occurrence_count BETWEEN 1 AND 52),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,idempotency_key),
 UNIQUE(service_id,id),
 FOREIGN KEY(service_id,version_id) REFERENCES sport_service_versions(service_id,id)
);
--> statement-breakpoint
ALTER TABLE sport_occurrences ADD COLUMN series_id uuid;
--> statement-breakpoint
ALTER TABLE sport_occurrences ADD CONSTRAINT sport_occurrences_series_matches_service
 FOREIGN KEY(service_id,series_id) REFERENCES sport_occurrence_series(service_id,id);
--> statement-breakpoint
CREATE INDEX sport_occurrences_series_order ON sport_occurrences(series_id,start_at) WHERE series_id IS NOT NULL;
