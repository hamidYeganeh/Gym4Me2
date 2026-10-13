import type * as business from "../business/business.dto";
import type * as dto from "./admin.dto";
import type * as catalog from "../catalog/catalog.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { adminEndpoints } from "./admin.endpoints";
export const adminClients = {
  overview: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.AdminOverviewDto>(adminEndpoints.overview(), options),
  users: (
    api: ApiClient,
    filters: dto.AdminUserFiltersDto = {},
    options: RequestOptions = {},
  ) => api.request<dto.AdminUserDto[]>(adminEndpoints.users(filters), options),
  user: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<dto.AdminUserDetailDto>(adminEndpoints.user(id), options),
  setUserStatus: (
    api: ApiClient,
    id: string,
    input: dto.UserStatusDto,
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      adminEndpoints.setUserStatus(id, input),
      options,
    ),
  organizations: (
    api: ApiClient,
    filters: dto.AdminOrganizationFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.AdminOrganizationDto[]>(
      adminEndpoints.organizations(filters),
      options,
    ),
  organization: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<dto.AdminOrganizationDetailDto>(
      adminEndpoints.organization(id),
      options,
    ),
  reviewOrganization: (
    api: ApiClient,
    id: string,
    input: dto.OrganizationDecisionDto,
    options: RequestOptions = {},
  ) =>
    api.request<business.OrganizationRecordDto>(
      adminEndpoints.reviewOrganization(id, input),
      options,
    ),
  audit: (
    api: ApiClient,
    filters: dto.AuditFiltersDto = {},
    options: RequestOptions = {},
  ) => api.request<dto.AuditEventDto[]>(adminEndpoints.audit(filters), options),
  club: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<catalog.ClubDto>(adminEndpoints.club(id), options),
  readiness: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<catalog.ReadinessDto>(adminEndpoints.readiness(id), options),
  branch: (
    api: ApiClient,
    id: string,
    branchId: string,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.BranchProfileDto>(
      adminEndpoints.branch(id, branchId),
      options,
    ),
  reviewClub: (
    api: ApiClient,
    id: string,
    input: dto.OrganizationDecisionDto,
    options: RequestOptions = {},
  ) =>
    api.request<business.OrganizationRecordDto>(
      adminEndpoints.reviewClub(id, input),
      options,
    ),
  taxonomies: (
    api: ApiClient,
    kind: catalog.TaxonomyKind,
    filters: dto.TaxonomyFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<catalog.TaxonomyDto[]>(
      adminEndpoints.taxonomies(kind, filters),
      options,
    ),
  createTaxonomy: (
    api: ApiClient,
    kind: catalog.TaxonomyKind,
    input: catalog.SaveTaxonomyDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.TaxonomyDto>(
      adminEndpoints.createTaxonomy(kind, input),
      options,
    ),
  updateTaxonomy: (
    api: ApiClient,
    kind: catalog.TaxonomyKind,
    id: string,
    input: Partial<catalog.SaveTaxonomyDto>,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.TaxonomyDto>(
      adminEndpoints.updateTaxonomy(kind, id, input),
      options,
    ),
  locations: (
    api: ApiClient,
    kind: catalog.GeographyKind,
    parentId?: string,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.PlaceDto[]>(
      adminEndpoints.locations(kind, parentId),
      options,
    ),
  createLocation: (
    api: ApiClient,
    input: catalog.CreatePlaceDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.PlaceDto>(
      adminEndpoints.createLocation(input),
      options,
    ),
  updateLocation: (
    api: ApiClient,
    kind: catalog.GeographyKind,
    id: string,
    input: { name: string },
    options: RequestOptions = {},
  ) =>
    api.request<catalog.PlaceDto>(
      adminEndpoints.updateLocation(kind, id, input),
      options,
    ),
  reviews: (
    api: ApiClient,
    filters: dto.ModerationFiltersDto = {},
    options: RequestOptions = {},
  ) =>
    api.request<dto.AdminReviewDto[]>(adminEndpoints.reviews(filters), options),
  moderateReview: (
    api: ApiClient,
    id: string,
    input: dto.ModerateReviewDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.ReviewDto>(
      adminEndpoints.moderateReview(id, input),
      options,
    ),
};
