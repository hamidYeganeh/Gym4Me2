import { NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, or, sql, is } from 'drizzle-orm';
import { NodePgTransaction } from 'drizzle-orm/node-postgres';
import * as s from '../../database/schema';
import type { Db, Tx } from './club.repository';
import { currentTariffs } from './club.tariffs';
type Reader = Db | Tx;
async function readSections<T extends unknown[]>(
  db: Reader,
  tasks: { [Index in keyof T]: () => PromiseLike<T[Index]> },
): Promise<T> {
  // A transaction owns one connection. Pool-backed reads may use separate connections.
  if (!is(db, NodePgTransaction))
    return Promise.all(tasks.map((load) => load())) as Promise<T>;
  const result: unknown[] = [];
  for (const load of tasks) result.push(await load());
  return result as T;
}
export const publicClub = () =>
  and(
    eq(s.clubs.publicationStatus, 'published'),
    eq(s.organizations.status, 'approved'),
    isNull(s.clubs.archivedAt),
  );
// Incomplete secondary branches stay private while the main branch can publish.
export const publicBranchProfile = () => sql<boolean>`
  ${s.branchProfiles.address} IS NOT NULL
  AND ${s.branchProfiles.countryId} IS NOT NULL
  AND ${s.branchProfiles.provinceId} IS NOT NULL
  AND ${s.branchProfiles.cityId} IS NOT NULL
  AND ${s.branchProfiles.latitude} IS NOT NULL
  AND ${s.branchProfiles.longitude} IS NOT NULL
  AND EXISTS (SELECT 1 FROM ${s.weeklyHours} WHERE ${s.weeklyHours.branchId} = ${s.branchProfiles.branchId})
  AND EXISTS (SELECT 1 FROM ${s.branchSports} WHERE ${s.branchSports.branchId} = ${s.branchProfiles.branchId})
  AND EXISTS (SELECT 1 FROM ${s.clubPhones}
    WHERE ${s.clubPhones.clubId} = ${s.branchProfiles.clubId}
    AND (${s.clubPhones.branchId} IS NULL OR ${s.clubPhones.branchId} = ${s.branchProfiles.branchId}))`;
const mediaSelection = {
  id: s.clubMedia.id,
  type: s.clubMedia.type,
  url: s.clubMedia.url,
  thumbnailUrl: s.clubMedia.thumbnailUrl,
  alt: s.clubMedia.alt,
  width: s.clubMedia.width,
  height: s.clubMedia.height,
  durationSeconds: s.clubMedia.durationSeconds,
};
export async function readClub(db: Reader, clubId: string, publicOnly = false) {
  const [club] = await db
    .select({
      id: s.clubs.id,
      name: s.organizations.name,
      slug: s.organizations.slug,
      ownerId: s.clubs.ownerId,
      description: s.clubs.description,
      shortDescription: s.clubs.shortDescription,
      publicationStatus: s.clubs.publicationStatus,
      verificationStatus: s.organizations.status,
      operatingStatus: s.clubs.operatingStatus,
      lastVerifiedAt: s.clubs.lastVerifiedAt,
      archivedAt: s.clubs.archivedAt,
      createdAt: s.clubs.createdAt,
      updatedAt: s.clubs.updatedAt,
      logoId: s.clubs.logoId,
      coverId: s.clubs.coverId,
      ownerName: publicOnly
        ? sql<
            string | null
          >`CASE WHEN ${s.users.profilePublic} AND NOT ${s.users.deletionPending} THEN ${s.users.displayName} ELSE NULL END`
        : s.users.displayName,
    })
    .from(s.clubs)
    .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
    .innerJoin(s.users, eq(s.users.id, s.clubs.ownerId))
    .where(and(eq(s.clubs.id, clubId), publicOnly ? publicClub() : undefined));
  if (!club) throw new NotFoundException('Backend.clubNotFound');
  const [categories, sports, tags, phones, socials, gallery, branches, rating] =
    await readSections(db, [
      () =>
        db
          .select({
            id: s.clubCategories.id,
            name: s.clubCategories.name,
            isActive: s.clubCategories.isActive,
          })
          .from(s.clubCategoryLinks)
          .innerJoin(
            s.clubCategories,
            eq(s.clubCategories.id, s.clubCategoryLinks.categoryId),
          )
          .where(eq(s.clubCategoryLinks.clubId, clubId)),
      () =>
        db
          .select({
            id: s.sports.id,
            name: s.sports.name,
            isActive: s.sports.isActive,
          })
          .from(s.clubSportLinks)
          .innerJoin(s.sports, eq(s.sports.id, s.clubSportLinks.sportId))
          .where(eq(s.clubSportLinks.clubId, clubId)),
      () =>
        db
          .select({
            id: s.tags.id,
            name: s.tags.name,
            isActive: s.tags.isActive,
          })
          .from(s.clubTagLinks)
          .innerJoin(s.tags, eq(s.tags.id, s.clubTagLinks.tagId))
          .where(eq(s.clubTagLinks.clubId, clubId)),
      () =>
        db
          .select({
            number: s.clubPhones.number,
            label: s.clubPhones.label,
            extension: s.clubPhones.extension,
            isPrimary: s.clubPhones.isPrimary,
          })
          .from(s.clubPhones)
          .where(
            and(eq(s.clubPhones.clubId, clubId), isNull(s.clubPhones.branchId)),
          )
          .orderBy(s.clubPhones.sortOrder),
      () =>
        db
          .select({
            platform: s.clubSocials.platform,
            link: s.clubSocials.link,
            label: s.clubSocials.label,
          })
          .from(s.clubSocials)
          .where(eq(s.clubSocials.clubId, clubId))
          .orderBy(s.clubSocials.sortOrder),
      () => readGallery(db, clubId, null),
      () =>
        db
          .select({
            id: s.branches.id,
            name: s.branches.name,
            isMain: s.branchProfiles.isMain,
            operatingStatus: s.branchProfiles.operatingStatus,
            cityId: s.branchProfiles.cityId,
          })
          .from(s.branchProfiles)
          .innerJoin(s.branches, eq(s.branches.id, s.branchProfiles.branchId))
          .where(
            and(
              eq(s.branchProfiles.clubId, clubId),
              isNull(s.branchProfiles.archivedAt),
              publicOnly ? publicBranchProfile() : undefined,
            ),
          )
          .orderBy(
            desc(s.branchProfiles.isMain),
            s.branches.createdAt,
            s.branches.id,
          ),
      () =>
        db
          .select({
            average: sql<
              number | null
            >`round(avg(${s.clubReviews.rating}), 2)::float`,
            count: sql<number>`count(*)::int`,
          })
          .from(s.clubReviews)
          .innerJoin(
            s.branchProfiles,
            eq(s.branchProfiles.branchId, s.clubReviews.branchId),
          )
          .where(
            and(
              eq(s.branchProfiles.clubId, clubId),
              eq(s.clubReviews.status, 'published'),
              isNull(s.branchProfiles.archivedAt),
              publicOnly ? publicBranchProfile() : undefined,
            ),
          ),
    ]);
  const getMedia = async (id: string | null) =>
    id
      ? ((
          await db
            .select(mediaSelection)
            .from(s.clubMedia)
            .where(
              and(
                eq(s.clubMedia.id, id),
                eq(s.clubMedia.organizationId, clubId),
              ),
            )
        )[0] ?? null)
      : null;
  const [logo, cover] = await readSections(db, [
    () => getMedia(club.logoId),
    () => getMedia(club.coverId),
  ]);
  const { ownerName, ...identity } = club;
  const tariffs = (
    await currentTariffs(db, clubId, undefined, publicOnly)
  ).filter(
    (tariff) =>
      !publicOnly ||
      tariff.branchId === null ||
      branches.some((branch) => branch.id === tariff.branchId),
  );
  return {
    ...identity,
    owner: { id: club.ownerId, displayName: ownerName },
    logo,
    cover,
    categories,
    sports,
    tags,
    phones,
    socials,
    gallery,
    branches,
    tariffs,
    rating: rating[0],
  };
}
export async function readGallery(
  db: Reader,
  clubId: string,
  branchId: string | null,
) {
  return db
    .select({
      ...mediaSelection,
      caption: s.clubGallery.caption,
      sortOrder: s.clubGallery.sortOrder,
    })
    .from(s.clubGallery)
    .innerJoin(s.clubMedia, eq(s.clubMedia.id, s.clubGallery.mediaId))
    .where(
      and(
        eq(s.clubGallery.clubId, clubId),
        branchId
          ? eq(s.clubGallery.branchId, branchId)
          : isNull(s.clubGallery.branchId),
      ),
    )
    .orderBy(s.clubGallery.sortOrder);
}
export async function readBranch(
  db: Reader,
  clubId: string,
  branchId: string,
  publicOnly = false,
) {
  const [branch] = await db
    .select({
      profile: s.branchProfiles,
      name: s.branches.name,
      slug: s.branches.slug,
      timezone: s.branches.timezone,
    })
    .from(s.branchProfiles)
    .innerJoin(s.branches, eq(s.branches.id, s.branchProfiles.branchId))
    .where(
      and(
        eq(s.branchProfiles.clubId, clubId),
        eq(s.branchProfiles.branchId, branchId),
        isNull(s.branchProfiles.archivedAt),
        publicOnly ? publicBranchProfile() : undefined,
      ),
    );
  if (!branch) throw new NotFoundException('Backend.branchNotFound');
  const [
    sports,
    equipments,
    amenities,
    accessibilityFeatures,
    phones,
    gallery,
    weekly,
    exceptions,
    spaces,
    coaches,
  ] = await readSections(db, [
    () =>
      db
        .select({
          id: s.sports.id,
          name: s.sports.name,
          isActive: s.sports.isActive,
        })
        .from(s.branchSports)
        .innerJoin(s.sports, eq(s.sports.id, s.branchSports.sportId))
        .where(eq(s.branchSports.branchId, branchId)),
    () =>
      db
        .select({
          id: s.equipments.id,
          name: s.equipments.name,
          quantity: s.branchEquipments.quantity,
          description: s.branchEquipments.description,
        })
        .from(s.branchEquipments)
        .innerJoin(
          s.equipments,
          eq(s.equipments.id, s.branchEquipments.equipmentId),
        )
        .where(eq(s.branchEquipments.branchId, branchId)),
    () =>
      db
        .select({
          id: s.amenities.id,
          name: s.amenities.name,
          availability: s.branchAmenities.availability,
          description: s.branchAmenities.description,
        })
        .from(s.branchAmenities)
        .innerJoin(s.amenities, eq(s.amenities.id, s.branchAmenities.amenityId))
        .where(eq(s.branchAmenities.branchId, branchId)),
    () =>
      db
        .select({
          id: s.accessibilityFeatures.id,
          name: s.accessibilityFeatures.name,
          description: s.branchAccessibility.description,
        })
        .from(s.branchAccessibility)
        .innerJoin(
          s.accessibilityFeatures,
          eq(s.accessibilityFeatures.id, s.branchAccessibility.featureId),
        )
        .where(eq(s.branchAccessibility.branchId, branchId)),
    () =>
      db
        .select({
          number: s.clubPhones.number,
          label: s.clubPhones.label,
          extension: s.clubPhones.extension,
          isPrimary: s.clubPhones.isPrimary,
        })
        .from(s.clubPhones)
        .where(eq(s.clubPhones.branchId, branchId))
        .orderBy(s.clubPhones.sortOrder),
    () => readGallery(db, clubId, branchId),
    () =>
      db
        .select({
          dayOfWeek: s.weeklyHours.dayOfWeek,
          audience: s.weeklyHours.audience,
          startMinute: s.weeklyHours.startMinute,
          endMinute: s.weeklyHours.endMinute,
        })
        .from(s.weeklyHours)
        .where(eq(s.weeklyHours.branchId, branchId))
        .orderBy(s.weeklyHours.dayOfWeek, s.weeklyHours.startMinute),
    () =>
      db
        .select()
        .from(s.openingExceptions)
        .where(eq(s.openingExceptions.branchId, branchId))
        .orderBy(s.openingExceptions.date),
    () =>
      db
        .select()
        .from(s.spaces)
        .where(eq(s.spaces.branchId, branchId))
        .orderBy(s.spaces.createdAt),
    () =>
      db
        .select({
          id: s.branchCoaches.id,
          coachId: s.branchCoaches.coachId,
          displayName: publicOnly
            ? sql<
                string | null
              >`CASE WHEN ${s.users.profilePublic} THEN ${s.users.displayName} ELSE NULL END`
            : s.users.displayName,
          biography: publicOnly
            ? sql<
                string | null
              >`CASE WHEN ${s.users.profilePublic} THEN ${s.coachProfiles.biography} ELSE NULL END`
            : s.coachProfiles.biography,
          sportId: s.branchCoaches.sportId,
        })
        .from(s.branchCoaches)
        .innerJoin(
          s.coachProfiles,
          eq(s.coachProfiles.userId, s.branchCoaches.coachId),
        )
        .innerJoin(s.users, eq(s.users.id, s.branchCoaches.coachId))
        .where(
          and(
            eq(s.branchCoaches.branchId, branchId),
            eq(s.branchCoaches.status, 'active'),
            eq(s.users.status, 'active'),
            eq(s.users.deletionPending, false),
            or(
              isNull(s.branchCoaches.startsOn),
              sql`${s.branchCoaches.startsOn} <= current_date`,
            ),
            or(
              isNull(s.branchCoaches.endsOn),
              sql`${s.branchCoaches.endsOn} >= current_date`,
            ),
          ),
        ),
  ]);
  const intervals = await db
    .select({
      exceptionId: s.exceptionIntervals.exceptionId,
      startMinute: s.exceptionIntervals.startMinute,
      endMinute: s.exceptionIntervals.endMinute,
    })
    .from(s.exceptionIntervals)
    .innerJoin(
      s.openingExceptions,
      eq(s.openingExceptions.id, s.exceptionIntervals.exceptionId),
    )
    .where(eq(s.openingExceptions.branchId, branchId))
    .orderBy(s.exceptionIntervals.startMinute);
  const {
    latitude,
    longitude,
    address,
    countryId,
    provinceId,
    cityId,
    districtId,
    neighborhood,
    cityZone,
    branchId: id,
    ...profile
  } = branch.profile;
  return {
    ...profile,
    id,
    name: branch.name,
    slug: branch.slug,
    timezone: branch.timezone,
    location: {
      address,
      coordinates: latitude === null ? null : [latitude, longitude],
      countryId,
      provinceId,
      cityId,
      districtId,
      neighborhood,
      cityZone,
    },
    sports,
    equipments,
    amenities,
    accessibilityFeatures,
    phones,
    gallery,
    openingHours: {
      weekly,
      exceptions: exceptions.map(
        ({ id, date, audience, isClosed, reason }) => ({
          date,
          audience,
          isClosed,
          reason,
          intervals: intervals
            .filter((i) => i.exceptionId === id)
            .map(({ startMinute, endMinute }) => ({ startMinute, endMinute })),
        }),
      ),
    },
    spaces,
    coaches,
  };
}
export async function publicationReadiness(db: Reader, clubId: string) {
  const club = await readClub(db, clubId);
  const errors: { field: string; message: string }[] = [];
  const need = (ok: unknown, field: string, message: string) => {
    if (!ok) errors.push({ field, message });
  };
  need(
    club.description?.trim(),
    'description',
    'Backend.aFullDescriptionIsRequired',
  );
  need(club.cover, 'coverId', 'Backend.aCoverImageIsRequired');
  need(
    club.categories.some((c) => c.isActive),
    'categoryIds',
    'Backend.atLeastOneActiveCategoryIsRequired',
  );
  need(
    club.sports.some((sport) => sport.isActive),
    'sportIds',
    'Backend.atLeastOneActiveSportIsRequired',
  );
  const main = club.branches.find((b) => b.isMain);
  need(main, 'branches', 'Backend.aMainBranchIsRequired');
  if (main) {
    const branch = await readBranch(db, clubId, main.id);
    need(
      branch.location.address &&
        branch.location.countryId &&
        branch.location.provinceId &&
        branch.location.cityId &&
        branch.location.coordinates,
      'mainBranch.location',
      'Backend.theMainBranchNeedsAnAddressCountry',
    );
    need(
      club.phones.length || branch.phones.length,
      'phones',
      'Backend.atLeastOnePublicPhoneNumberIs',
    );
    need(
      branch.openingHours.weekly.length,
      'mainBranch.openingHours',
      'Backend.weeklyOpeningHoursAreRequired',
    );
    need(
      branch.sports.some((sport) => sport.isActive),
      'mainBranch.sportIds',
      'Backend.theMainBranchNeedsAtLeastOne',
    );
  }
  return { ready: errors.length === 0, errors };
}
