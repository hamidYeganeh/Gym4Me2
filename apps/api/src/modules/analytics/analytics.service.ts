import { ForbiddenException, Injectable } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { AdminService } from '../admin/admin.service';
import type { Principal } from '../auth/auth.service';
import { rows } from '../commerce/commerce.service';
import {
  analyticsWindow,
  type AnalyticsFilters,
  type AnalyticsSurface,
} from './analytics.contracts';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly admin: AdminService,
  ) {}

  async report(p: Principal, surface: AnalyticsSurface, f: AnalyticsFilters) {
    if (surface === 'admin') await this.admin.requireAdmin(p);
    else if (
      p.session.client !== (surface === 'business' ? 'business' : 'application')
    )
      throw new ForbiddenException('Backend.youDoNotHaveAccessToThis');
    const actor = p.user.id;
    // Every aggregate, option and breakdown uses the same server-owned scope.
    const branchAccess =
      surface === 'admin'
        ? sql`true`
        : surface === 'business'
          ? sql`EXISTS(SELECT 1 FROM organization_members m WHERE m.user_id=${actor} AND m.organization_id=b.organization_id AND m.role IN ('owner','manager','accountant') AND (m.role='owner' OR m.all_branches OR EXISTS(SELECT 1 FROM organization_member_branches mb WHERE mb.member_id=m.id AND mb.branch_id=b.id)))`
          : sql`EXISTS(SELECT 1 FROM branch_coaches bc JOIN coaching_practices cp ON cp.user_id=bc.coach_id WHERE bc.branch_id=b.id AND bc.coach_id=${actor} AND bc.status='active' AND (bc.ends_on IS NULL OR bc.ends_on>=current_date) AND cp.review_status='approved' AND cp.review_expires_at>now())`;
    const coachService =
      surface === 'coach'
        ? sql`(EXISTS(SELECT 1 FROM coaching_services cs WHERE cs.service_id=s.id AND cs.coach_id=${actor}) OR EXISTS(SELECT 1 FROM sport_service_versions sv WHERE sv.id=s.published_version_id AND sv.coach_user_id=${actor}))`
        : sql`true`;
    const bounds = analyticsWindow(f);
    return this.database.db.transaction(async (tx) => {
      // A stable snapshot prevents the summary and chart from disagreeing mid-payment.
      await tx.execute(
        sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`,
      );
      const branches = await rows<{
        id: string;
        name: string;
        organization_id: string;
        organization_name: string;
      }>(
        tx,
        sql`SELECT b.id,b.name,b.organization_id,g.name organization_name FROM branches b JOIN organizations g ON g.id=b.organization_id WHERE ${branchAccess} ORDER BY g.name,b.name,b.id LIMIT 1001`,
      );
      if (branches.length > 1000)
        throw new ForbiddenException('Analytics.narrowScope');
      if (surface === 'business' && !branches.length)
        throw new ForbiddenException('Backend.youDoNotHaveAccessToThis');
      if (
        (f.organizationId &&
          !branches.some((b) => b.organization_id === f.organizationId)) ||
        (f.branchId &&
          !branches.some(
            (b) =>
              b.id === f.branchId &&
              (!f.organizationId || b.organization_id === f.organizationId),
          ))
      )
        throw new ForbiddenException('Backend.branchAccessDenied');
      const services = await rows<{
        id: string;
        title: string;
        branch_id: string;
        organization_id: string;
        kind: string;
      }>(
        tx,
        sql`SELECT s.id,s.title,s.branch_id,s.organization_id,s.kind FROM sport_services s JOIN branches b ON b.id=s.branch_id WHERE ${branchAccess} AND ${coachService} ORDER BY s.title,s.id LIMIT 2001`,
      );
      if (services.length > 2000)
        throw new ForbiddenException('Analytics.narrowScope');
      if (
        f.serviceId &&
        !services.some(
          (s) =>
            s.id === f.serviceId &&
            (!f.organizationId || s.organization_id === f.organizationId) &&
            (!f.branchId || s.branch_id === f.branchId),
        )
      )
        throw new ForbiddenException('Backend.branchAccessDenied');
      const selected: SQL = sql`${branchAccess} AND ${coachService}
        AND ${f.organizationId ? sql`s.organization_id=${f.organizationId}` : sql`true`}
        AND ${f.branchId ? sql`s.branch_id=${f.branchId}` : sql`true`}
        AND ${f.serviceId ? sql`s.id=${f.serviceId}` : sql`true`}
        AND ${f.kind ? sql`s.kind=${f.kind}` : sql`true`}`;
      // Private coaching counts require current collaboration and athlete sharing;
      // they never enter administrator/business reports or a sports branch filter.
      const privateCoaching =
        surface === 'coach' &&
        !f.organizationId &&
        !f.branchId &&
        !f.serviceId &&
        !f.kind
          ? sql`UNION ALL SELECT t.ended_at,'sharedWorkouts',1 FROM training_sessions t JOIN coaching_relationships cr ON cr.id=t.relationship_id WHERE cr.coach_id=${actor} AND cr.status='active' AND t.shared AND t.state='completed'
              UNION ALL SELECT t.reviewed_at,'reviewedWorkouts',1 FROM training_sessions t JOIN coaching_relationships cr ON cr.id=t.relationship_id WHERE cr.coach_id=${actor} AND cr.status='active' AND t.shared AND t.state='completed' AND t.reviewed_at IS NOT NULL
              UNION ALL SELECT v.published_at,'plansPublished',1 FROM training_versions v JOIN training_plans p ON p.id=v.plan_id JOIN coaching_relationships cr ON cr.id=p.relationship_id WHERE p.owner_id=${actor} AND cr.coach_id=${actor} AND cr.status='active'`
          : sql``;
      // No fan-out joins: each reservation/payment/refund contributes exactly once.
      const data = await rows<{
        bucket: string;
        metric: string;
        value: string;
      }>(
        tx,
        sql`
        WITH eligible AS (SELECT s.id FROM sport_services s JOIN branches b ON b.id=s.branch_id WHERE ${selected}),
        events AS (
          SELECT o.created_at at,'orders' metric,1::bigint value FROM sport_orders o JOIN eligible e ON e.id=o.service_id
          UNION ALL SELECT p.verified_at,'collectedMinor',p.amount_minor FROM sport_payments p JOIN sport_orders o ON o.id=p.order_id JOIN eligible e ON e.id=o.service_id WHERE p.state='verified'
          UNION ALL SELECT j.created_at,'refundedMinor',r.amount_minor FROM sport_refunds r JOIN sport_journals j ON j.source_key='refund:'||r.id::text JOIN sport_orders o ON o.id=r.order_id JOIN eligible e ON e.id=o.service_id WHERE r.state='succeeded'
          UNION ALL SELECT r.created_at,'bookings',1 FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN eligible e ON e.id=o.service_id
          UNION ALL SELECT o.start_at,'cancelled',1 FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN eligible e ON e.id=o.service_id WHERE r.status='cancelled'
          UNION ALL SELECT o.start_at,'noShows',1 FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN eligible e ON e.id=o.service_id WHERE r.status='no_show'
          UNION ALL SELECT a.created_at,'attendance',1 FROM sport_attendance a JOIN sport_reservations r ON r.id=a.reservation_id JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN eligible e ON e.id=o.service_id WHERE a.status='present'
          UNION ALL SELECT v.created_at,'attendance',1 FROM sport_visits v JOIN sport_access_tokens t ON t.id=v.token_id JOIN sport_memberships m ON m.id=t.membership_id JOIN eligible e ON e.id=m.service_id WHERE t.reservation_id IS NULL
          UNION ALL SELECT o.start_at,'sessions',1 FROM sport_occurrences o JOIN eligible e ON e.id=o.service_id WHERE o.status<>'cancelled'
          UNION ALL SELECT o.start_at,'capacity',o.capacity FROM sport_occurrences o JOIN eligible e ON e.id=o.service_id WHERE o.status<>'cancelled'
          UNION ALL SELECT o.start_at,'occupied',1 FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN eligible e ON e.id=o.service_id WHERE o.status<>'cancelled' AND r.status IN ('confirmed','completed','no_show')
        ${privateCoaching}
        ) SELECT to_char(date_trunc(${f.interval},at AT TIME ZONE 'Asia/Tehran'),'YYYY-MM-DD') bucket,metric,sum(value)::text value FROM events WHERE at>=${bounds.start}::timestamptz AND at<${bounds.end}::timestamptz GROUP BY 1,2 ORDER BY 1,2`,
      );
      const statuses = await rows<{ status: string; count: number }>(
        tx,
        sql`SELECT r.status,count(*)::int count FROM sport_reservations r JOIN sport_occurrences o ON o.id=r.occurrence_id JOIN sport_services s ON s.id=o.service_id JOIN branches b ON b.id=s.branch_id WHERE ${selected} AND r.created_at>=${bounds.start}::timestamptz AND r.created_at<${bounds.end}::timestamptz GROUP BY r.status ORDER BY count(*) DESC,r.status`,
      );
      const platform =
        surface === 'admin' &&
        !f.organizationId &&
        !f.branchId &&
        !f.serviceId &&
        !f.kind
          ? await rows<{ name: string; count: number }>(
              tx,
              sql`SELECT name,count(*)::int count FROM product_events WHERE occurred_at>=${bounds.start}::timestamptz AND occurred_at<${bounds.end}::timestamptz AND name IN ('discovery_searched','service_selected','checkout_opened','payment_verified','attendance_confirmed','workout_opened','workout_completed') GROUP BY name ORDER BY name`,
            )
          : [];
      const growth =
        surface === 'admin' &&
        !f.organizationId &&
        !f.branchId &&
        !f.serviceId &&
        !f.kind
          ? (
              await rows<{
                users: number;
                organizations: number;
                branches: number;
              }>(
                tx,
                sql`SELECT
          (SELECT count(*)::int FROM users WHERE created_at>=${bounds.start}::timestamptz AND created_at<${bounds.end}::timestamptz) users,
          (SELECT count(*)::int FROM organizations WHERE created_at>=${bounds.start}::timestamptz AND created_at<${bounds.end}::timestamptz) organizations,
          (SELECT count(*)::int FROM branches WHERE created_at>=${bounds.start}::timestamptz AND created_at<${bounds.end}::timestamptz) branches`,
              )
            )[0]
          : null;
      return {
        growth,
        filters: f,
        timezone: 'Asia/Tehran',
        generatedAt: new Date().toISOString(),
        data,
        statuses,
        platform,
        options: { branches, services },
      };
    });
  }
}
