"use client";
import { clubFeedOptions } from "./catalog-feed";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useApiContext } from "../provider";
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
  enabled = true,
) {
  return useApiQuery(
    (scope) => [...catalogKeys(scope).clubs(filters), savedOnly, guestIds],
    (api, signal) =>
      guestIds
        ? catalogClients.guestSavedClubs(api, guestIds, filters, { signal })
        : savedOnly
          ? catalogClients.savedClubs(api, filters, { signal })
          : catalogClients.clubs(api, filters, { signal }),
    enabled && validCatalogPrices(filters),
  );
}
export function useClub(id: string | undefined, initialData?: dto.ClubDto) {
  const { api } = useApiContext();
  return useQuery<dto.ClubDto, import("../transport").ApiError>({
    queryKey: catalogKeys(api.scope).club(id),
    queryFn: ({ signal }) => catalogClients.club(api, id ?? "", { signal }),
    enabled: Boolean(id),
    initialData,
  });
}
export function useClubBranch(
  id: string | undefined,
  branchId: string | undefined,
  initialData?: dto.BranchProfileDto,
) {
  return useApiQuery(
    (scope) => catalogKeys(scope).branch(id, branchId),
    (api, signal) =>
      catalogClients.branch(api, id ?? "", branchId ?? "", { signal }),
    Boolean(id && branchId),
    undefined,
    false,
    initialData,
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

export function useInfiniteClubs(
  filters: Omit<dto.ClubFiltersDto, "page"> = {},
) {
  const { api } = useApiContext();
  return useInfiniteQuery(clubFeedOptions(api, filters));
}
