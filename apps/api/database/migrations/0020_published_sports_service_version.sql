ALTER TABLE sport_service_versions ADD COLUMN title text;
UPDATE sport_service_versions v SET title=s.title FROM sport_services s WHERE s.id=v.service_id;
ALTER TABLE sport_service_versions ALTER COLUMN title SET NOT NULL;
ALTER TABLE sport_service_versions ADD CONSTRAINT sport_service_versions_service_id_id_unique UNIQUE(service_id,id);

ALTER TABLE sport_services ADD COLUMN published_version_id uuid;
UPDATE sport_services s SET published_version_id=(
  SELECT v.id FROM sport_service_versions v WHERE v.service_id=s.id ORDER BY v.version DESC LIMIT 1
) WHERE s.status='published';
ALTER TABLE sport_services ADD CONSTRAINT sport_services_published_version_matches_service
  FOREIGN KEY(id,published_version_id) REFERENCES sport_service_versions(service_id,id);
ALTER TABLE sport_services ADD CONSTRAINT sport_services_published_version_required
  CHECK(status<>'published' OR published_version_id IS NOT NULL);
