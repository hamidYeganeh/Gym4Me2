CREATE TABLE club_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  parent_id uuid,
  parent_kind text GENERATED ALWAYS AS (
    CASE kind
      WHEN 'provinces' THEN 'countries'
      WHEN 'cities' THEN 'provinces'
      WHEN 'districts' THEN 'cities'
      WHEN 'neighborhoods' THEN 'districts'
      WHEN 'sports' THEN 'sport_categories'
      WHEN 'sub_sports' THEN 'sports'
    END
  ) STORED,
  UNIQUE (id, kind),
  FOREIGN KEY (parent_id, parent_kind) REFERENCES club_resources(id, kind),
  CHECK ((parent_id IS NULL) = (parent_kind IS NULL)),
  CHECK (kind IN (
    'countries', 'provinces', 'cities', 'districts', 'neighborhoods',
    'club_types', 'coach_types', 'gallery_media_types',
    'sport_categories', 'sports', 'sub_sports', 'equipment', 'amenities'
  )),
  CHECK (btrim(title) <> ''),
  CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX club_resources_root_code ON club_resources(kind, code) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX club_resources_child_code ON club_resources(kind, parent_id, code) WHERE parent_id IS NOT NULL;

INSERT INTO club_resources (kind, code, title) VALUES
  ('club_types', 'gym', 'بدنسازی'),
  ('club_types', 'studio', 'کلاس و استودیو'),
  ('club_types', 'pool', 'استخر'),
  ('club_types', 'football', 'فوتبال'),
  ('club_types', 'sports-complex', 'مجتمع ورزشی'),
  ('club_types', 'other', 'سایر'),
  ('gallery_media_types', 'image', 'تصویر'),
  ('gallery_media_types', 'video', 'ویدیو'),
  ('countries', 'ir', 'ایران');

CREATE TABLE club_media_objects (
  hash text PRIMARY KEY CHECK (hash ~ '^[0-9a-f]{64}$'),
  content_type text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes > 0)
);

-- An upload can be staged against an approved request before the club is created.
CREATE TABLE club_media_uploads (
  request_id uuid NOT NULL REFERENCES club_requests(id),
  hash text NOT NULL REFERENCES club_media_objects(hash),
  PRIMARY KEY (request_id, hash)
);

ALTER TABLE clubs
  ADD COLUMN review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN review_revision integer NOT NULL DEFAULT 1 CHECK (review_revision > 0),
  ADD COLUMN reviewer_id uuid REFERENCES accounts(id),
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN rejection_reason text,
  ADD COLUMN published_profile jsonb,
  ADD COLUMN published_at timestamptz,
  ADD CHECK ((review_status = 'rejected') = (rejection_reason IS NOT NULL)),
  ADD CHECK ((published_profile IS NULL) = (published_at IS NULL));

CREATE INDEX clubs_publication_queue ON clubs(review_status, updated_at DESC);
CREATE INDEX clubs_published ON clubs(published_at DESC, id) WHERE published_profile IS NOT NULL;
