import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  auditEvents,
  clubs,
  authSessions,
  organizations,
  platformAdmins,
  users,
} from '../../database/schema';
import type { Principal } from '../auth/auth.service';
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
      throw new ForbiddenException('این حساب دسترسی ادمین ندارد.');
  }
  async overview(p: Principal) {
    await this.requireAdmin(p);
    const [people, clubs, pending] = await Promise.all([
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
    ]);
    return {
      users: people[0].count,
      organizations: clubs[0].count,
      pending: pending[0].count,
    };
  }
  async listUsers(p: Principal, page: number, search: string) {
    await this.requireAdmin(p);
    const needle = search.replace(/[\\%_]/g, '\\$&');
    return this.database.db
      .select({
        id: users.id,
        phone: users.phone,
        displayName: users.displayName,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        search
          ? or(
              ilike(users.phone, `%${needle}%`),
              ilike(users.displayName, `%${needle}%`),
            )
          : undefined,
      )
      .orderBy(desc(users.createdAt), users.id)
      .limit(25)
      .offset((page - 1) * 25);
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
      if (!user) throw new NotFoundException('کاربر پیدا نشد.');
      // Admin accounts cannot be suspended through this endpoint (including oneself).
      if (
        (
          await tx
            .select()
            .from(platformAdmins)
            .where(eq(platformAdmins.userId, id))
        ).length
      )
        throw new ForbiddenException('تعلیق حساب ادمین از این مسیر مجاز نیست.');
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
  ) {
    await this.requireAdmin(p);
    return this.database.db
      .select()
      .from(organizations)
      .where(status ? eq(organizations.status, status) : undefined)
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
      if (!row) throw new NotFoundException('مجموعه پیدا نشد.');
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
  async audit(p: Principal, page: number) {
    await this.requireAdmin(p);
    return this.database.db
      .select()
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt), auditEvents.id)
      .limit(25)
      .offset((page - 1) * 25);
  }
}
