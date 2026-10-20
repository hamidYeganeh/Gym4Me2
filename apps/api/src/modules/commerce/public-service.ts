import { sql } from 'drizzle-orm';

// Queries using these publication predicates bind services as s and versions as v.
export const coachingVisible = sql`(NOT EXISTS(SELECT 1 FROM coaching_services cs WHERE cs.service_id=s.id) OR EXISTS(SELECT 1 FROM coaching_services cs JOIN coaching_practices cp ON cp.user_id=cs.coach_id JOIN users cu ON cu.id=cp.user_id JOIN branch_coaches bc ON bc.coach_id=cp.user_id AND bc.branch_id=s.branch_id WHERE cs.service_id=s.id AND cp.review_status='approved' AND cp.review_expires_at>now() AND cp.published AND cu.profile_public AND cu.status='active' AND cu.deleted_at IS NULL AND NOT cu.deletion_pending AND bc.status='active' AND (bc.ends_on IS NULL OR bc.ends_on>=current_date)))`;

export const publicServiceVisible = sql`${coachingVisible} AND s.status='published' AND v.visibility='public' AND EXISTS(SELECT 1 FROM clubs pc JOIN organizations po ON po.id=pc.id JOIN branch_profiles pb ON pb.club_id=pc.id WHERE pc.id=s.organization_id AND pb.branch_id=s.branch_id AND pc.publication_status='published' AND pc.archived_at IS NULL AND po.status='approved' AND pb.archived_at IS NULL)`;
