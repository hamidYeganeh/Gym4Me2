CREATE TABLE sport_refund_settlements (
 refund_id uuid PRIMARY KEY REFERENCES sport_refunds(id),
 actor_id uuid NOT NULL REFERENCES users(id),
 method text NOT NULL CHECK(method IN ('cash','pos','bank_transfer')),
 reference text NOT NULL CHECK(length(reference)>=3),
 returned_on date NOT NULL,
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sport_refunds_pending_order ON sport_refunds(order_id,state);

-- Persist the relationship that existed when the service was purchased.
UPDATE sport_orders o SET snapshot=o.snapshot||jsonb_build_object('programRelationshipId',r.id)
FROM sport_service_versions v,coaching_relationships r
WHERE o.version_id=v.id AND o.snapshot->>'kind'='program'
AND r.coach_id=v.coach_user_id AND r.student_id=o.user_id
AND NOT o.snapshot?'programRelationshipId';

-- Published services participate in the same sport taxonomy as discovery.
INSERT INTO branch_sports(branch_id,sport_id)
SELECT DISTINCT s.branch_id,v.sport_id FROM sport_services s
JOIN sport_service_versions v ON v.id=s.published_version_id
WHERE s.status='published' AND v.sport_id IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO club_sport_links(club_id,sport_id)
SELECT DISTINCT s.organization_id,v.sport_id FROM sport_services s
JOIN sport_service_versions v ON v.id=s.published_version_id
WHERE s.status='published' AND v.sport_id IS NOT NULL ON CONFLICT DO NOTHING;
