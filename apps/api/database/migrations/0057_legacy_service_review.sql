ALTER TABLE sport_memberships ADD COLUMN benefits_reviewed_at timestamptz;
UPDATE sport_memberships m SET benefits_reviewed_at=now()
FROM sport_service_versions v WHERE v.id=m.version_id
AND (m.benefit_service_ids IS NOT NULL OR jsonb_array_length(v.offering->'includedServiceIds')>0);

-- Infer only an unambiguous existing branch classification. Never rewrite sold
-- versions, publish an unrelated draft, or invent membership financial rights.
DO $$
DECLARE item record; new_id uuid;
BEGIN
 FOR item IN
  SELECT s.id,s.organization_id,s.branch_id,s.status,s.published_version_id,v.id version_id,
   inferred.sport_id
  FROM sport_services s
  JOIN LATERAL(SELECT * FROM sport_service_versions WHERE service_id=s.id ORDER BY version DESC LIMIT 1) v ON true
  JOIN LATERAL(SELECT min(sport_id::text)::uuid sport_id,count(*) n FROM branch_sports WHERE branch_id=s.branch_id) inferred ON inferred.n=1
  WHERE s.status<>'archived' AND v.sport_id IS NULL
   AND (s.status='draft' OR s.published_version_id=v.id)
 LOOP
  INSERT INTO sport_service_versions
  SELECT (jsonb_populate_record(NULL::sport_service_versions,to_jsonb(v)||jsonb_build_object(
   'id',gen_random_uuid(),'version',v.version+1,'sport_id',item.sport_id,'created_at',now()))).*
  FROM sport_service_versions v WHERE v.id=item.version_id RETURNING id INTO new_id;
  UPDATE sport_services SET revision=revision+1,published_version_id=CASE WHEN item.status='published' THEN new_id ELSE published_version_id END WHERE id=item.id;
  INSERT INTO club_sport_links(club_id,sport_id) VALUES(item.organization_id,item.sport_id) ON CONFLICT DO NOTHING;
  INSERT INTO audit_events(organization_id,action,target_id,details) VALUES(item.organization_id,'sports.legacy.inferred',item.id,jsonb_build_object('sportId',item.sport_id,'previousVersionId',item.version_id));
 END LOOP;
END $$;
