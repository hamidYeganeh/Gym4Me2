import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import * as s from '../../database/schema';
import type { Db, Tx } from './club.repository';
import { publicBranchProfile, publicClub } from './club.read-model';

type GeographyKind = 'countries' | 'provinces' | 'cities' | 'districts';
export type DiscoveryLocation = {
  countryId?: string;
  provinceId?: string;
  cityId?: string;
  districtId?: string;
};
type Place = DiscoveryLocation & {
  id: string;
  name: string;
  parentName: string;
};

/** One aggregate for the whole page. Multiple public branches never inflate club counts. */
export async function withLocationCounts<T extends { id: string }>(
  db: Db | Tx,
  kind: GeographyKind,
  places: T[],
): Promise<(T & { clubCount: number })[]> {
  if (!places.length) return [];
  const column = {
    countries: s.branchProfiles.countryId,
    provinces: s.branchProfiles.provinceId,
    cities: s.branchProfiles.cityId,
    districts: s.branchProfiles.districtId,
  }[kind];
  const counts = await db
    .select({
      id: column,
      count: sql<number>`count(distinct ${s.clubs.id})::int`,
    })
    .from(s.branchProfiles)
    .innerJoin(s.clubs, eq(s.clubs.id, s.branchProfiles.clubId))
    .innerJoin(s.organizations, eq(s.organizations.id, s.clubs.id))
    .where(
      and(
        inArray(
          column,
          places.map((p) => p.id),
        ),
        publicClub(),
        publicBranchProfile(),
        isNull(s.branchProfiles.archivedAt),
      ),
    )
    .groupBy(column);
  const byId = new Map(counts.map((row) => [row.id, row.count]));
  return places.map((place) => ({
    ...place,
    clubCount: byId.get(place.id) ?? 0,
  }));
}

/** Resolve ancestors from database records; reject mixed or nonexistent hierarchies. */
export async function resolveLocation(
  db: Db | Tx,
  input: DiscoveryLocation,
): Promise<DiscoveryLocation> {
  let result: DiscoveryLocation = {};
  if (input.districtId) {
    const rows = await db
      .select({
        countryId: s.provinces.countryId,
        provinceId: s.cities.provinceId,
        cityId: s.districts.cityId,
        districtId: s.districts.id,
      })
      .from(s.districts)
      .innerJoin(s.cities, eq(s.cities.id, s.districts.cityId))
      .innerJoin(s.provinces, eq(s.provinces.id, s.cities.provinceId))
      .where(eq(s.districts.id, input.districtId));
    result = rows[0] ?? {};
  } else if (input.cityId) {
    const rows = await db
      .select({
        countryId: s.provinces.countryId,
        provinceId: s.cities.provinceId,
        cityId: s.cities.id,
      })
      .from(s.cities)
      .innerJoin(s.provinces, eq(s.provinces.id, s.cities.provinceId))
      .where(eq(s.cities.id, input.cityId));
    result = rows[0] ?? {};
  } else if (input.provinceId) {
    const rows = await db
      .select({ countryId: s.provinces.countryId, provinceId: s.provinces.id })
      .from(s.provinces)
      .where(eq(s.provinces.id, input.provinceId));
    result = rows[0] ?? {};
  } else if (input.countryId) {
    const [row] = await db
      .select({ countryId: s.countries.id })
      .from(s.countries)
      .where(eq(s.countries.id, input.countryId));
    result = row ?? {};
  }
  if (
    [input.countryId, input.provinceId, input.cityId, input.districtId].some(
      Boolean,
    ) &&
    !result.countryId
  )
    throw new NotFoundException('Backend.locationNotFound');
  for (const key of [
    'countryId',
    'provinceId',
    'cityId',
    'districtId',
  ] as const)
    if (input[key] && input[key] !== result[key])
      throw new BadRequestException(
        'Backend.invalidRelationshipOwnershipScopeOrValue',
      );
  return result;
}

export async function discoverLocations(
  db: Db | Tx,
  input: DiscoveryLocation & { randomize?: boolean; seed?: string },
) {
  const location = await resolveLocation(db, input);
  // Stable through a browsing session; a fresh guest visit receives a new seed.
  const seed = input.seed ?? (input.randomize ? randomUUID() : 'local');
  const order = (column: SQL, selected?: string, childPriority?: SQL) =>
    sql`CASE WHEN ${column}=${selected ?? null}::uuid THEN 0 ELSE 1 END, ${childPriority ? sql`${childPriority},` : sql``} md5(${column}::text || ${seed})`;
  const read = async (
    kind: Exclude<GeographyKind, 'countries'>,
    query: SQL,
  ) => {
    const { rows } = await db.execute<Place>(query);
    return withLocationCounts(db, kind, rows);
  };
  const provinces = await read(
    'provinces',
    sql`SELECT p.id,p.name,p.country_id AS "countryId",c.name AS "parentName"
    FROM provinces p JOIN countries c ON c.id=p.country_id
    WHERE (${location.countryId ?? null}::uuid IS NULL OR p.country_id=${location.countryId ?? null})
    ORDER BY ${order(sql.raw('p.id'), location.provinceId, sql`CASE WHEN EXISTS(SELECT 1 FROM cities c JOIN districts d ON d.city_id=c.id WHERE c.province_id=p.id) THEN 0 WHEN EXISTS(SELECT 1 FROM cities c WHERE c.province_id=p.id) THEN 1 ELSE 2 END`)} LIMIT 12`,
  );
  const province =
    provinces.find((p) => p.id === location.provinceId) ?? provinces[0];
  const cities = province
    ? await read(
        'cities',
        sql`SELECT c.id,c.name,p.id AS "provinceId",p.country_id AS "countryId",p.name AS "parentName"
    FROM cities c JOIN provinces p ON p.id=c.province_id WHERE c.province_id=${province.id}
    ORDER BY ${order(sql.raw('c.id'), location.cityId, sql`CASE WHEN EXISTS(SELECT 1 FROM districts d WHERE d.city_id=c.id) THEN 0 ELSE 1 END`)} LIMIT 12`,
      )
    : [];
  const city = cities.find((c) => c.id === location.cityId) ?? cities[0];
  const districts = city
    ? await read(
        'districts',
        sql`SELECT d.id,d.name,c.id AS "cityId",p.id AS "provinceId",p.country_id AS "countryId",c.name AS "parentName"
    FROM districts d JOIN cities c ON c.id=d.city_id JOIN provinces p ON p.id=c.province_id WHERE d.city_id=${city.id}
    ORDER BY ${order(sql.raw('d.id'), location.districtId)} LIMIT 12`,
      )
    : [];
  return {
    provinces,
    cities,
    districts,
    seed,
    location: {
      countryId: province?.countryId,
      provinceId: province?.id,
      cityId: city?.id,
      districtId: districts.find((d) => d.id === location.districtId)?.id,
    },
  };
}
