import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DatabaseService } from '../../database/database.service';
import * as s from '../../database/schema';
import type { BranchPatch, ClubPatch } from './club.contracts';
import { lockWritableAccount } from '../auth/account-lock';

export type Db = DatabaseService['db'];
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export const taxonomies = {
  'club-categories': s.clubCategories,
  sports: s.sports,
  equipments: s.equipments,
  amenities: s.amenities,
  tags: s.tags,
  'accessibility-features': s.accessibilityFeatures,
};
export type TaxonomyKind = keyof typeof taxonomies;

export async function lockClub(
  tx: Tx,
  userId: string,
  clubId: string,
  branchId?: string,
) {
  // Keep the same organization -> club -> membership lock order as admin review.
  await lockWritableAccount(tx, userId);
  await tx
    .select({ id: s.organizations.id })
    .from(s.organizations)
    .where(eq(s.organizations.id, clubId))
    .for('update');
  const [club] = await tx
    .select()
    .from(s.clubs)
    .where(eq(s.clubs.id, clubId))
    .for('update');
  if (!club) throw new NotFoundException('Backend.clubNotFound');
  const [member] = await tx
    .select()
    .from(s.organizationMembers)
    .where(
      and(
        eq(s.organizationMembers.organizationId, clubId),
        eq(s.organizationMembers.userId, userId),
      ),
    )
    .for('update');
  if (!member || !['owner', 'manager'].includes(member.role))
    throw new ForbiddenException('Backend.youCannotEditThisClub');
  if (member.role !== 'owner' && !member.allBranches) {
    if (!branchId)
      throw new ForbiddenException('Backend.youCannotEditThisClub');
    await branchAccess(tx, member, branchId);
  }
  if (club.archivedAt)
    throw new BadRequestException('Backend.archivedClubsCannotBeEdited');
  return club;
}
export async function memberAccess(
  db: Db | Tx,
  userId: string,
  clubId: string,
  branchId?: string,
) {
  const [member] = await db
    .select()
    .from(s.organizationMembers)
    .where(
      and(
        eq(s.organizationMembers.organizationId, clubId),
        eq(s.organizationMembers.userId, userId),
      ),
    );
  if (!member)
    throw new ForbiddenException('Backend.thisClubIsUnavailableToYou');
  if (branchId) await branchAccess(db, member, branchId);
  return member;
}
export async function branchAccess(
  db: Db | Tx,
  member: typeof s.organizationMembers.$inferSelect,
  branchId: string,
) {
  if (member.role === 'owner' || member.allBranches) return;
  const [access] = await db
    .select({ id: s.organizationMemberBranches.branchId })
    .from(s.organizationMemberBranches)
    .where(
      and(
        eq(s.organizationMemberBranches.organizationId, member.organizationId),
        eq(s.organizationMemberBranches.memberId, member.id),
        eq(s.organizationMemberBranches.branchId, branchId),
      ),
    );
  if (!access) throw new ForbiddenException('Backend.branchAccessDenied');
}
export async function requireBranch(
  db: Db | Tx,
  clubId: string,
  branchId: string,
) {
  const [row] = await db
    .select()
    .from(s.branchProfiles)
    .where(
      and(
        eq(s.branchProfiles.branchId, branchId),
        eq(s.branchProfiles.clubId, clubId),
      ),
    );
  if (!row || row.archivedAt)
    throw new NotFoundException('Backend.branchNotFound');
  return row;
}
export async function invalidatePublication(tx: Tx, clubId: string) {
  await tx
    .update(s.clubs)
    .set({
      publicationStatus: 'draft',
      lastVerifiedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(s.clubs.id, clubId));
  // Suspension is an administrative block; editing must never lift it.
  await tx
    .update(s.organizations)
    .set({ status: 'pending', reviewReason: null, updatedAt: new Date() })
    .where(
      and(
        eq(s.organizations.id, clubId),
        inArray(s.organizations.status, ['pending', 'approved', 'rejected']),
      ),
    );
}
export async function activeTerms(tx: Tx, kind: TaxonomyKind, ids: string[]) {
  if (!ids.length) return;
  const table = taxonomies[kind];
  const found = await tx
    .select({ id: table.id })
    .from(table)
    .where(and(inArray(table.id, ids), eq(table.isActive, true)));
  if (found.length !== ids.length)
    throw new BadRequestException({
      message: 'Backend.invalidTaxonomyReference',
      parameters: { kind },
    });
}
async function checkMedia(
  tx: Tx,
  clubId: string,
  mediaIds: string[],
  imagesOnly = false,
) {
  const ids = [...new Set(mediaIds)];
  if (!ids.length) return;
  const found = await tx
    .select()
    .from(s.clubMedia)
    .where(
      and(eq(s.clubMedia.organizationId, clubId), inArray(s.clubMedia.id, ids)),
    );
  if (
    found.length !== ids.length ||
    (imagesOnly && found.some((m) => m.type !== 'image'))
  )
    throw new BadRequestException('Backend.mediaMustBelongToThisClubLogos');
}
async function replaceContacts(
  tx: Tx,
  clubId: string,
  branchId: string | null,
  input: { phones?: ClubPatch['phones']; gallery?: ClubPatch['gallery'] },
) {
  if (input.phones !== undefined) {
    await tx
      .delete(s.clubPhones)
      .where(
        and(
          eq(s.clubPhones.clubId, clubId),
          branchId
            ? eq(s.clubPhones.branchId, branchId)
            : isNull(s.clubPhones.branchId),
        ),
      );
    if (input.phones.length)
      await tx.insert(s.clubPhones).values(
        input.phones.map((phone, sortOrder) => ({
          ...phone,
          clubId,
          branchId,
          sortOrder,
        })),
      );
  }
  if (input.gallery !== undefined) {
    await checkMedia(
      tx,
      clubId,
      input.gallery.map((m) => m.mediaId),
    );
    await tx
      .delete(s.clubGallery)
      .where(
        and(
          eq(s.clubGallery.clubId, clubId),
          branchId
            ? eq(s.clubGallery.branchId, branchId)
            : isNull(s.clubGallery.branchId),
        ),
      );
    if (input.gallery.length)
      await tx.insert(s.clubGallery).values(
        input.gallery.map((m, sortOrder) => ({
          ...m,
          clubId,
          branchId,
          sortOrder,
        })),
      );
  }
}
export async function patchClub(tx: Tx, clubId: string, input: ClubPatch) {
  const {
    name,
    slug,
    categoryIds,
    sportIds,
    tagIds,
    phones,
    gallery,
    socials,
    ...profile
  } = input;
  await checkMedia(
    tx,
    clubId,
    [input.logoId, input.coverId].filter((v): v is string => Boolean(v)),
    true,
  );
  if (name !== undefined || slug !== undefined)
    await tx
      .update(s.organizations)
      .set({ name, slug, updatedAt: new Date() })
      .where(eq(s.organizations.id, clubId));
  if (Object.keys(profile).length)
    await tx
      .update(s.clubs)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(s.clubs.id, clubId));
  if (categoryIds !== undefined) {
    await activeTerms(tx, 'club-categories', categoryIds);
    await tx
      .delete(s.clubCategoryLinks)
      .where(eq(s.clubCategoryLinks.clubId, clubId));
    if (categoryIds.length)
      await tx
        .insert(s.clubCategoryLinks)
        .values(categoryIds.map((categoryId) => ({ clubId, categoryId })));
  }
  if (sportIds !== undefined) {
    await activeTerms(tx, 'sports', sportIds);
    await tx
      .delete(s.clubSportLinks)
      .where(eq(s.clubSportLinks.clubId, clubId));
    if (sportIds.length)
      await tx
        .insert(s.clubSportLinks)
        .values(sportIds.map((sportId) => ({ clubId, sportId })));
  }
  if (tagIds !== undefined) {
    await activeTerms(tx, 'tags', tagIds);
    await tx.delete(s.clubTagLinks).where(eq(s.clubTagLinks.clubId, clubId));
    if (tagIds.length)
      await tx
        .insert(s.clubTagLinks)
        .values(tagIds.map((tagId) => ({ clubId, tagId })));
  }
  if (socials !== undefined) {
    await tx.delete(s.clubSocials).where(eq(s.clubSocials.clubId, clubId));
    if (socials.length)
      await tx
        .insert(s.clubSocials)
        .values(
          socials.map((item, sortOrder) => ({ ...item, clubId, sortOrder })),
        );
  }
  await replaceContacts(tx, clubId, null, { phones, gallery });
}
export async function patchBranch(
  tx: Tx,
  clubId: string,
  branchId: string,
  input: BranchPatch,
) {
  await requireBranch(tx, clubId, branchId);
  const {
    name,
    timezone,
    location,
    sportIds,
    equipments,
    amenities,
    accessibilityFeatures,
    phones,
    gallery,
    openingHours,
    ...profile
  } = input;
  if (name !== undefined || timezone !== undefined)
    await tx
      .update(s.branches)
      .set({ name, timezone, updatedAt: new Date() })
      .where(
        and(eq(s.branches.id, branchId), eq(s.branches.organizationId, clubId)),
      );
  if (location !== undefined) {
    // Location is a complete value-object replacement. Omitted fields become null.
    Object.assign(profile, {
      address: location?.address ?? null,
      latitude: location?.coordinates?.[0] ?? null,
      longitude: location?.coordinates?.[1] ?? null,
      countryId: location?.countryId ?? null,
      provinceId: location?.provinceId ?? null,
      cityId: location?.cityId ?? null,
      districtId: location?.districtId ?? null,
      neighborhood: location?.neighborhood ?? null,
      cityZone: location?.cityZone ?? null,
    });
  }
  if (Object.keys(profile).length)
    await tx
      .update(s.branchProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(s.branchProfiles.branchId, branchId));
  if (sportIds !== undefined) {
    await activeTerms(tx, 'sports', sportIds);
    await tx
      .delete(s.branchSports)
      .where(eq(s.branchSports.branchId, branchId));
    if (sportIds.length)
      await tx
        .insert(s.branchSports)
        .values(sportIds.map((sportId) => ({ branchId, sportId })));
  }
  if (equipments !== undefined) {
    await activeTerms(
      tx,
      'equipments',
      equipments.map((v) => v.equipmentId),
    );
    await tx
      .delete(s.branchEquipments)
      .where(eq(s.branchEquipments.branchId, branchId));
    if (equipments.length)
      await tx
        .insert(s.branchEquipments)
        .values(equipments.map((v) => ({ ...v, branchId })));
  }
  if (amenities !== undefined) {
    await activeTerms(
      tx,
      'amenities',
      amenities.map((v) => v.amenityId),
    );
    await tx
      .delete(s.branchAmenities)
      .where(eq(s.branchAmenities.branchId, branchId));
    if (amenities.length)
      await tx
        .insert(s.branchAmenities)
        .values(amenities.map((v) => ({ ...v, branchId })));
  }
  if (accessibilityFeatures !== undefined) {
    await activeTerms(
      tx,
      'accessibility-features',
      accessibilityFeatures.map((v) => v.featureId),
    );
    await tx
      .delete(s.branchAccessibility)
      .where(eq(s.branchAccessibility.branchId, branchId));
    if (accessibilityFeatures.length)
      await tx
        .insert(s.branchAccessibility)
        .values(accessibilityFeatures.map((v) => ({ ...v, branchId })));
  }
  await replaceContacts(tx, clubId, branchId, { phones, gallery });
  if (openingHours !== undefined) {
    await tx.delete(s.weeklyHours).where(eq(s.weeklyHours.branchId, branchId));
    if (openingHours.weekly.length)
      await tx
        .insert(s.weeklyHours)
        .values(openingHours.weekly.map((v) => ({ ...v, branchId })));
    await tx
      .delete(s.openingExceptions)
      .where(eq(s.openingExceptions.branchId, branchId));
    for (const exception of openingHours.exceptions) {
      const { intervals, ...values } = exception;
      const [row] = await tx
        .insert(s.openingExceptions)
        .values({ ...values, branchId })
        .returning();
      if (intervals.length)
        await tx
          .insert(s.exceptionIntervals)
          .values(intervals.map((v) => ({ ...v, exceptionId: row.id })));
    }
  }
}
