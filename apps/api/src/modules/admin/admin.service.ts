import {
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  auditEvents,
  clubs,
  authSessions,
  organizations,
  platformAdmins,
  users,
  branches,
  organizationMembers,
  coachProfiles,
  clubReviews,
} from '../../database/schema';
import type { Principal } from '../auth/auth.service';
import type { AuditFilters } from './admin.contracts';
const escapedSearch = (value: string) => value.replace(/[\\%_]/g, '\\$&');
@Injectable()
export class AdminService {
  constructor(private readonly database: DatabaseService) {}
  async isAdmin(userId: string) {
    return (
      (
        await this.database.db
          .select()
          .from(platformAdmins)
          .where(eq(platformAdmins.userId, userId))
      ).length > 0
    );
  }
  async requireAdmin(p: Principal) {
    if (p.session.client !== 'admin' || !(await this.isAdmin(p.user.id)))
      throw new ForbiddenException(
        'Backend.thisAccountDoesNotHaveAdministratorAccess',
      );
  }
  async overview(p: Principal) {
    await this.requireAdmin(p);
    const [
      people,
      clubsCount,
      pending,
      published,
      reviews,
      recent,
      pendingPublication,
    ] = await Promise.all([
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizations),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizations)
        .where(eq(organizations.status, 'pending')),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(clubs)
        .innerJoin(organizations, eq(organizations.id, clubs.id))
        .where(
          and(
            eq(clubs.publicationStatus, 'published'),
            eq(organizations.status, 'approved'),
            isNull(clubs.archivedAt),
          ),
        ),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(clubReviews)
        .where(eq(clubReviews.status, 'pending')),
      this.database.db
        .select({
          id: auditEvents.id,
          action: auditEvents.action,
          createdAt: auditEvents.createdAt,
          reason: sql<string | null>`${auditEvents.details}->>'reason'`,
        })
        .from(auditEvents)
        .orderBy(desc(auditEvents.createdAt), auditEvents.id)
        .limit(5),
      this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(clubs)
        .where(
          and(
            eq(clubs.publicationStatus, 'pending_review'),
            isNull(clubs.archivedAt),
          ),
        ),
    ]);
    return {
      users: people[0].count,
      organizations: clubsCount[0].count,
      pending: pending[0].count,
      published: published[0].count,
      pendingReviews: reviews[0].count,
      pendingPublication: pendingPublication[0].count,
      recent,
    };
  }
  async listUsers(
    p: Principal,
    page: number,
    search: string,
    status?: 'active' | 'suspended',
  ) {
    await this.requireAdmin(p);
    const needle = search.replace(/[\\%_]/g, '\\$&');
    return this.database.db
      .select({
        id: users.id,
        phone: users.phone,
        displayName: users.displayName,
        status: users.status,
        createdAt: users.createdAt,
        isAdmin: sql<boolean>`exists (select 1 from ${platformAdmins} where ${platformAdmins.userId} = ${users.id})`,
      })
      .from(users)
      .where(
        and(
          status ? eq(users.status, status) : undefined,
          search
            ? or(
                ilike(users.phone, `%${needle}%`),
                ilike(users.displayName, `%${needle}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(users.createdAt), users.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
  async userDetail(p: Principal, id: string) {
    await this.requireAdmin(p);
    const [user] = await this.database.db
      .select({
        id: users.id,
        phone: users.phone,
        displayName: users.displayName,
        status: users.status,
        phoneVerifiedAt: users.phoneVerifiedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id));
    if (!user) throw new NotFoundException('Backend.userNotFound');
    const [memberships, sessions, coach, admin] = await Promise.all([
      this.database.db
        .select({
          id: organizationMembers.id,
          organizationId: organizations.id,
          name: organizations.name,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(
          organizations,
          eq(organizations.id, organizationMembers.organizationId),
        )
        .where(eq(organizationMembers.userId, id)),
      this.database.db
        .select({
          id: authSessions.id,
          client: authSessions.client,
          device: authSessions.device,
          expiresAt: authSessions.expiresAt,
          revokedAt: authSessions.revokedAt,
          createdAt: authSessions.createdAt,
        })
        .from(authSessions)
        .where(eq(authSessions.userId, id))
        .orderBy(desc(authSessions.createdAt))
        .limit(25),
      this.database.db
        .select({ biography: coachProfiles.biography })
        .from(coachProfiles)
        .where(eq(coachProfiles.userId, id)),
      this.isAdmin(id),
    ]);
    return {
      ...user,
      memberships,
      sessions,
      coach: coach[0] ?? null,
      isAdmin: admin,
    };
  }
  async organizationDetail(p: Principal, id: string) {
    await this.requireAdmin(p);
    const [org] = await this.database.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    if (!org) throw new NotFoundException('Backend.organizationNotFound');
    const [members, locations, catalog] = await Promise.all([
      this.database.db
        .select({
          id: organizationMembers.id,
          userId: users.id,
          displayName: users.displayName,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, id)),
      this.database.db
        .select({
          id: branches.id,
          name: branches.name,
          timezone: branches.timezone,
        })
        .from(branches)
        .where(eq(branches.organizationId, id))
        .orderBy(branches.createdAt),
      this.database.db
        .select({ id: clubs.id })
        .from(clubs)
        .where(eq(clubs.id, id)),
    ]);
    return {
      ...org,
      members,
      branches: locations,
      hasCatalog: catalog.length > 0,
    };
  }
  async setUserStatus(
    p: Principal,
    id: string,
    status: 'active' | 'suspended',
    reason: string,
  ) {
    await this.requireAdmin(p);
    return this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .for('update');
      if (!user) throw new NotFoundException('Backend.userNotFound');
      if (user.deletedAt)
        throw new ConflictException('Backend.deletedAccountCannotBeRestored');
      // Admin accounts cannot be suspended through this endpoint (including oneself).
      if (
        (
          await tx
            .select()
            .from(platformAdmins)
            .where(eq(platformAdmins.userId, id))
        ).length
      )
        throw new ForbiddenException(
          'Backend.administratorAccountsCannotBeSuspendedFromThis',
        );
      await tx
        .update(users)
        .set({ status, updatedAt: new Date() })
        .where(eq(users.id, id));
      if (status === 'suspended')
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date() })
          .where(eq(authSessions.userId, id));
      await tx.insert(auditEvents).values({
        actorId: p.user.id,
        action: 'user.status-changed',
        targetId: id,
        details: { status, reason },
      });
      return { success: true };
    });
  }
  async listOrganizations(
    p: Principal,
    page: number,
    status?: 'pending' | 'approved' | 'rejected' | 'suspended',
    filters: {
      search?: string;
      publicationStatus?: 'draft' | 'pending_review' | 'published' | 'hidden';
    } = {},
  ) {
    await this.requireAdmin(p);
    return this.database.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        reviewReason: organizations.reviewReason,
        createdAt: organizations.createdAt,
        publicationStatus: clubs.publicationStatus,
      })
      .from(organizations)
      .leftJoin(clubs, eq(clubs.id, organizations.id))
      .where(
        and(
          status ? eq(organizations.status, status) : undefined,
          filters.search
            ? ilike(organizations.name, `%${escapedSearch(filters.search)}%`)
            : undefined,
          filters.publicationStatus
            ? eq(clubs.publicationStatus, filters.publicationStatus)
            : undefined,
        ),
      )
      .orderBy(desc(organizations.createdAt), organizations.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
  async review(
    p: Principal,
    id: string,
    status: 'approved' | 'rejected' | 'suspended',
    reason: string,
  ) {
    await this.requireAdmin(p);
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .update(organizations)
        .set({ status, reviewReason: reason, updatedAt: new Date() })
        .where(eq(organizations.id, id))
        .returning();
      if (!row) throw new NotFoundException('Backend.organizationNotFound');
      await tx
        .update(clubs)
        .set({
          lastVerifiedAt: status === 'approved' ? new Date() : null,
          ...(status !== 'approved'
            ? { publicationStatus: 'hidden' as const }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(clubs.id, id));
      await tx.insert(auditEvents).values({
        actorId: p.user.id,
        organizationId: id,
        action: 'organization.reviewed',
        targetId: id,
        details: { status, reason },
      });
      return row;
    });
  }
  async audit(p: Principal, page: number, filters: AuditFilters = {}) {
    await this.requireAdmin(p);
    return this.database.db
      .select({
        id: auditEvents.id,
        action: auditEvents.action,
        actorId: auditEvents.actorId,
        actorName: users.displayName,
        organizationId: auditEvents.organizationId,
        organizationName: organizations.name,
        targetId: auditEvents.targetId,
        details: auditEvents.details,
        createdAt: auditEvents.createdAt,
      })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorId))
      .leftJoin(organizations, eq(organizations.id, auditEvents.organizationId))
      .where(
        and(
          filters.action ? eq(auditEvents.action, filters.action) : undefined,
          filters.actorId
            ? eq(auditEvents.actorId, filters.actorId)
            : undefined,
          filters.organizationId
            ? eq(auditEvents.organizationId, filters.organizationId)
            : undefined,
          filters.from
            ? sql`${auditEvents.createdAt} >= (${filters.from}::date::timestamp AT TIME ZONE 'Asia/Tehran')`
            : undefined,
          filters.to
            ? sql`${auditEvents.createdAt} < ((${filters.to}::date + interval '1 day') AT TIME ZONE 'Asia/Tehran')`
            : undefined,
        ),
      )
      .orderBy(desc(auditEvents.createdAt), auditEvents.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
}
