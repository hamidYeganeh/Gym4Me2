import type * as dto from "./catalog.dto";
import { ApiError, type ApiClient, type RequestOptions } from "../transport";
import { catalogEndpoints } from "./catalog.endpoints";
import { readLocationPages } from "./location-pages";
export const catalogClients = {
  locationDiscovery: (
    api: ApiClient,
    filters: dto.LocationDiscoveryFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.LocationDiscoveryDto>(
      {
        method: "GET",
        path: "catalog/locations/discovery",
        query: {
          ...filters,
          countryId: filters.countryId || undefined,
          provinceId: filters.provinceId || undefined,
          cityId: filters.cityId || undefined,
          districtId: filters.districtId || undefined,
        },
      },
      options,
    ),
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
  club: async (api: ApiClient, id: string, options: RequestOptions = {}) => {
    try {
      return await api.request<dto.ClubDto>(catalogEndpoints.club(id), options);
    } catch (error) {
      // Older deployed APIs accept UUIDs only. Resolve public slugs without
      // leaking database identifiers into browser routes.
      if (
        !(error instanceof ApiError) ||
        error.status !== 400 ||
        error.code !== "Backend.invalidClubInformation" ||
        /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)
      )
        throw error;
      const seen = new Set<string>();
      for (let page = 1; ; page++) {
        const clubs = await api.request<dto.ClubSummaryDto[]>(
          catalogEndpoints.clubs({ page }),
          options,
        );
        const match = clubs.find((club) => club.slug === id);
        if (match)
          return api.request<dto.ClubDto>(
            catalogEndpoints.club(match.id),
            options,
          );
        if (!clubs.length || clubs.every((club) => seen.has(club.id))) break;
        clubs.forEach((club) => seen.add(club.id));
      }
      throw new ApiError(404, "Backend.clubNotFound");
    }
  },
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
