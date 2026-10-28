CREATE TABLE discovery_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL CHECK (page IN ('home','clubs','coaches','classes','map')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  published boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX discovery_content_page ON discovery_content(page,position) WHERE published AND deleted_at IS NULL;
