import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import {
  auditEvents,
  clubs,
  branchProfiles,
  branches,
  organizationInvitations,
  organizationMembers,
  organizations,
  users,
} from '../../database/schema';
import { lockClub, invalidatePublication } from '../clubs/club.repository';
import type { Principal } from '../auth/auth.service';
export type StaffRole = 'manager' | 'receptionist' | 'accountant';
@Injectable()
export class BusinessService {
  constructor(private readonly database: DatabaseService) {}
  async membership(userId: string, organizationId: string, ownerOnly = false) {
    const [member] = await this.database.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
        ),
      );
    if (!member || (ownerOnly && member.role !== 'owner'))
      throw new ForbiddenException('دسترسی لازم به این مجموعه را ندارید.');
    return member;
  }
  list(userId: string) {
    return this.database.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        reviewReason: organizations.reviewReason,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationMembers.organizationId),
      )
      .where(eq(organizationMembers.userId, userId))
      .orderBy(desc(organizations.createdAt));
  }
  async create(userId: string, name: string) {
    return this.database.db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({ name, slug: `club-${randomUUID()}` })
        .returning();
      await tx
        .insert(organizationMembers)
        .values({ organizationId: org.id, userId, role: 'owner' });
      await tx.insert(clubs).values({ id: org.id, ownerId: userId });
      const [mainBranch] = await tx
        .insert(branches)
        .values({ organizationId: org.id, name, slug: 'main' })
        .returning();
      await tx
        .insert(branchProfiles)
        .values({ branchId: mainBranch.id, clubId: org.id, isMain: true });
      await tx.insert(auditEvents).values({
        actorId: userId,
        organizationId: org.id,
        action: 'organization.created',
        targetId: org.id,
      });
      return org;
    });
  }
  async listBranches(userId: string, orgId: string) {
    await this.membership(userId, orgId);
    return this.database.db
      .select()
      .from(branches)
      .where(eq(branches.organizationId, orgId))
      .orderBy(branches.createdAt);
  }
  async createBranch(userId: string, orgId: string, name: string) {
    return this.database.db.transaction(async (tx) => {
      await lockClub(tx, userId, orgId);
      const [branch] = await tx
        .insert(branches)
        .values({ organizationId: orgId, name, slug: `branch-${randomUUID()}` })
        .returning();
      await tx
        .insert(branchProfiles)
        .values({ branchId: branch.id, clubId: orgId });
      await invalidatePublication(tx, orgId);
      await tx.insert(auditEvents).values({
        actorId: userId,
        organizationId: orgId,
        action: 'branch.created',
        targetId: branch.id,
      });
      return branch;
    });
  }
  async team(userId: string, orgId: string) {
    await this.membership(userId, orgId, true);
    const members = await this.database.db
      .select({
        id: organizationMembers.id,
        userId: users.id,
        displayName: users.displayName,
        phone: users.phone,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(eq(organizationMembers.organizationId, orgId));
    const invitations = await this.database.db
      .select()
      .from(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.organizationId, orgId),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, new Date()),
        ),
      );
    return { members, invitations };
  }
  async invite(userId: string, orgId: string, phone: string, role: StaffRole) {
    return this.database.db.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .for('update');
      if (owner?.role !== 'owner')
        throw new ForbiddenException('فقط مالک می‌تواند همکار دعوت کند.');
      const [existing] = await tx
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(users.phone, phone),
          ),
        );
      if (existing) throw new ConflictException('این فرد عضو تیم است.');
      await tx
        .update(organizationInvitations)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(organizationInvitations.organizationId, orgId),
            eq(organizationInvitations.phone, phone),
            isNull(organizationInvitations.acceptedAt),
            isNull(organizationInvitations.revokedAt),
          ),
        );
      const [invitation] = await tx
        .insert(organizationInvitations)
        .values({
          organizationId: orgId,
          phone,
          role,
          invitedBy: userId,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        })
        .returning();
      await tx.insert(auditEvents).values({
        actorId: userId,
        organizationId: orgId,
        action: 'team.invited',
        targetId: invitation.id,
        details: { role },
      });
      return invitation;
    });
  }
  async remove(userId: string, orgId: string, id: string, invitation: boolean) {
    return this.database.db.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, userId),
          ),
        )
        .for('update');
      if (owner?.role !== 'owner')
        throw new ForbiddenException('فقط مالک می‌تواند دسترسی را لغو کند.');
      if (invitation) {
        const rows = await tx
          .update(organizationInvitations)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(organizationInvitations.id, id),
              eq(organizationInvitations.organizationId, orgId),
              isNull(organizationInvitations.acceptedAt),
              isNull(organizationInvitations.revokedAt),
            ),
          )
          .returning();
        if (!rows.length) throw new NotFoundException('دعوت فعال پیدا نشد.');
      } else {
        const [target] = await tx
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.id, id),
              eq(organizationMembers.organizationId, orgId),
            ),
          )
          .for('update');
        if (!target) throw new NotFoundException('همکار پیدا نشد.');
        if (target.role === 'owner')
          throw new ForbiddenException('حذف مالک مجاز نیست.');
        await tx
          .delete(organizationMembers)
          .where(eq(organizationMembers.id, id));
      }
      await tx.insert(auditEvents).values({
        actorId: userId,
        organizationId: orgId,
        action: invitation ? 'invitation.revoked' : 'team.removed',
        targetId: id,
      });
      return { success: true };
    });
  }
  invitations(phone: string) {
    return this.database.db
      .select({
        id: organizationInvitations.id,
        organizationName: organizations.name,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
      })
      .from(organizationInvitations)
      .innerJoin(
        organizations,
        eq(organizations.id, organizationInvitations.organizationId),
      )
      .where(
        and(
          eq(organizationInvitations.phone, phone),
          isNull(organizationInvitations.acceptedAt),
          isNull(organizationInvitations.revokedAt),
          gt(organizationInvitations.expiresAt, new Date()),
        ),
      );
  }
  async accept(principal: Principal, id: string) {
    return this.database.db.transaction(async (tx) => {
      // Use the same owner lock order as revoke/invite to keep invitation races safe.
      const [candidate] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.id, id));
      if (!candidate || candidate.phone !== principal.user.phone)
        throw new NotFoundException('دعوت پیدا نشد.');
      await tx.execute(
        sql`select id from organization_members where organization_id = ${candidate.organizationId} and role = 'owner' for update`,
      );
      const [inv] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.id, id))
        .for('update');
      if (
        !inv ||
        inv.acceptedAt ||
        inv.revokedAt ||
        inv.expiresAt <= new Date()
      )
        throw new ConflictException('دعوت معتبر نیست.');
      await tx
        .insert(organizationMembers)
        .values({
          organizationId: inv.organizationId,
          userId: principal.user.id,
          role: inv.role,
        })
        .onConflictDoNothing();
      await tx
        .update(organizationInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvitations.id, id));
      await tx.insert(auditEvents).values({
        actorId: principal.user.id,
        organizationId: inv.organizationId,
        action: 'invitation.accepted',
        targetId: id,
      });
      return { success: true };
    });
  }
}
