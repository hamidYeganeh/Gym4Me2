import type * as dto from "./catalog.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { catalogEndpoints } from "./catalog.endpoints";
import { readLocationPages } from "./location-pages";
export const catalogClients = {
  guestSavedClubs: (
    api: ApiClient,
    ids: string[],
    filters: dto.ClubFiltersDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.ClubSummaryDto[]>(
      {
        method: "POST",
        path: "catalog/clubs/guest-saved",
        body: { ids, filters },
      },
      options,
    ),
  savedClubs: (
    api: ApiClient,
    filters: dto.ClubFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.ClubSummaryDto[]>(
      { method: "GET", path: "catalog/clubs/saved", query: filters },
      options,
    ),
  clubs: (
    api: ApiClient,
    filters: dto.ClubFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.ClubSummaryDto[]>(catalogEndpoints.clubs(filters), options),
  club: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<dto.ClubDto>(catalogEndpoints.club(id), options),
  branch: (
    api: ApiClient,
    id: string,
    branchId: string,
    options: RequestOptions = {},
  ) =>
    api.request<dto.BranchProfileDto>(
      catalogEndpoints.branch(id, branchId),
      options,
    ),
  taxonomies: (
    api: ApiClient,
    kind: dto.TaxonomyKind,
    filters: dto.PageDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.TaxonomyDto[]>(
      catalogEndpoints.taxonomies(kind, filters),
      options,
    ),
  locations: (
    api: ApiClient,
    kind: dto.GeographyKind,
    parentId?: string,
    options: RequestOptions = {},
  ) =>
    readLocationPages(
      kind,
      (page) =>
        api.request<dto.PlaceDto[]>(
          catalogEndpoints.locations(kind, parentId, page),
          options,
        ),
      options.signal,
    ),
  locationPage: (
    api: ApiClient,
    kind: dto.GeographyKind,
    filters: dto.LocationFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.PlaceDto[]>(
      catalogEndpoints.locations(kind, filters.parentId, filters.page),
      options,
    ),
  reviews: (
    api: ApiClient,
    id: string,
    branchId: string,
    filters: dto.PageDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.PublicReviewDto[]>(
      catalogEndpoints.reviews(id, branchId, filters),
      options,
    ),
  createReview: (
    api: ApiClient,
    id: string,
    branchId: string,
    input: dto.CreateReviewDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.ReviewDto>(
      catalogEndpoints.createReview(id, branchId, input),
      options,
    ),
};
