ALTER TABLE sport_resources
  ADD COLUMN buffer_before_minutes integer NOT NULL DEFAULT 0 CHECK(buffer_before_minutes BETWEEN 0 AND 240),
  ADD COLUMN buffer_after_minutes integer NOT NULL DEFAULT 0 CHECK(buffer_after_minutes BETWEEN 0 AND 240),
  ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision > 0);

CREATE TABLE sport_resource_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  resource_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('closure','maintenance')),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL CHECK(end_at > start_at),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 3 AND 1000),
  active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK(revision > 0),
  actor_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  FOREIGN KEY(organization_id,resource_id) REFERENCES sport_resources(organization_id,id)
);
CREATE INDEX sport_resource_block_list ON sport_resource_blocks(resource_id,start_at);
ALTER TABLE sport_occupancies ADD COLUMN block_id uuid REFERENCES sport_resource_blocks(id);
ALTER TABLE sport_occupancies DROP CONSTRAINT sport_occupancies_check;
ALTER TABLE sport_occupancies ADD CONSTRAINT sport_occupancy_source
  CHECK(num_nonnulls(occurrence_id,reservation_id,block_id)=1);
