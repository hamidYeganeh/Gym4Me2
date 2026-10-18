ALTER TABLE sport_occurrence_series
 ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE sport_occurrences DROP CONSTRAINT sport_occurrences_service_id_start_at_key;
--> statement-breakpoint
ALTER TABLE sport_occurrences ADD CONSTRAINT sport_occurrences_service_id_start_at_key
 UNIQUE(service_id,start_at) DEFERRABLE INITIALLY DEFERRED;
