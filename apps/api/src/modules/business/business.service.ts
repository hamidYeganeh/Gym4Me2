import {
  assertBranchCapacity,
  createBasicSubscription,
} from '../advanced-business/ph5.access';
import { checkedChangeReason } from '../../platform/audit/change-reason';
import { lockWritableAccount } from '../auth/account-lock';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import {
  auditEvents,
  clubs,
  branchProfiles,
  branches,
  organizationInvitations,
  organizationInvitationBranches,
  organizationMembers,
  organizationMemberBranches,
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
      throw new ForbiddenException('Backend.youDoNotHaveAccessToThis');
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
        allBranches: organizationMembers.allBranches,
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
      await lockWritableAccount(tx, userId);
      const [org] = await tx
        .insert(organizations)
        .values({ name, slug: `club-${randomUUID()}` })
        .returning();
      await tx
        .insert(organizationMembers)
        .values({ organizationId: org.id, userId, role: 'owner' });
      await tx.insert(clubs).values({ id: org.id, ownerId: userId });
      await createBasicSubscription(tx, org.id);
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
    const member = await this.membership(userId, orgId);
    return this.database.db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.organizationId, orgId),
          member.role === 'owner' || member.allBranches
            ? undefined
            : sql`exists (select 1 from organization_member_branches a where a.member_id = ${member.id} and a.branch_id = ${branches.id})`,
        ),
      )
      .orderBy(branches.createdAt);
  }
  async createBranch(userId: string, orgId: string, name: string) {
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
      await lockClub(tx, userId, orgId);
      await assertBranchCapacity(tx, orgId);
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
        allBranches: organizationMembers.allBranches,
        branchIds: sql<
          string[]
        >`coalesce((select json_agg(a.branch_id) from organization_member_branches a where a.member_id = ${organizationMembers.id}), '[]'::json)`,
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
    const grants = await this.database.db
      .select()
      .from(organizationInvitationBranches)
      .where(eq(organizationInvitationBranches.organizationId, orgId));
    return {
      members,
      invitations: invitations.map((invitation) => ({
        ...invitation,
        branchIds: grants
          .filter((grant) => grant.invitationId === invitation.id)
          .map((grant) => grant.branchId),
      })),
    };
  }
  async invite(
    userId: string,
    orgId: string,
    phone: string,
    role: StaffRole,
    branchIds: string[] | undefined,
    reason: string,
  ) {
    reason = checkedChangeReason(reason);
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
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
        throw new ForbiddenException('Backend.onlyTheOwnerCanInviteColleagues');
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
      if (existing)
        throw new ConflictException('Backend.thisPersonIsAlreadyOnTheTeam');
      if (branchIds) {
        const found = await tx
          .select({ id: branches.id })
          .from(branches)
          .where(
            and(
              eq(branches.organizationId, orgId),
              inArray(branches.id, branchIds),
            ),
          )
          .for('share');
        if (found.length !== branchIds.length)
          throw new BadRequestException('Backend.invalidBranchScope');
      }
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
          allBranches: branchIds === undefined,
          invitedBy: userId,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        })
        .returning();
      if (branchIds)
        await tx.insert(organizationInvitationBranches).values(
          branchIds.map((branchId) => ({
            organizationId: orgId,
            invitationId: invitation.id,
            branchId,
          })),
        );
      await tx.insert(auditEvents).values({
        actorId: userId,
        organizationId: orgId,
        action: 'team.invited',
        targetId: invitation.id,
        details: {
          role,
          scope: branchIds ? branchIds.join(',') : 'all',
          reason,
        },
      });
      return invitation;
    });
  }
  async remove(
    userId: string,
    orgId: string,
    id: string,
    invitation: boolean,
    reason: string,
  ) {
    reason = checkedChangeReason(reason);
    return this.database.db.transaction(async (tx) => {
      await lockWritableAccount(tx, userId);
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
        throw new ForbiddenException('Backend.onlyTheOwnerCanRevokeAccess');
      let previous: Record<string, string> = {};
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
        if (!rows.length)
          throw new NotFoundException('Backend.noActiveInvitationFound');
        const grants = await tx
          .select({ branchId: organizationInvitationBranches.branchId })
          .from(organizationInvitationBranches)
          .where(eq(organizationInvitationBranches.invitationId, id));
        previous = {
          previousRole: rows[0].role,
          previousScope: rows[0].allBranches
            ? 'all'
            : grants
                .map((g) => g.branchId)
                .sort()
                .join(','),
        };
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
        if (!target) throw new NotFoundException('Backend.colleagueNotFound');
        if (target.role === 'owner')
          throw new ForbiddenException('Backend.theOwnerCannotBeRemoved');
        const grants = await tx
          .select({ branchId: organizationMemberBranches.branchId })
          .from(organizationMemberBranches)
          .where(eq(organizationMemberBranches.memberId, id));
        previous = {
          previousRole: target.role,
          previousScope: target.allBranches
            ? 'all'
            : grants
                .map((g) => g.branchId)
                .sort()
                .join(','),
          affectedUserId: target.userId,
        };
        await tx
          .delete(organizationMembers)
          .where(eq(organizationMembers.id, id));
      }
      await tx.insert(auditEvents).values({
        actorId: userId,
        organizationId: orgId,
        action: invitation ? 'invitation.revoked' : 'team.removed',
        targetId: id,
        details: { ...previous, reason, resultingAccess: 'none' },
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
      await lockWritableAccount(tx, principal.user.id);
      // Use the same owner lock order as revoke/invite to keep invitation races safe.
      const [candidate] = await tx
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.id, id));
      if (!candidate || candidate.phone !== principal.user.phone)
        throw new NotFoundException('Backend.invitationNotFound');
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
        throw new ConflictException('Backend.thisInvitationIsInvalid');
      const grants = await tx
        .select()
        .from(organizationInvitationBranches)
        .where(eq(organizationInvitationBranches.invitationId, inv.id));
      if (!inv.allBranches && !grants.length)
        throw new ConflictException('Backend.thisInvitationIsInvalid');
      const [member] = await tx
        .insert(organizationMembers)
        .values({
          organizationId: inv.organizationId,
          userId: principal.user.id,
          role: inv.role,
          allBranches: inv.allBranches,
        })
        .onConflictDoNothing()
        .returning();
      if (!member)
        throw new ConflictException('Backend.thisPersonIsAlreadyOnTheTeam');
      if (!inv.allBranches)
        await tx.insert(organizationMemberBranches).values(
          grants.map((grant) => ({
            organizationId: inv.organizationId,
            memberId: member.id,
            branchId: grant.branchId,
          })),
        );
      await tx
        .update(organizationInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(organizationInvitations.id, id));
      await tx.insert(auditEvents).values({
        actorId: principal.user.id,
        organizationId: inv.organizationId,
        action: 'invitation.accepted',
        targetId: id,
        details: {
          reasonCode: 'accepted-owner-invitation',
          invitationId: id,
          role: inv.role,
          scope: inv.allBranches
            ? 'all'
            : grants
                .map((g) => g.branchId)
                .sort()
                .join(','),
        },
      });
      return { success: true };
    });
  }
}
