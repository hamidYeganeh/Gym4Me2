import type * as dto from "./catalog.dto";
import { resourceId, type ApiRequest } from "../transport";
export const catalogEndpoints = {
  clubs: (filters: dto.ClubFiltersDto = {}): ApiRequest => ({
    method: "GET",
    path: "catalog/clubs",
    query: filters,
  }),
  club: (id: string): ApiRequest => ({
    method: "GET",
    path: `catalog/clubs/${resourceId(id)}`,
  }),
  branch: (id: string, branchId: string): ApiRequest => ({
    method: "GET",
    path: `catalog/clubs/${resourceId(id)}/branches/${resourceId(branchId)}`,
  }),
  taxonomies: (
    kind: dto.TaxonomyKind,
    filters: dto.PageDto = {},
  ): ApiRequest => ({
    method: "GET",
    path: `catalog/taxonomies/${kind}`,
    query: filters,
  }),
  locations: (
    kind: dto.GeographyKind,
    parentId?: string,
    page = 1,
  ): ApiRequest => ({
    method: "GET",
    path: `catalog/locations/${kind}`,
    query: { parentId, page },
  }),
  reviews: (
    id: string,
    branchId: string,
    filters: dto.PageDto = {},
  ): ApiRequest => ({
    method: "GET",
    path: `catalog/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/reviews`,
    query: filters,
  }),
  createReview: (
    id: string,
    branchId: string,
    input: dto.CreateReviewDto,
  ): ApiRequest => ({
    method: "POST",
    path: `catalog/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/reviews`,
    body: input,
  }),
};
