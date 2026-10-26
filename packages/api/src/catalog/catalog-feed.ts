import { infiniteQueryOptions } from "@tanstack/react-query";
import type { ApiClient } from "../transport";
import { catalogClients } from "./catalog.clients";
import { catalogKeys } from "./catalog.keys";
import { validCatalogPrices, type ClubFiltersDto } from "./catalog.dto";

/** The catalog endpoint serves stable, 25-item pages. Keep filters and identity
 * in the key so a changed search never appends to the previous result set. */
export function clubFeedOptions(
  api: ApiClient,
  filters: Omit<ClubFiltersDto, "page"> = {},
) {
  return infiniteQueryOptions({
    queryKey: [...catalogKeys(api.scope).clubs(filters), "infinite"],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      catalogClients.clubs(api, { ...filters, page: pageParam }, { signal }),
    getNextPageParam: (lastPage, _pages, page) =>
      lastPage.length === 25 ? page + 1 : undefined,
    enabled: validCatalogPrices(filters),
  });
}
