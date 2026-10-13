import type { ApiScope } from "../transport";
export const catalogKeys = (scope: ApiScope) => ({
  all: [...scope, "catalog"] as const,
  clubs: (filters: object = {}) =>
    [...scope, "catalog", "clubs", filters] as const,
  club: (id: string | undefined) => [...scope, "catalog", "club", id] as const,
  branch: (id: string | undefined, branchId: string | undefined) =>
    [...scope, "catalog", "club", id, "branches", branchId] as const,
  taxonomies: (kind: string, filters: object = {}) =>
    [...scope, "catalog", "taxonomies", kind, filters] as const,
  locations: (kind: string, parentId?: string) =>
    [...scope, "catalog", "locations", kind, parentId] as const,
  reviews: (
    id: string | undefined,
    branchId: string | undefined,
    filters: object = {},
  ) => [...scope, "catalog", "reviews", id, branchId, filters] as const,
});
