import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import type { Environment } from '../../config/environment';
import type { Db, Tx } from '../clubs/club.repository';
import { lockWritableAccount } from '../auth/account-lock';
import { rows } from '../commerce/commerce.service';
import {
  businessAccess,
  effectivePlan,
  requireAdvanced,
  assertBranchCapacity,
  assertBranchWrite,
} from './ph5.access';
import { allocate, coachEarning, type Rule } from './ph5.math';
import * as c from './ph5.contracts';
type Statement = {
  id: string;
  organization_id: string;
  branch_id: string;
  coach_id: string;
  from_on: string;
  to_on: string;
  status: 'draft' | 'approved' | 'paid';
  revision: number;
};
type Earning = {
  id: string;
  amount_minor: string;
  reservation_id: string | null;
  basis_snapshot: {
    orderId?: string;
    refunded?: string;
    orderAmount?: string;
    status?: string;
  };
};
export type Surface = 'business' | 'coach' | 'admin';
const json = (v: unknown) => JSON.stringify(v);
function hash(value: unknown) {
  return createHash('sha256').update(json(value)).digest('hex');
}
@Injectable()
export class AdvancedBusinessService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<Environment, true>,
  ) {}
  private get db() {
    return this.database.db;
  }
  private async admin(db: Db | Tx, actor: string) {
    if (
      !(
        await rows(
          db,
          sql`SELECT user_id FROM platform_admins WHERE user_id=${actor} FOR SHARE`,
        )
      ).length
    )
      throw new ForbiddenException('PH5.denied');
  }
  private async command(
    actor: string,
    action: string,
    input: { idempotencyKey: string },
    authorize: (tx: Tx) => Promise<unknown>,
    execute: (tx: Tx) => Promise<unknown>,
  ) {
    return this.db
      .transaction(async (tx) => {
        await lockWritableAccount(tx, actor);
        await authorize(tx);
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${actor + ':' + input.idempotencyKey},95))`,
        );
        const requestHash = hash({ action, input });
        const [old] = await rows<{ request_hash: string; response: unknown }>(
          tx,
          sql`SELECT request_hash,response FROM business_commands WHERE actor_id=${actor} AND command_key=${input.idempotencyKey}`,
        );
        if (old) {
          if (old.request_hash !== requestHash)
            throw new ConflictException('PH5.conflict');
          return old.response;
        }
        const result = await execute(tx);
        await tx.execute(
          sql`INSERT INTO business_commands(actor_id,command_key,request_hash,response) VALUES(${actor},${input.idempotencyKey},${requestHash},${json(result)}::jsonb)`,
        );
        return result;
      })
      .catch((error: unknown) => {
        const e = error as { code?: string; cause?: { code?: string } };
        if (
          ['23505', '23P01', '40001', '40P01'].includes(
            e.code ?? e.cause?.code ?? '',
          )
        )
          throw new ConflictException('PH5.conflict');
        throw error;
      });
  }
  private async audit(
    tx: Tx,
    actor: string,
    org: string | null,
    action: string,
    target: string,
    reason: string,
  ) {
    await tx.execute(
      sql`INSERT INTO audit_events(actor_id,organization_id,action,target_id,details) VALUES(${actor},${org},${'business.' + action},${target},${json({ reason })}::jsonb)`,
    );
  }
  private async lockOrg(tx: Tx, org: string) {
    if (
      !(
        await rows(
          tx,
          sql`SELECT id FROM organizations WHERE id=${org} FOR UPDATE`,
        )
      ).length
    )
      throw new NotFoundException('PH5.notFound');
  }
  private async statement(
    db: Db | Tx,
    actor: string,
    id: string,
    surface: Surface,
    lock = false,
  ) {
    const [s] = await rows<Statement>(
      db,
      sql`SELECT * FROM business_statements WHERE id=${id} ${lock ? sql`FOR UPDATE` : sql``}`,
    );
    if (!s) throw new NotFoundException('PH5.notFound');
    if (surface === 'coach') {
      if (s.coach_id !== actor) throw new ForbiddenException('PH5.denied');
    } else if (surface === 'admin') await this.admin(db, actor);
    else await businessAccess(db, actor, s.organization_id, s.branch_id);
    return s;
  }
  async overview(actor: string, surface: Surface, f: c.Scope) {
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`);
      if (surface === 'admin') await this.admin(tx, actor);
      else if (surface === 'business')
        await businessAccess(tx, actor, f.organizationId, f.branchId);
      const own = surface === 'coach' ? sql`st.coach_id=${actor}` : sql`true`;
      const statementRows = await rows(
        tx,
        sql`SELECT st.*,u.display_name coach_name,b.name branch_name,coalesce((SELECT sum(e.amount_minor) FROM business_earnings e WHERE e.statement_id=st.id),0)::text earned_minor,coalesce((SELECT sum(a.amount_minor) FROM business_adjustments a JOIN business_earnings e ON e.id=a.earning_id WHERE e.statement_id=st.id),0)::text adjusted_minor,coalesce((SELECT sum(p.amount_minor) FROM business_payouts p WHERE p.statement_id=st.id AND p.state='succeeded'),0)::text paid_minor FROM business_statements st JOIN users u ON u.id=st.coach_id JOIN branches b ON b.id=st.branch_id WHERE st.organization_id=${f.organizationId} AND ${own} AND (${f.branchId ?? null}::uuid IS NULL OR st.branch_id=${f.branchId ?? null}) AND (${f.from ?? null}::date IS NULL OR st.to_on>=${f.from ?? null}::date) AND (${f.to ?? null}::date IS NULL OR st.from_on<=${f.to ?? null}::date) ORDER BY st.created_at DESC,st.id LIMIT 101 OFFSET ${((f.page ?? 1) - 1) * 100}`,
      );
      const statements = statementRows.slice(0, 100);
      const ids = statements.map((s) => String(s.id));
      const set = sql`${`{${ids.join(',')}}`}::uuid[]`;
      const earnings = await rows(
        tx,
        sql`SELECT e.id,e.statement_id,e.contract_id,e.reservation_id,e.source_key,e.amount_minor::text,e.basis_snapshot FROM business_earnings e WHERE statement_id=ANY(${set}) ORDER BY e.created_at,e.id LIMIT 2001`,
      );
      if (earnings.length > 2000)
        throw new ConflictException('PH5.narrowScope');
      const adjustments = await rows(
        tx,
        sql`SELECT a.id,a.earning_id,a.amount_minor::text,a.reason,a.created_at FROM business_adjustments a JOIN business_earnings e ON e.id=a.earning_id WHERE e.statement_id=ANY(${set}) ORDER BY a.created_at`,
      );
      const payouts = await rows(
        tx,
        sql`SELECT id,statement_id,amount_minor::text,method,reference,state,created_at,reconciled_at FROM business_payouts WHERE statement_id=ANY(${set}) ORDER BY created_at DESC`,
      );
      const disputes = await rows(
        tx,
        sql`SELECT d.* FROM business_disputes d JOIN business_earnings e ON e.id=d.earning_id WHERE e.statement_id=ANY(${set}) ORDER BY d.created_at DESC`,
      );
      const totals = (
        await rows(
          tx,
          sql`WITH selected AS(SELECT st.id FROM business_statements st WHERE st.organization_id=${f.organizationId} AND ${own} AND (${f.branchId ?? null}::uuid IS NULL OR st.branch_id=${f.branchId ?? null}) AND (${f.from ?? null}::date IS NULL OR st.to_on>=${f.from ?? null}::date) AND (${f.to ?? null}::date IS NULL OR st.from_on<=${f.to ?? null}::date)) SELECT (SELECT coalesce(sum(e.amount_minor),0)::text FROM business_earnings e WHERE e.statement_id IN(SELECT id FROM selected)) earned_minor,(SELECT coalesce(sum(a.amount_minor),0)::text FROM business_adjustments a JOIN business_earnings e ON e.id=a.earning_id WHERE e.statement_id IN(SELECT id FROM selected)) adjusted_minor,(SELECT coalesce(sum(p.amount_minor),0)::text FROM business_payouts p WHERE p.statement_id IN(SELECT id FROM selected) AND p.state='succeeded') paid_minor`,
        )
      )[0];
      if (surface === 'coach')
        return {
          totals,
          pages: { statements: statementRows.length > 100, memberships: false },
          statements,
          earnings,
          adjustments,
          payouts,
          disputes,
          plans: [],
          branches: [],
          contracts: [],
          memberships: [],
          allocations: [],
          subscription: null,
        };
      const branches = await rows(
        tx,
        sql`SELECT b.id,b.name,coalesce(x.active,true) active,coalesce(x.revision,0) revision,(SELECT count(*)::int FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id WHERE s.branch_id=b.id AND o.start_at>now() AND r.status IN('held','pending_approval','confirmed')) future_bookings FROM branches b LEFT JOIN business_branch_state x ON x.branch_id=b.id WHERE b.organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR b.id=${f.branchId ?? null}) ORDER BY b.name`,
      );
      const contracts = await rows(
        tx,
        sql`SELECT cc.*,cc.costs_minor::text,u.display_name coach_name,rr.mode,rr.amount_minor::text,rr.discount_payer,rr.space_minor::text,rr.platform_bps FROM coaching_contracts cc JOIN users u ON u.id=cc.coach_id LEFT JOIN business_contract_rules rr ON rr.contract_id=cc.id WHERE cc.organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR cc.branch_id=${f.branchId ?? null}) ORDER BY cc.version DESC LIMIT 200`,
      );
      const membershipRows = await rows(
        tx,
        sql`SELECT m.id,m.revision,m.branch_id,m.granted,m.consumed,u.display_name,v.title FROM sport_memberships m JOIN users u ON u.id=m.user_id JOIN sport_service_versions v ON v.id=m.version_id WHERE m.organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR m.branch_id=${f.branchId ?? null}) ORDER BY m.created_at DESC,m.id LIMIT 101 OFFSET ${((f.page ?? 1) - 1) * 100}`,
      );
      const memberships = membershipRows.slice(0, 100);
      const allocations = await rows(
        tx,
        sql`SELECT a.membership_id,a.branch_id,a.amount_minor::text,a.basis_points FROM business_allocations a JOIN sport_memberships m ON m.id=a.membership_id WHERE m.organization_id=${f.organizationId} AND m.id=ANY(${`{${memberships.map((m) => String(m.id)).join(',')}}`}::uuid[]) AND (${f.branchId ?? null}::uuid IS NULL OR a.branch_id=${f.branchId ?? null})`,
      );
      const report = await rows(
        tx,
        sql`WITH eligible AS(SELECT id FROM branches WHERE organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR id=${f.branchId ?? null})), orders AS(SELECT o.* FROM sport_orders o WHERE coalesce(o.snapshot->>'kind','')<>'split_share' AND o.organization_id=${f.organizationId} AND (o.snapshot->>'branchId')::uuid IN(SELECT id FROM eligible) AND o.created_at>=coalesce(${f.from ?? null}::date,'1970-01-01'::date) AND o.created_at<coalesce(${f.to ?? null}::date+1,'9999-01-01'::date)) SELECT (SELECT coalesce(sum(amount_minor),0)::text FROM orders WHERE status IN('paid','partially_refunded','refunded')) sold_minor,(SELECT coalesce(sum(p.amount_minor),0)::text FROM sport_payments p JOIN sport_orders o ON o.id=p.order_id WHERE o.organization_id=${f.organizationId} AND (o.snapshot->>'branchId')::uuid IN(SELECT id FROM eligible) AND p.state='verified' AND p.provider<>'team_split' AND p.verified_at>=coalesce(${f.from ?? null}::date,'1970-01-01'::date) AND p.verified_at<coalesce(${f.to ?? null}::date+1,'9999-01-01'::date)) collected_minor,(SELECT count(DISTINCT user_id)::int FROM sport_memberships WHERE organization_id=${f.organizationId} AND (branch_id IN(SELECT id FROM eligible) OR EXISTS(SELECT 1 FROM business_membership_scope ms WHERE ms.membership_id=sport_memberships.id AND ms.branch_id IN(SELECT id FROM eligible)))) unique_members,(SELECT count(*)::int FROM orders o WHERE EXISTS(SELECT 1 FROM sport_orders prior WHERE prior.user_id=o.user_id AND prior.organization_id=o.organization_id AND prior.service_id=o.service_id AND prior.created_at<o.created_at AND prior.status IN('paid','partially_refunded')) AND o.status IN('paid','partially_refunded') AND EXISTS(SELECT 1 FROM sport_services rs WHERE rs.id=o.service_id AND rs.kind='membership')) renewals,(SELECT count(*)::int FROM orders o WHERE o.status IN('paid','partially_refunded') AND EXISTS(SELECT 1 FROM sport_services rs WHERE rs.id=o.service_id AND rs.kind='membership')) renewal_denominator,(SELECT coalesce(sum(occ.capacity),0)::text FROM sport_occurrences occ JOIN sport_services ss ON ss.id=occ.service_id WHERE ss.branch_id IN(SELECT id FROM eligible) AND occ.status<>'cancelled' AND occ.start_at>=coalesce(${f.from ?? null}::date,'1970-01-01'::date) AND occ.start_at<coalesce(${f.to ?? null}::date+1,'9999-01-01'::date)) capacity`,
      );
      const comparison = await rows(
        tx,
        sql`WITH sums AS(SELECT a.branch_id,a.membership_id,CASE WHEN row_number() OVER(PARTITION BY a.membership_id ORDER BY (a.basis_points>0) DESC,a.branch_id DESC)=1 THEN greatest(0,o.amount_minor-o.refunded_minor)-coalesce(sum(greatest(0,o.amount_minor-o.refunded_minor)*a.basis_points/10000) OVER(PARTITION BY a.membership_id ORDER BY a.branch_id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) ELSE greatest(0,o.amount_minor-o.refunded_minor)*a.basis_points/10000 END allocated FROM business_allocations a JOIN sport_memberships m ON m.id=a.membership_id JOIN sport_orders o ON o.id=m.order_id WHERE m.organization_id=${f.organizationId} AND o.created_at>=coalesce(${f.from ?? null}::date,'1970-01-01'::date) AND o.created_at<coalesce(${f.to ?? null}::date+1,'9999-01-01'::date)) SELECT b.id,b.name,(SELECT coalesce(sum(o.amount_minor),0)::text FROM sport_orders o WHERE o.organization_id=b.organization_id AND o.snapshot->>'branchId'=b.id::text AND coalesce(o.snapshot->>'kind','')<>'split_share' AND o.status IN('paid','partially_refunded','refunded') AND o.created_at>=coalesce(${f.from ?? null}::date,'1970-01-01'::date) AND o.created_at<coalesce(${f.to ?? null}::date+1,'9999-01-01'::date)) sold_minor,(SELECT coalesce(sum(allocated),0)::text FROM sums WHERE branch_id=b.id) allocated_minor,(SELECT count(DISTINCT m.user_id)::int FROM sport_memberships m WHERE m.organization_id=b.organization_id AND (m.branch_id=b.id OR EXISTS(SELECT 1 FROM business_membership_scope ms WHERE ms.membership_id=m.id AND ms.branch_id=b.id))) members FROM branches b WHERE b.organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR b.id=${f.branchId ?? null}) ORDER BY b.name`,
      );
      const prices = await rows(
        tx,
        sql`SELECT p.kind,p.amount_minor::text,p.revision,null::uuid branch_id FROM business_price_templates p WHERE organization_id=${f.organizationId} UNION ALL SELECT p.kind,p.amount_minor::text,p.revision,p.branch_id FROM business_price_exceptions p JOIN branches b ON b.id=p.branch_id WHERE b.organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR b.id=${f.branchId ?? null})`,
      );
      const services = await rows(
        tx,
        sql`SELECT id,title,branch_id,kind FROM sport_services WHERE organization_id=${f.organizationId} AND (${f.branchId ?? null}::uuid IS NULL OR branch_id=${f.branchId ?? null}) AND status='published' ORDER BY title LIMIT 500`,
      );
      return {
        totals,
        pages: {
          statements: statementRows.length > 100,
          memberships: membershipRows.length > 100,
        },
        statements,
        earnings,
        adjustments,
        payouts,
        disputes,
        branches,
        contracts,
        memberships,
        allocations,
        report: report[0],
        comparison,
        prices,
        services,
        planPayments: await rows(
          tx,
          sql`SELECT id,plan_code,amount_minor::text,state,reference FROM business_plan_payments WHERE organization_id=${f.organizationId} ORDER BY created_at DESC LIMIT 30`,
        ),
        subscription: await effectivePlan(tx, f.organizationId),
        plans: await rows(
          tx,
          sql`SELECT code,amount_minor::text,branch_limit,advanced_finance,terms,revision FROM business_plan_catalog ORDER BY code`,
        ),
      };
    });
  }
  async options(actor: string, surface: Surface) {
    if (surface === 'admin') await this.admin(this.db, actor);
    const eligible =
      surface === 'admin'
        ? sql`true`
        : surface === 'coach'
          ? sql`EXISTS(SELECT 1 FROM business_statements st WHERE st.organization_id=g.id AND st.coach_id=${actor})`
          : sql`EXISTS(SELECT 1 FROM organization_members m WHERE m.organization_id=g.id AND m.user_id=${actor} AND m.role IN('owner','manager','accountant'))`;
    const organizations = await rows(
      this.db,
      sql`SELECT g.id,g.name,(SELECT role FROM organization_members WHERE organization_id=g.id AND user_id=${actor}) role,coalesce((SELECT all_branches OR role='owner' FROM organization_members WHERE organization_id=g.id AND user_id=${actor}),true) all_branches FROM organizations g WHERE ${eligible} ORDER BY g.name LIMIT 1001`,
    );
    if (organizations.length > 1000)
      throw new ConflictException('PH5.narrowScope');
    const branches =
      surface === 'coach'
        ? []
        : await rows(
            this.db,
            sql`SELECT b.id,b.organization_id,b.name FROM branches b JOIN organizations g ON g.id=b.organization_id WHERE ${eligible} AND ${surface === 'admin' ? sql`true` : sql`EXISTS(SELECT 1 FROM organization_members m WHERE m.organization_id=g.id AND m.user_id=${actor} AND (m.role='owner' OR m.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches mb WHERE mb.member_id=m.id AND mb.branch_id=b.id)))`} ORDER BY b.name LIMIT 1001`,
          );
    if (branches.length > 1000) throw new ConflictException('PH5.narrowScope');
    return { organizations, branches };
  }
  async coachOrganizations(actor: string) {
    return rows(
      this.db,
      sql`SELECT DISTINCT g.id,g.name FROM organizations g JOIN business_statements st ON st.organization_id=g.id WHERE st.coach_id=${actor} ORDER BY g.name`,
    );
  }
  async configurePlan(actor: string, i: z.infer<typeof c.catalogSchema>) {
    return this.command(
      actor,
      'catalog',
      i,
      (tx) => this.admin(tx, actor),
      async (tx) => {
        const [p] = await rows(
          tx,
          sql`UPDATE business_plan_catalog SET amount_minor=${i.amountMinor},branch_limit=${i.branchLimit},terms=terms,revision=revision+1 WHERE code=${i.code} AND revision=${i.revision} RETURNING code,revision`,
        );
        if (!p) throw new ConflictException('PH5.conflict');
        await this.audit(
          tx,
          actor,
          null,
          'plan.configured',
          randomUUID(),
          i.reason,
        );
        return p;
      },
    );
  }
  async selectPlan(actor: string, i: z.infer<typeof c.planSchema>) {
    return this.command(
      actor,
      'plan',
      i,
      (tx) => businessAccess(tx, actor, i.organizationId, undefined, ['owner']),
      async (tx) => {
        await this.lockOrg(tx, i.organizationId);
        const [p] = await rows<{
          revision: number;
          amount_minor: string;
          branch_limit: number;
          terms: string;
          advanced_finance: boolean;
        }>(
          tx,
          sql`SELECT *,amount_minor::text FROM business_plan_catalog WHERE code=${i.plan} FOR SHARE`,
        );
        const [s] = await rows<{ revision: number; expires_at: Date | null }>(
          tx,
          sql`SELECT revision,expires_at FROM business_subscriptions WHERE organization_id=${i.organizationId} FOR UPDATE`,
        );
        if (
          (s?.revision ?? 1) !== i.revision ||
          p.revision !== i.catalogRevision
        )
          throw new ConflictException('PH5.conflict');
        if (
          !this.config.get('DEMO_MODE', { infer: true }) &&
          (i.plan === 'pro' || BigInt(p.amount_minor) > 0n)
        )
          throw new ForbiddenException('PH5.providerRequired');
        const expiry = new Date(
          Math.max(Date.now(), s?.expires_at?.getTime() ?? 0) +
            i.months * 30 * 86400000,
        );
        if (
          (
            await rows(
              tx,
              sql`SELECT id FROM business_plan_payments WHERE organization_id=${i.organizationId} AND state='unknown'`,
            )
          ).length
        )
          throw new ConflictException('PH5.unresolved');
        const reference = 'plan-' + randomUUID();
        await tx.execute(
          sql`INSERT INTO business_plan_payments(organization_id,plan_code,amount_minor,catalog_revision,state,reference,expires_at,snapshot) VALUES(${i.organizationId},${i.plan},${(BigInt(p.amount_minor) * BigInt(i.months)).toString()},${p.revision},${i.outcome},${reference},${expiry},${json({ terms: p.terms, amountMinor: p.amount_minor, catalogRevision: p.revision, branchLimit: p.branch_limit, advancedFinance: p.advanced_finance, subscriptionRevision: s?.revision ?? 1, months: i.months })}::jsonb)`,
        );
        if (i.outcome === 'succeeded')
          await tx.execute(
            sql`INSERT INTO business_subscriptions(organization_id,plan_code,expires_at,terms_snapshot) VALUES(${i.organizationId},${i.plan},${i.plan === 'basic' ? null : expiry},${json({ terms: p.terms, amountMinor: p.amount_minor, catalogRevision: p.revision, branchLimit: p.branch_limit, advancedFinance: p.advanced_finance })}::jsonb) ON CONFLICT(organization_id) DO UPDATE SET plan_code=EXCLUDED.plan_code,expires_at=EXCLUDED.expires_at,terms_snapshot=EXCLUDED.terms_snapshot,revision=business_subscriptions.revision+1,updated_at=now()`,
          );
        await this.audit(
          tx,
          actor,
          i.organizationId,
          'plan.changed',
          i.organizationId,
          i.reason,
        );
        return { reference, state: i.outcome, expiresAt: expiry };
      },
    );
  }
  async rule(actor: string, i: z.infer<typeof c.ruleSchema>) {
    const contract = async (tx: Tx) => {
      const [c] = await rows<{ organization_id: string; branch_id: string }>(
        tx,
        sql`SELECT * FROM coaching_contracts WHERE id=${i.contractId} FOR SHARE`,
      );
      if (!c) throw new NotFoundException('PH5.notFound');
      await businessAccess(tx, actor, c.organization_id, c.branch_id, [
        'owner',
        'manager',
      ]);
      await requireAdvanced(tx, c.organization_id);
      return c;
    };
    return this.command(actor, 'rule', i, contract, async (tx) => {
      const cc = await contract(tx);
      if (
        (
          await rows(
            tx,
            sql`SELECT id FROM coaching_ledger WHERE contract_id=${i.contractId} AND confirmed LIMIT 1`,
          )
        ).length
      )
        throw new ConflictException('PH5.legacyBalance');
      if (
        (
          await rows(
            tx,
            sql`SELECT id FROM business_earnings WHERE contract_id=${i.contractId} LIMIT 1`,
          )
        ).length
      )
        throw new ConflictException('PH5.immutable');
      const result = await rows(
        tx,
        sql`INSERT INTO business_contract_rules(contract_id,mode,amount_minor,discount_payer,space_minor,platform_bps,created_by) VALUES(${i.contractId},${i.mode},${i.amountMinor},${i.discountPayer},${i.spaceMinor},${i.platformBps},${actor}) ON CONFLICT DO NOTHING RETURNING contract_id`,
      );
      if (!result.length) throw new ConflictException('PH5.immutable');
      await this.audit(
        tx,
        actor,
        cc.organization_id,
        'rule.created',
        i.contractId,
        i.reason,
      );
      return result[0];
    });
  }
  async close(actor: string, i: z.infer<typeof c.statementSchema>) {
    return this.command(
      actor,
      'close',
      i,
      async (tx) => {
        await businessAccess(tx, actor, i.organizationId, i.branchId);
        await requireAdvanced(tx, i.organizationId);
      },
      async (tx) => {
        await this.lockOrg(tx, i.organizationId);
        if (Date.parse(i.to + 'T23:59:59.999Z') >= Date.now())
          throw new ConflictException('PH5.periodNotEnded');
        if (
          (
            await rows(
              tx,
              sql`SELECT id FROM business_statements WHERE branch_id=${i.branchId} AND coach_id=${i.coachId} AND daterange(from_on,to_on,'[]') && daterange(${i.from}::date,${i.to}::date,'[]')`,
            )
          ).length
        )
          throw new ConflictException('PH5.overlap');
        const [st] = await rows<Statement>(
          tx,
          sql`INSERT INTO business_statements(organization_id,branch_id,coach_id,from_on,to_on,created_by) VALUES(${i.organizationId},${i.branchId},${i.coachId},${i.from},${i.to},${actor}) RETURNING *`,
        );
        const [missing] = await rows<{ count: number }>(
          tx,
          sql`SELECT count(*)::int count FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_service_versions v ON v.id=o.version_id JOIN sport_services ss ON ss.id=o.service_id LEFT JOIN LATERAL(SELECT cc.id FROM coaching_contracts cc WHERE cc.branch_id=ss.branch_id AND cc.coach_id=${i.coachId} AND cc.starts_on<=(o.start_at AT TIME ZONE (SELECT timezone FROM branches WHERE id=ss.branch_id))::date AND (cc.ends_on IS NULL OR cc.ends_on>=(o.start_at AT TIME ZONE (SELECT timezone FROM branches WHERE id=ss.branch_id))::date) ORDER BY cc.version DESC LIMIT 1) cc ON true LEFT JOIN business_contract_rules rr ON rr.contract_id=cc.id WHERE ss.branch_id=${i.branchId} AND v.coach_user_id=${i.coachId} AND r.status='completed' AND (o.start_at AT TIME ZONE (SELECT timezone FROM branches WHERE id=ss.branch_id))::date BETWEEN ${i.from}::date AND ${i.to}::date AND rr.contract_id IS NULL`,
        );
        if (missing.count) throw new ConflictException('PH5.ruleRequired');
        const source = await rows<{
          id: string;
          membership_id: string | null;
          membership_granted: number | null;
          contract_id: string;
          share_basis_points: number;
          basis: 'gross' | 'net';
          costs_minor: string;
          mode: Rule['mode'];
          amount_minor: string;
          discount_payer: Rule['discountPayer'];
          space_minor: string;
          platform_bps: number;
          gross: string;
          collected: string;
          order_id: string;
          refunded: string;
          order_amount: string;
          version_id: string;
        }>(
          tx,
          sql`SELECT r.id,mem.id membership_id,mem.granted membership_granted,cc.id contract_id,cc.version contract_version,cc.starts_on contract_start,cc.ends_on contract_end,cc.terms contract_terms,cc.share_basis_points,cc.basis,cc.costs_minor::text,rr.mode,rr.amount_minor::text,rr.discount_payer,rr.space_minor::text,rr.platform_bps,(CASE WHEN mem.id IS NOT NULL THEN ord.amount_minor/greatest(1,coalesce(mem.granted,1)) ELSE v.amount_minor/greatest(1,(SELECT count(*) FROM sport_reservations rx WHERE rx.order_id=ord.id)) END)::text gross,(greatest(0,ord.amount_minor-ord.refunded_minor)/greatest(1,coalesce(mem.granted,(SELECT count(*)::int FROM sport_reservations rx WHERE rx.order_id=ord.id))))::text collected,ord.id order_id,ord.refunded_minor::text refunded,ord.amount_minor::text order_amount,v.id version_id FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services ss ON ss.id=o.service_id JOIN sport_service_versions v ON v.id=o.version_id LEFT JOIN sport_memberships mem ON mem.id=r.membership_id JOIN sport_orders ord ON ord.id=coalesce(mem.order_id,r.order_id) JOIN LATERAL(SELECT c.* FROM coaching_contracts c WHERE c.branch_id=ss.branch_id AND c.coach_id=${i.coachId} AND c.starts_on<=(o.start_at AT TIME ZONE (SELECT timezone FROM branches WHERE id=ss.branch_id))::date AND (c.ends_on IS NULL OR c.ends_on>=(o.start_at AT TIME ZONE (SELECT timezone FROM branches WHERE id=ss.branch_id))::date) ORDER BY c.version DESC LIMIT 1) cc ON true JOIN business_contract_rules rr ON rr.contract_id=cc.id WHERE ss.organization_id=${i.organizationId} AND ss.branch_id=${i.branchId} AND v.coach_user_id=${i.coachId} AND r.status='completed' AND ord.status IN('paid','partially_refunded') AND (o.start_at AT TIME ZONE (SELECT timezone FROM branches WHERE id=ss.branch_id))::date BETWEEN ${i.from}::date AND ${i.to}::date ORDER BY o.start_at,r.id LIMIT 2001`,
        );
        if (source.length > 2000)
          throw new ConflictException('PH5.narrowScope');
        for (const r of source) {
          if (
            r.mode === 'percentage' &&
            r.membership_id &&
            r.membership_granted === null
          )
            throw new ConflictException('PH5.unlimitedBasis');
          if (
            (
              await rows(
                tx,
                sql`SELECT id FROM coaching_ledger WHERE contract_id=${r.contract_id} AND confirmed LIMIT 1`,
              )
            ).length
          )
            throw new ConflictException('PH5.legacyBalance');
          if (r.mode === 'fixed') continue;
          const amount = coachEarning(r.gross, r.collected, {
            mode: r.mode,
            amountMinor: r.amount_minor,
            shareBps: r.share_basis_points,
            discountPayer: r.discount_payer,
            spaceMinor: r.space_minor,
            platformBps: r.platform_bps,
            basis: r.basis,
          });
          await tx.execute(
            sql`INSERT INTO business_earnings(statement_id,contract_id,reservation_id,source_key,amount_minor,basis_snapshot) VALUES(${st.id},${r.contract_id},${r.id},${'reservation:' + r.id},${amount},${json({ ...r, orderId: r.order_id, orderAmount: r.order_amount, status: 'completed' })}::jsonb) ON CONFLICT(source_key) DO NOTHING`,
          );
        }
        const fixed = await rows<{
          id: string;
          amount_minor: string;
          days: number;
        }>(
          tx,
          sql`WITH effective AS(SELECT d.service_date::date AS service_date,c.id,c.terms contract_terms,c.version contract_version,rr.amount_minor,rr.mode FROM generate_series(${i.from}::date,${i.to}::date,interval '1 day') d(service_date) JOIN LATERAL(SELECT cc.* FROM coaching_contracts cc WHERE cc.organization_id=${i.organizationId} AND cc.branch_id=${i.branchId} AND cc.coach_id=${i.coachId} AND cc.starts_on<=d.service_date::date AND (cc.ends_on IS NULL OR cc.ends_on>=d.service_date::date) ORDER BY cc.version DESC LIMIT 1) c ON true JOIN business_contract_rules rr ON rr.contract_id=c.id) SELECT id,amount_minor::text,count(*)::int days,max(contract_terms) contract_terms,max(contract_version) contract_version FROM effective WHERE mode='fixed' GROUP BY id,amount_minor`,
        );
        for (const f of fixed)
          await tx.execute(
            sql`INSERT INTO business_earnings(statement_id,contract_id,source_key,amount_minor,basis_snapshot) VALUES(${st.id},${f.id},${'fixed:' + f.id + ':' + i.from + ':' + i.to},${((BigInt(f.amount_minor) * BigInt(f.days)) / 30n).toString()},${json({ mode: 'fixed', from: i.from, to: i.to, ...f })}::jsonb)`,
          );
        if (!source.length && !fixed.length)
          throw new ConflictException('PH5.ruleRequired');
        await this.audit(
          tx,
          actor,
          i.organizationId,
          'statement.closed',
          st.id,
          'Closed period ' + i.from + ' / ' + i.to,
        );
        return st;
      },
    );
  }
  private async syncCorrections(
    tx: Tx,
    actor: string,
    s: Statement,
    bumpRevision = true,
  ) {
    let changed = false;
    const es = await rows<Earning & { status: string; current_refund: string }>(
      tx,
      sql`SELECT e.id,e.amount_minor::text,e.reservation_id,e.basis_snapshot,r.status,o.refunded_minor::text current_refund FROM business_earnings e JOIN sport_reservations r ON r.id=e.reservation_id JOIN sport_orders o ON o.id=(e.basis_snapshot->>'orderId')::uuid WHERE e.statement_id=${s.id} FOR SHARE OF r,o`,
    );
    for (const e of es) {
      let target = BigInt(e.amount_minor);
      if (e.status !== 'completed') target = 0n;
      else if (BigInt(e.basis_snapshot.orderAmount ?? '0') > 0n) {
        const now = BigInt(e.current_refund),
          before = BigInt(e.basis_snapshot.refunded ?? '0'),
          original = BigInt(e.basis_snapshot.orderAmount!);
        if (now > before && original > before)
          target = (target * (original - now)) / (original - before);
      }
      const [applied] = await rows<{ amount: string }>(
        tx,
        sql`SELECT coalesce(sum(amount_minor),0)::text amount FROM business_adjustments WHERE earning_id=${e.id} AND source_key LIKE ${'auto:' + e.id + ':%'}`,
      );
      const delta = target - BigInt(e.amount_minor) - BigInt(applied.amount);
      if (delta !== 0n) {
        await tx.execute(
          sql`INSERT INTO business_adjustments(earning_id,amount_minor,reason,source_key,actor_id) VALUES(${e.id},${delta.toString()},'Source refund or session result changed',${'auto:' + e.id + ':' + e.status + ':' + e.current_refund + ':' + randomUUID()},${actor}) ON CONFLICT DO NOTHING`,
        );
        changed = true;
      }
    }
    if (changed && bumpRevision) {
      const due = await this.balance(tx, s.id);
      await tx.execute(
        sql`UPDATE business_statements SET revision=revision+1,status=CASE WHEN status='paid' AND ${due.toString()}::bigint<=0 THEN 'paid' ELSE 'draft' END WHERE id=${s.id}`,
      );
    }
    return changed;
  }
  private async balance(tx: Tx, id: string) {
    const [r] = await rows<{ due: string }>(
      tx,
      sql`SELECT ((SELECT coalesce(sum(amount_minor),0) FROM business_earnings WHERE statement_id=${id})+(SELECT coalesce(sum(a.amount_minor),0) FROM business_adjustments a JOIN business_earnings e ON e.id=a.earning_id WHERE e.statement_id=${id})-(SELECT coalesce(sum(amount_minor),0) FROM business_payouts WHERE statement_id=${id} AND state='succeeded'))::text due`,
    );
    return BigInt(r.due);
  }
  async approve(actor: string, id: string, i: z.infer<typeof c.approveSchema>) {
    return this.command(
      actor,
      'approve:' + id,
      i,
      (tx) => this.statement(tx, actor, id, 'business'),
      async (tx) => {
        const s = await this.statement(tx, actor, id, 'business', true);
        if (s.revision !== i.revision || s.status !== 'draft')
          throw new ConflictException('PH5.conflict');
        await this.syncCorrections(tx, actor, s, false);
        if (
          (
            await rows(
              tx,
              sql`SELECT d.id FROM business_disputes d JOIN business_earnings e ON e.id=d.earning_id WHERE e.statement_id=${id} AND d.state='open'`,
            )
          ).length
        )
          throw new ConflictException('PH5.openDispute');
        await tx.execute(
          sql`UPDATE business_statements SET status='approved',revision=revision+1,approved_at=now() WHERE id=${id}`,
        );
        await this.audit(
          tx,
          actor,
          s.organization_id,
          'statement.approved',
          id,
          i.reason,
        );
        return { id, status: 'approved' };
      },
    );
  }
  async payout(actor: string, id: string, i: z.infer<typeof c.payoutSchema>) {
    return this.command(
      actor,
      'payout:' + id,
      i,
      (tx) => this.statement(tx, actor, id, 'business'),
      async (tx) => {
        const s = await this.statement(tx, actor, id, 'business', true);
        if (s.revision !== i.revision || s.status !== 'approved')
          throw new ConflictException('PH5.conflict');
        if (await this.syncCorrections(tx, actor, s, false))
          throw new ConflictException('PH5.conflict');
        if (
          (
            await rows(
              tx,
              sql`SELECT p.id FROM business_payouts p WHERE p.statement_id=${id} AND p.state='unknown' UNION ALL SELECT d.id FROM business_disputes d JOIN business_earnings e ON e.id=d.earning_id WHERE e.statement_id=${id} AND d.state='open'`,
            )
          ).length
        )
          throw new ConflictException('PH5.unresolved');
        if (
          i.method === 'mock' &&
          !this.config.get('DEMO_MODE', { infer: true })
        )
          throw new ForbiddenException('PH5.providerRequired');
        const due = await this.balance(tx, id);
        if (due <= 0n) throw new ConflictException('PH5.noBalance');
        if (
          (
            await rows(
              tx,
              sql`SELECT id FROM business_payouts WHERE reference=${i.reference}`,
            )
          ).length
        )
          throw new ConflictException('PH5.conflict');
        const [p] = await rows(
          tx,
          sql`INSERT INTO business_payouts(statement_id,amount_minor,method,reference,state,actor_id) VALUES(${id},${due.toString()},${i.method},${i.reference},${i.outcome},${actor}) RETURNING id,state,amount_minor::text,reference`,
        );
        await tx.execute(
          sql`UPDATE business_statements SET status=${i.outcome === 'succeeded' ? 'paid' : 'approved'},revision=revision+1 WHERE id=${id}`,
        );
        await this.audit(
          tx,
          actor,
          s.organization_id,
          'payout.recorded',
          String(p.id),
          i.reason,
        );
        return p;
      },
    );
  }
  async reconcile(
    actor: string,
    id: string,
    i: z.infer<typeof c.reconcileSchema>,
  ) {
    const load = async (tx: Tx) => {
      const [p] = await rows<{ statement_id: string; state: string }>(
        tx,
        sql`SELECT statement_id,state FROM business_payouts WHERE id=${id}`,
      );
      if (!p) throw new NotFoundException('PH5.notFound');
      const s = await this.statement(
        tx,
        actor,
        p.statement_id,
        'business',
        true,
      );
      return { p, s };
    };
    return this.command(actor, 'reconcile:' + id, i, load, async (tx) => {
      const { p, s } = await load(tx);
      if (p.state !== 'unknown') throw new ConflictException('PH5.conflict');
      await tx.execute(
        sql`UPDATE business_payouts SET state=${i.outcome},reconciled_at=now() WHERE id=${id}`,
      );
      await tx.execute(
        sql`UPDATE business_statements SET status=${(await this.balance(tx, s.id)) <= 0n ? 'paid' : s.status === 'draft' ? 'draft' : 'approved'},revision=revision+1 WHERE id=${s.id}`,
      );
      await this.audit(
        tx,
        actor,
        s.organization_id,
        'payout.reconciled',
        id,
        i.reason,
      );
      return { id, state: i.outcome };
    });
  }
  async dispute(
    actor: string,
    surface: Surface,
    i: z.infer<typeof c.disputeSchema>,
  ) {
    const load = async (tx: Tx) => {
      const [e] = await rows<{ statement_id: string }>(
        tx,
        sql`SELECT statement_id FROM business_earnings WHERE id=${i.earningId}`,
      );
      if (!e) throw new NotFoundException('PH5.notFound');
      return this.statement(tx, actor, e.statement_id, surface, true);
    };
    return this.command(actor, 'dispute', i, load, async (tx) => {
      const s = await load(tx);
      const [d] = await rows(
        tx,
        sql`INSERT INTO business_disputes(earning_id,opened_by,reason) VALUES(${i.earningId},${actor},${i.reason}) RETURNING *`,
      );
      await this.audit(
        tx,
        actor,
        s.organization_id,
        'dispute.opened',
        String(d.id),
        i.reason,
      );
      return d;
    });
  }
  async resolve(
    actor: string,
    surface: Surface,
    id: string,
    i: z.infer<typeof c.resolveSchema>,
  ) {
    const load = async (tx: Tx) => {
      const [d] = await rows<{
        earning_id: string;
        statement_id: string;
        revision: number;
        state: string;
      }>(
        tx,
        sql`SELECT d.*,e.statement_id FROM business_disputes d JOIN business_earnings e ON e.id=d.earning_id WHERE d.id=${id}`,
      );
      if (!d) throw new NotFoundException('PH5.notFound');
      const s = await this.statement(tx, actor, d.statement_id, surface, true);
      return { d, s };
    };
    return this.command(actor, 'resolve:' + id, i, load, async (tx) => {
      const { d, s } = await load(tx);
      if (d.state !== 'open' || d.revision !== i.revision)
        throw new ConflictException('PH5.conflict');
      if (BigInt(i.amountMinor) !== 0n)
        await tx.execute(
          sql`INSERT INTO business_adjustments(earning_id,amount_minor,reason,source_key,actor_id) VALUES(${d.earning_id},${i.amountMinor},${i.reason},${'dispute:' + id},${actor})`,
        );
      await tx.execute(
        sql`UPDATE business_disputes SET state='resolved',decision=${i.reason},revision=revision+1 WHERE id=${id}`,
      );
      await tx.execute(
        sql`UPDATE business_statements SET status=CASE WHEN status='draft' THEN 'draft' ELSE 'approved' END,revision=revision+1 WHERE id=${s.id}`,
      );
      await this.audit(
        tx,
        actor,
        s.organization_id,
        'dispute.resolved',
        id,
        i.reason,
      );
      return { id, state: 'resolved' };
    });
  }
  async branch(actor: string, i: z.infer<typeof c.branchSchema>) {
    return this.command(
      actor,
      'branch',
      i,
      (tx) =>
        businessAccess(tx, actor, i.organizationId, i.branchId, ['owner']),
      async (tx) => {
        await this.lockOrg(tx, i.organizationId);
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${i.branchId},96))`,
        );
        const [old] = await rows<{ active: boolean; revision: number }>(
          tx,
          sql`SELECT * FROM business_branch_state WHERE branch_id=${i.branchId} FOR UPDATE`,
        );
        if ((old?.revision ?? 0) !== i.revision)
          throw new ConflictException('PH5.conflict');
        if (i.active && old?.active === false)
          await assertBranchCapacity(tx, i.organizationId);
        await tx.execute(
          sql`INSERT INTO business_branch_state(branch_id,active,reason) VALUES(${i.branchId},${i.active},${i.reason}) ON CONFLICT(branch_id) DO UPDATE SET active=EXCLUDED.active,reason=EXCLUDED.reason,revision=business_branch_state.revision+1,updated_at=now()`,
        );
        await this.audit(
          tx,
          actor,
          i.organizationId,
          'branch.changed',
          i.branchId,
          i.reason,
        );
        return { id: i.branchId, active: i.active };
      },
    );
  }
  async shared(actor: string, i: z.infer<typeof c.sharedSchema>) {
    const load = async (tx: Tx) => {
      const [m] = await rows<{
        organization_id: string;
        branch_id: string;
        revision: number;
        consumed: number;
        order_id: string | null;
      }>(tx, sql`SELECT * FROM sport_memberships WHERE id=${i.membershipId}`);
      if (!m) throw new NotFoundException('PH5.notFound');
      await businessAccess(tx, actor, m.organization_id, undefined, ['owner']);
      await requireAdvanced(tx, m.organization_id);
      return m;
    };
    return this.command(actor, 'shared', i, load, async (tx) => {
      const m = await load(tx);
      await tx.execute(
        sql`SELECT id FROM sport_memberships WHERE id=${i.membershipId} FOR UPDATE`,
      );
      const [fresh] = await rows<{ revision: number }>(
        tx,
        sql`SELECT revision FROM sport_memberships WHERE id=${i.membershipId}`,
      );
      if (fresh.revision !== i.revision)
        throw new ConflictException('PH5.conflict');
      if (
        (
          await rows(
            tx,
            sql`SELECT id FROM sport_reservations WHERE membership_id=${i.membershipId} LIMIT 1`,
          )
        ).length ||
        m.consumed > 0 ||
        (
          await rows(
            tx,
            sql`SELECT id FROM business_allocations WHERE membership_id=${i.membershipId}`,
          )
        ).length
      )
        throw new ConflictException('PH5.immutable');
      const services = await rows<{ id: string; branch_id: string }>(
        tx,
        sql`SELECT s.id,s.branch_id FROM sport_services s WHERE s.id=ANY(${`{${i.services.join(',')}}`}::uuid[]) AND s.organization_id=${m.organization_id} AND s.kind<>'membership' AND s.status='published' AND NOT EXISTS(SELECT 1 FROM business_branch_state b WHERE b.branch_id=s.branch_id AND NOT b.active)`,
      );
      if (services.length !== i.services.length)
        throw new ForbiddenException('PH5.denied');
      if (
        i.allocations.some(
          (a) =>
            !services.some((s) => s.branch_id === a.branchId) &&
            a.branchId !== m.branch_id,
        )
      )
        throw new ForbiddenException('PH5.denied');
      const [order] = await rows<{ amount: string }>(
        tx,
        sql`SELECT greatest(0,amount_minor-refunded_minor)::text amount FROM sport_orders WHERE id=${m.order_id} AND status IN('paid','partially_refunded') FOR SHARE`,
      );
      if (!order) throw new ConflictException('PH5.paymentRequired');
      await tx.execute(
        sql`DELETE FROM business_membership_scope WHERE membership_id=${i.membershipId}`,
      );
      for (const s of services)
        await tx.execute(
          sql`INSERT INTO business_membership_scope(membership_id,branch_id,service_id) VALUES(${i.membershipId},${s.branch_id},${s.id})`,
        );
      for (const a of allocate(order.amount, i.allocations))
        await tx.execute(
          sql`INSERT INTO business_allocations(membership_id,branch_id,amount_minor,basis_points) VALUES(${i.membershipId},${a.branchId},${a.amountMinor},${a.basisPoints})`,
        );
      await tx.execute(
        sql`UPDATE sport_memberships SET revision=revision+1 WHERE id=${i.membershipId}`,
      );
      await this.audit(
        tx,
        actor,
        m.organization_id,
        'membership.shared',
        i.membershipId,
        i.reason,
      );
      return { id: i.membershipId };
    });
  }
  async price(actor: string, i: z.infer<typeof c.priceSchema>) {
    return this.command(
      actor,
      'price',
      i,
      async (tx) => {
        await businessAccess(
          tx,
          actor,
          i.organizationId,
          i.branchId,
          i.branchId ? ['owner', 'manager'] : ['owner'],
        );
        await requireAdvanced(tx, i.organizationId);
      },
      async (tx) => {
        await this.lockOrg(tx, i.organizationId);
        if (i.branchId)
          await assertBranchWrite(tx, i.organizationId, i.branchId);
        const table = i.branchId
          ? sql`business_price_exceptions`
          : sql`business_price_templates`;
        const column = i.branchId ? sql`branch_id` : sql`organization_id`;
        const key = i.branchId ?? i.organizationId;
        const [old] = await rows<{ revision: number }>(
          tx,
          sql`SELECT revision FROM ${table} WHERE ${column}=${key} AND kind=${i.kind} FOR UPDATE`,
        );
        if ((old?.revision ?? 0) !== i.revision)
          throw new ConflictException('PH5.conflict');
        await tx.execute(
          sql`INSERT INTO ${table}(${column},kind,amount_minor,reason) VALUES(${key},${i.kind},${i.amountMinor},${i.reason}) ON CONFLICT(${column},kind) DO UPDATE SET amount_minor=EXCLUDED.amount_minor,reason=EXCLUDED.reason,revision=${table}.revision+1`,
        );
        await this.audit(
          tx,
          actor,
          i.organizationId,
          'price.changed',
          key,
          i.reason,
        );
        return { id: key };
      },
    );
  }

  async reconcilePlan(
    actor: string,
    id: string,
    i: z.infer<typeof c.reconcileSchema>,
  ) {
    const load = async (tx: Tx) => {
      const [p] = await rows<{
        organization_id: string;
        state: string;
        plan_code: string;
        expires_at: Date;
        snapshot: {
          subscriptionRevision: number;
          months?: number;
          amountMinor: string;
        };
      }>(tx, sql`SELECT * FROM business_plan_payments WHERE id=${id}`);
      if (!p) throw new NotFoundException('PH5.notFound');
      await businessAccess(tx, actor, p.organization_id, undefined, ['owner']);
      await this.lockOrg(tx, p.organization_id);
      return p;
    };
    return this.command(actor, 'reconcile-plan:' + id, i, load, async (tx) => {
      const p = await load(tx);
      if (p.state !== 'unknown') throw new ConflictException('PH5.conflict');
      const [sub] = await rows<{ revision: number; expires_at: Date | null }>(
        tx,
        sql`SELECT revision,expires_at FROM business_subscriptions WHERE organization_id=${p.organization_id} FOR UPDATE`,
      );
      if (
        i.outcome === 'succeeded' &&
        (sub?.revision ?? 1) !== p.snapshot.subscriptionRevision
      )
        throw new ConflictException('PH5.conflict');
      if (
        i.outcome === 'succeeded' &&
        !this.config.get('DEMO_MODE', { infer: true }) &&
        (p.plan_code === 'pro' || BigInt(p.snapshot.amountMinor) > 0n)
      )
        throw new ForbiddenException('PH5.providerRequired');
      const effectiveExpiry = p.snapshot.months
        ? new Date(
            Math.max(Date.now(), sub?.expires_at?.getTime() ?? 0) +
              p.snapshot.months * 30 * 86400000,
          )
        : p.expires_at;
      await tx.execute(
        sql`UPDATE business_plan_payments SET state=${i.outcome},expires_at=${effectiveExpiry} WHERE id=${id}`,
      );
      if (i.outcome === 'succeeded')
        await tx.execute(
          sql`INSERT INTO business_subscriptions(organization_id,plan_code,expires_at,terms_snapshot) VALUES(${p.organization_id},${p.plan_code},${p.plan_code === 'basic' ? null : effectiveExpiry},${json(p.snapshot)}::jsonb) ON CONFLICT(organization_id) DO UPDATE SET plan_code=EXCLUDED.plan_code,expires_at=EXCLUDED.expires_at,terms_snapshot=EXCLUDED.terms_snapshot,revision=business_subscriptions.revision+1,updated_at=now()`,
        );
      await this.audit(
        tx,
        actor,
        p.organization_id,
        'plan.reconciled',
        id,
        i.reason,
      );
      return { id, state: i.outcome };
    });
  }
  async reconcileDue() {
    return this.db.transaction(async (tx) => {
      const jobs = await rows<{ id: string; order_id: string }>(
        tx,
        sql`SELECT id,order_id FROM business_source_jobs ORDER BY created_at,id LIMIT 20 FOR UPDATE SKIP LOCKED`,
      );
      for (const job of jobs) {
        const statements = await rows<Statement & { created_by: string }>(
          tx,
          sql`SELECT st.* FROM business_statements st WHERE EXISTS(SELECT 1 FROM business_earnings e WHERE e.statement_id=st.id AND e.basis_snapshot->>'orderId'=${job.order_id}) ORDER BY st.id FOR UPDATE`,
        );
        for (const st of statements)
          await this.syncCorrections(tx, st.created_by, st);
        await tx.execute(
          sql`DELETE FROM business_source_jobs WHERE id=${job.id}`,
        );
      }
      return { processed: jobs.length };
    });
  }
}
