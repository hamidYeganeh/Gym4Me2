import type * as dto from "./admin.dto";
import type * as catalog from "../catalog/catalog.dto";
import { resourceId, type ApiRequest } from "../transport";
export const adminEndpoints = {
  overview: (): ApiRequest => ({ method: "GET", path: "admin/overview" }),
  users: (filters: dto.AdminUserFiltersDto = {}): ApiRequest => ({
    method: "GET",
    path: "admin/users",
    query: filters,
  }),
  user: (id: string): ApiRequest => ({
    method: "GET",
    path: `admin/users/${resourceId(id)}`,
  }),
  setUserStatus: (id: string, input: dto.UserStatusDto): ApiRequest => ({
    method: "PATCH",
    path: `admin/users/${resourceId(id)}/status`,
    body: input,
  }),
  organizations: (
    filters: dto.AdminOrganizationFiltersDto = {},
  ): ApiRequest => ({
    method: "GET",
    path: "admin/organizations",
    query: filters,
  }),
  organization: (id: string): ApiRequest => ({
    method: "GET",
    path: `admin/organizations/${resourceId(id)}`,
  }),
  reviewOrganization: (
    id: string,
    input: dto.OrganizationDecisionDto,
  ): ApiRequest => ({
    method: "POST",
    path: `admin/organizations/${resourceId(id)}/review`,
    body: input,
  }),
  audit: (filters: dto.AuditFiltersDto = {}): ApiRequest => ({
    method: "GET",
    path: "admin/audit",
    query: filters,
  }),
  club: (id: string): ApiRequest => ({
    method: "GET",
    path: `admin/clubs/${resourceId(id)}`,
  }),
  readiness: (id: string): ApiRequest => ({
    method: "GET",
    path: `admin/clubs/${resourceId(id)}/readiness`,
  }),
  branch: (id: string, branchId: string): ApiRequest => ({
    method: "GET",
    path: `admin/clubs/${resourceId(id)}/branches/${resourceId(branchId)}`,
  }),
  reviewClub: (id: string, input: dto.OrganizationDecisionDto): ApiRequest => ({
    method: "POST",
    path: `admin/clubs/${resourceId(id)}/review`,
    body: input,
  }),
  taxonomies: (
    kind: catalog.TaxonomyKind,
    filters: dto.TaxonomyFiltersDto = {},
  ): ApiRequest => ({
    method: "GET",
    path: `admin/taxonomies/${kind}`,
    query: filters,
  }),
  createTaxonomy: (
    kind: catalog.TaxonomyKind,
    input: catalog.SaveTaxonomyDto,
  ): ApiRequest => ({
    method: "POST",
    path: `admin/taxonomies/${kind}`,
    body: input,
  }),
  updateTaxonomy: (
    kind: catalog.TaxonomyKind,
    id: string,
    input: Partial<catalog.SaveTaxonomyDto>,
  ): ApiRequest => ({
    method: "PATCH",
    path: `admin/taxonomies/${kind}/${resourceId(id)}`,
    body: input,
  }),
  locations: (kind: catalog.GeographyKind, parentId?: string): ApiRequest => ({
    method: "GET",
    path: `admin/locations/${kind}`,
    query: { parentId },
  }),
  createLocation: (input: catalog.CreatePlaceDto): ApiRequest => ({
    method: "POST",
    path: "admin/locations",
    body: input,
  }),
  updateLocation: (
    kind: catalog.GeographyKind,
    id: string,
    input: { name: string },
  ): ApiRequest => ({
    method: "PATCH",
    path: `admin/locations/${kind}/${resourceId(id)}`,
    body: input,
  }),
  reviews: (filters: dto.ModerationFiltersDto = {}): ApiRequest => ({
    method: "GET",
    path: "admin/reviews",
    query: filters,
  }),
  moderateReview: (id: string, input: dto.ModerateReviewDto): ApiRequest => ({
    method: "POST",
    path: `admin/reviews/${resourceId(id)}/moderate`,
    body: input,
  }),
};
