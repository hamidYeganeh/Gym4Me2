import { ConflictException, ForbiddenException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db, Tx } from '../clubs/club.repository';
import { rows } from '../commerce/commerce.service';
export async function businessAccess(
  db: Db | Tx,
  actor: string,
  org: string,
  branch?: string,
  roles = ['owner', 'manager', 'accountant'],
) {
  // One organization lock orders plan changes, staff grants and financial writes.
  // The callers use a transaction, so downgrade cannot race an advanced command.
  await db.execute(
    sql`SELECT id FROM organizations WHERE id=${org} FOR UPDATE`,
  );
  const [m] = await rows<{ role: string; all_branches: boolean }>(
    db,
    sql`SELECT role,all_branches FROM organization_members m WHERE m.user_id=${actor} AND m.organization_id=${org} AND (${branch ?? null}::uuid IS NULL OR EXISTS(SELECT 1 FROM branches b WHERE b.id=${branch ?? null} AND b.organization_id=m.organization_id AND (m.role='owner' OR m.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches mb WHERE mb.member_id=m.id AND mb.branch_id=b.id)))) FOR SHARE`,
  );
  if (
    !m ||
    !roles.includes(m.role) ||
    (!branch && m.role !== 'owner' && !m.all_branches)
  )
    throw new ForbiddenException('PH5.denied');
  return m;
}
export async function effectivePlan(db: Db | Tx, org: string) {
  const [r] = await rows<{
    plan_code: string;
    revision: number;
    expires_at: Date | null;
    branch_limit: number;
    advanced_finance: boolean;
    terms_snapshot: {
      legacyBranchLimit?: number;
      branchLimit?: number;
      advancedFinance?: boolean;
    };
  }>(
    db,
    sql`SELECT s.*,p.branch_limit,p.advanced_finance FROM business_subscriptions s JOIN business_plan_catalog p ON p.code=CASE WHEN s.expires_at<=now() THEN 'basic' ELSE s.plan_code END WHERE s.organization_id=${org}`,
  );
  if (r && (!r.expires_at || r.expires_at.getTime() > Date.now())) {
    r.branch_limit = r.terms_snapshot.branchLimit ?? r.branch_limit;
    r.advanced_finance = r.terms_snapshot.advancedFinance ?? r.advanced_finance;
  }
  if (r?.expires_at && r.expires_at.getTime() <= Date.now())
    r.plan_code = 'basic';
  return r;
}
export async function requireAdvanced(db: Db | Tx, org: string) {
  const p = await effectivePlan(db, org);
  if (!p?.advanced_finance) throw new ForbiddenException('PH5.upgradeRequired');
}
export async function assertBranchCapacity(tx: Tx, org: string) {
  const p = await effectivePlan(tx, org);
  if (!p) return; // Legacy raw-imported tenants keep their existing API behavior.
  const [n] = await rows<{ count: number }>(
    tx,
    sql`SELECT count(*)::int count FROM branches b WHERE organization_id=${org} AND NOT EXISTS(SELECT 1 FROM business_branch_state x WHERE x.branch_id=b.id AND NOT x.active)`,
  );
  if (
    n.count >= Math.max(p.branch_limit, p.terms_snapshot.legacyBranchLimit ?? 0)
  )
    throw new ConflictException('PH5.branchLimit');
}
export function sharedMembershipCondition(
  membershipId: string,
  serviceId: string,
  branchId: string,
) {
  return sql`((branch_id=${branchId} AND NOT EXISTS(SELECT 1 FROM business_membership_scope ms WHERE ms.membership_id=${membershipId})) OR EXISTS(SELECT 1 FROM business_membership_scope ms WHERE ms.membership_id=${membershipId} AND ms.service_id=${serviceId} AND ms.branch_id=${branchId}))`;
}

export async function assertBranchWrite(tx: Tx, org: string, branch: string) {
  const p = await effectivePlan(tx, org);
  if (!p) return;
  const [r] = await rows<{ n: number; active: boolean }>(
    tx,
    sql`SELECT n,active FROM (SELECT b.id,row_number() OVER(ORDER BY coalesce(x.active,true) DESC,b.created_at,b.id)::int n,coalesce(x.active,true) active FROM branches b LEFT JOIN business_branch_state x ON x.branch_id=b.id WHERE b.organization_id=${org}) q WHERE id=${branch}`,
  );
  if (
    !r?.active ||
    r.n > Math.max(p.branch_limit, p.terms_snapshot.legacyBranchLimit ?? 0)
  )
    throw new ConflictException('PH5.branchRestricted');
}
export async function effectivePrice(
  tx: Tx,
  org: string,
  branch: string,
  kind: string,
  fallback: string,
) {
  const [r] = await rows<{ amount: string }>(
    tx,
    sql`SELECT coalesce((SELECT amount_minor FROM business_price_exceptions WHERE branch_id=${branch} AND kind=${kind}),(SELECT amount_minor FROM business_price_templates WHERE organization_id=${org} AND kind=${kind}))::text amount`,
  );
  return r?.amount ?? fallback;
}
