"use client";
import { validCatalogPrices } from "./catalog.dto";
import type * as dto from "./catalog.dto";
import { catalogClients } from "./catalog.clients";
import { catalogKeys } from "./catalog.keys";
import { useApiQuery, useApiMutation } from "../query";
export function useLocationDiscovery(
  filters: dto.LocationDiscoveryFiltersDto = {},
  enabled = true,
) {
  return useApiQuery(
    (scope) => [...catalogKeys(scope).all, "location-discovery", filters],
    (api, signal) => catalogClients.locationDiscovery(api, filters, { signal }),
    enabled,
  );
}

export function useClubs(
  filters: dto.ClubFiltersDto = {},
  savedOnly = false,
  guestIds?: string[],
) {
  return useApiQuery(
    (scope) => [...catalogKeys(scope).clubs(filters), savedOnly, guestIds],
    (api, signal) =>
      guestIds
        ? catalogClients.guestSavedClubs(api, guestIds, filters, { signal })
        : savedOnly
          ? catalogClients.savedClubs(api, filters, { signal })
          : catalogClients.clubs(api, filters, { signal }),
    validCatalogPrices(filters),
  );
}
export function useClub(id: string | undefined) {
  return useApiQuery(
    (scope) => catalogKeys(scope).club(id),
    (api, signal) => catalogClients.club(api, id ?? "", { signal }),
    Boolean(id),
  );
}
export function useCompareClubs(ids: string[]) {
  return useApiQuery(
    (scope) => [...scope, "catalog", "compare", ids],
    (api, signal) =>
      Promise.all(ids.map((id) => catalogClients.club(api, id, { signal }))),
    ids.length >= 2 && ids.length <= 3,
  );
}
export function useClubBranch(
  id: string | undefined,
  branchId: string | undefined,
) {
  return useApiQuery(
    (scope) => catalogKeys(scope).branch(id, branchId),
    (api, signal) =>
      catalogClients.branch(api, id ?? "", branchId ?? "", { signal }),
    Boolean(id && branchId),
  );
}
export function useTaxonomies(
  kind: dto.TaxonomyKind,
  filters: dto.PageDto = {},
) {
  return useApiQuery(
    (scope) => catalogKeys(scope).taxonomies(kind, filters),
    (api, signal) => catalogClients.taxonomies(api, kind, filters, { signal }),
  );
}
export function useLocations(kind: dto.GeographyKind, parentId?: string) {
  return useApiQuery(
    (scope) => catalogKeys(scope).locations(kind, parentId),
    (api, signal) => catalogClients.locations(api, kind, parentId, { signal }),
    kind === "countries" || Boolean(parentId),
  );
}
export function useClubReviews(
  id: string | undefined,
  branchId: string | undefined,
  filters: dto.PageDto = {},
) {
  return useApiQuery(
    (scope) => catalogKeys(scope).reviews(id, branchId, filters),
    (api, signal) =>
      catalogClients.reviews(api, id ?? "", branchId ?? "", filters, {
        signal,
      }),
    Boolean(id && branchId),
  );
}
export function useCreateReview() {
  return useApiMutation(
    (
      api,
      input: { id: string; branchId: string; input: dto.CreateReviewDto },
    ) =>
      catalogClients.createReview(api, input.id, input.branchId, input.input),
    [["catalog"], ["admin"]],
  );
}
