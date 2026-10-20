import type { ClubFiltersDto } from "@repo/api/catalog";

export type CatalogLocation = Pick<
  ClubFiltersDto,
  "countryId" | "provinceId" | "cityId" | "districtId"
>;

/** Every selected level constrains the same public branch, even before a city is chosen. */
export function catalogLocationFilters(
  place: CatalogLocation,
): CatalogLocation {
  return {
    countryId: place.countryId || undefined,
    provinceId: place.provinceId || undefined,
    cityId: place.cityId || undefined,
    districtId: place.districtId || undefined,
  };
}
