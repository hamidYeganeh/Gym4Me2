import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import { id, name } from './club.contracts';
import {
  lockClub,
  memberAccess,
  requireBranch,
  invalidatePublication,
  type Db,
  type Tx,
} from './club.repository';
export const tariffSchema = z
  .object({
    name,
    serviceType: z.enum(['visit', 'membership', 'court', 'class', 'coaching']),
    priceToman: z.number().int().min(0).max(1_000_000_000),
    unit: z.enum(['visit', 'hour', 'session', 'month', 'package', 'course']),
    durationDays: z.number().int().min(1).max(3660).nullable().default(null),
    sessionCount: z.number().int().min(1).max(10000).nullable().default(null),
    includedServices: z
      .array(z.string().trim().min(1).max(280))
      .max(30)
      .default([]),
    conditions: z.string().trim().min(2).max(5000),
    effectiveFrom: z.iso
      .datetime({ offset: true })
      .optional()
      .transform((v) => (v ? new Date(v) : new Date())),
  })
  .strict();
export const tariffCreateSchema = tariffSchema.extend({
  branchId: id.nullable().default(null),
});
export type TariffInput = z.infer<typeof tariffSchema>;
export const tariffSelection = {
  id: s.tariffGroups.id,
  clubId: s.tariffGroups.clubId,
  branchId: s.tariffGroups.branchId,
  isActive: s.tariffGroups.isActive,
  versionId: s.tariffVersions.id,
  version: s.tariffVersions.version,
  name: s.tariffVersions.name,
  serviceType: s.tariffVersions.serviceType,
  priceToman: s.tariffVersions.priceToman,
  currency: s.tariffVersions.currency,
  unit: s.tariffVersions.unit,
  durationDays: s.tariffVersions.durationDays,
  sessionCount: s.tariffVersions.sessionCount,
  includedServices: s.tariffVersions.includedServices,
  conditions: s.tariffVersions.conditions,
  effectiveFrom: s.tariffVersions.effectiveFrom,
  createdAt: s.tariffVersions.createdAt,
};
export function currentTariffs(
  db: Db | Tx,
  clubId: string,
  branchId?: string,
  publicOnly = false,
) {
  return db
    .select(tariffSelection)
    .from(s.tariffGroups)
    .innerJoin(
      s.tariffVersions,
      eq(s.tariffVersions.groupId, s.tariffGroups.id),
    )
    .where(
      and(
        eq(s.tariffGroups.clubId, clubId),
        publicOnly ? eq(s.tariffGroups.isActive, true) : undefined,
        branchId
          ? or(
              isNull(s.tariffGroups.branchId),
              eq(s.tariffGroups.branchId, branchId),
            )
          : undefined,
        publicOnly
          ? lte(s.tariffVersions.effectiveFrom, new Date())
          : undefined,
        sql`not exists (select 1 from club_tariff_versions newer where newer.group_id = ${s.tariffGroups.id} and newer.version > ${s.tariffVersions.version} ${publicOnly ? sql`and newer.effective_from <= now()` : sql``})`,
      ),
    )
    .orderBy(s.tariffVersions.priceToman, s.tariffGroups.id)
    .limit(100);
}
@Injectable()
export class ClubTariffService {
  constructor(private readonly database: DatabaseService) {}
  async list(userId: string, clubId: string) {
    const member = await memberAccess(this.database.db, userId, clubId);
    const rows = await currentTariffs(this.database.db, clubId);
    if (member.role === 'owner' || member.allBranches) return rows;
    const grants = await this.database.db
      .select()
      .from(s.organizationMemberBranches)
      .where(eq(s.organizationMemberBranches.memberId, member.id));
    return rows.filter(
      (row) =>
        row.branchId === null ||
        grants.some((grant) => grant.branchId === row.branchId),
    );
  }
  async create(
    userId: string,
    clubId: string,
    input: z.infer<typeof tariffCreateSchema>,
  ) {
    return this.database.db.transaction(async (tx) => {
      await lockClub(tx, userId, clubId, input.branchId ?? undefined);
      if (input.branchId) await requireBranch(tx, clubId, input.branchId);
      const groups = await tx
        .select({ id: s.tariffGroups.id })
        .from(s.tariffGroups)
        .where(eq(s.tariffGroups.clubId, clubId))
        .limit(100);
      if (groups.length === 100)
        throw new BadRequestException('Backend.tariffLimit');
      const [group] = await tx
        .insert(s.tariffGroups)
        .values({ clubId, branchId: input.branchId })
        .returning();
      const { branchId: _branchId, ...version } = input;
      void _branchId;
      await tx.insert(s.tariffVersions).values({
        ...version,
        groupId: group.id,
        version: 1,
        createdBy: userId,
      });
      await invalidatePublication(tx, clubId);
      await this.audit(tx, userId, clubId, group.id, 'tariff.created', 1);
      return (
        await tx
          .select(tariffSelection)
          .from(s.tariffGroups)
          .innerJoin(
            s.tariffVersions,
            eq(s.tariffVersions.groupId, s.tariffGroups.id),
          )
          .where(eq(s.tariffGroups.id, group.id))
      )[0];
    });
  }
  async revise(
    userId: string,
    clubId: string,
    groupId: string,
    input: TariffInput,
  ) {
    return this.database.db.transaction(async (tx) => {
      const group = await this.group(tx, clubId, groupId);
      await lockClub(tx, userId, clubId, group.branchId ?? undefined);
      const [latest] = await tx
        .select({ version: s.tariffVersions.version })
        .from(s.tariffVersions)
        .where(eq(s.tariffVersions.groupId, groupId))
        .orderBy(desc(s.tariffVersions.version))
        .limit(1);
      const [version] = await tx
        .insert(s.tariffVersions)
        .values({
          ...input,
          groupId,
          version: latest.version + 1,
          createdBy: userId,
        })
        .returning();
      await invalidatePublication(tx, clubId);
      await this.audit(
        tx,
        userId,
        clubId,
        group.id,
        'tariff.revised',
        version.version,
      );
      return {
        ...version,
        id: groupId,
        versionId: version.id,
        clubId,
        branchId: group.branchId,
        isActive: group.isActive,
      };
    });
  }
  async history(userId: string, clubId: string, groupId: string, page: number) {
    const group = await this.group(this.database.db, clubId, groupId);
    await memberAccess(
      this.database.db,
      userId,
      clubId,
      group.branchId ?? undefined,
    );
    return this.database.db
      .select(tariffSelection)
      .from(s.tariffGroups)
      .innerJoin(
        s.tariffVersions,
        eq(s.tariffVersions.groupId, s.tariffGroups.id),
      )
      .where(eq(s.tariffGroups.id, groupId))
      .orderBy(desc(s.tariffVersions.version))
      .limit(25)
      .offset((page - 1) * 25);
  }
  async status(
    userId: string,
    clubId: string,
    groupId: string,
    isActive: boolean,
  ) {
    return this.database.db.transaction(async (tx) => {
      const group = await this.group(tx, clubId, groupId);
      await lockClub(tx, userId, clubId, group.branchId ?? undefined);
      await tx
        .update(s.tariffGroups)
        .set({ isActive })
        .where(eq(s.tariffGroups.id, groupId));
      await invalidatePublication(tx, clubId);
      await tx.insert(s.auditEvents).values({
        actorId: userId,
        organizationId: clubId,
        action: 'tariff.status',
        targetId: groupId,
        details: { isActive: String(isActive) },
      });
      return { id: groupId, isActive };
    });
  }
  private async group(db: Db | Tx, clubId: string, groupId: string) {
    const [group] = await db
      .select()
      .from(s.tariffGroups)
      .where(
        and(eq(s.tariffGroups.id, groupId), eq(s.tariffGroups.clubId, clubId)),
      );
    if (!group) throw new NotFoundException('Backend.tariffNotFound');
    return group;
  }
  private audit(
    tx: Tx,
    userId: string,
    clubId: string,
    groupId: string,
    action: string,
    version: number,
  ) {
    return tx.insert(s.auditEvents).values({
      actorId: userId,
      organizationId: clubId,
      action,
      targetId: groupId,
      details: { version: String(version) },
    });
  }
}
