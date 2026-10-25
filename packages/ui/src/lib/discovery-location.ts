import type { DiscoveryLocationDto } from "@repo/api/catalog";

/** An explicit selection (including an empty country) overrides saved personalization. */
export function preferredDiscoveryLocation(
  selection: DiscoveryLocationDto | undefined,
  saved: DiscoveryLocationDto | null | undefined,
): DiscoveryLocationDto {
  return selection && Object.keys(selection).length ? selection : (saved ?? {});
}

/** Selecting an ancestor always drops the previous province/city's descendants. */
export function chooseDiscoveryLocation(
  kind: "provinces" | "cities" | "districts",
  place: DiscoveryLocationDto & { id: string },
): DiscoveryLocationDto {
  return {
    countryId: place.countryId,
    provinceId: kind === "provinces" ? place.id : place.provinceId,
    ...(kind !== "provinces" && {
      cityId: kind === "cities" ? place.id : place.cityId,
    }),
    ...(kind === "districts" && { districtId: place.id }),
  };
}
