CREATE TABLE sport_service_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES sport_services(id),
  object_key text NOT NULL UNIQUE,
  alt text NOT NULL CHECK (length(btrim(alt)) BETWEEN 1 AND 280),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  size_bytes integer NOT NULL CHECK (size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id,id)
);

ALTER TABLE sport_service_versions ADD COLUMN cover_image_id uuid;
ALTER TABLE sport_service_versions ADD CONSTRAINT sport_service_version_cover_matches_service
  FOREIGN KEY(service_id,cover_image_id) REFERENCES sport_service_images(service_id,id);
