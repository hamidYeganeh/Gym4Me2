import type { ApiScope } from "../transport";
export const adminKeys = (scope: ApiScope) => ({
  all: [...scope, "admin"] as const,
  overview: () => [...scope, "admin", "overview"] as const,
  users: (filters: object = {}) =>
    [...scope, "admin", "users", filters] as const,
  user: (id: string | undefined) => [...scope, "admin", "user", id] as const,
  organizations: (filters: object = {}) =>
    [...scope, "admin", "organizations", filters] as const,
  organization: (id: string | undefined) =>
    [...scope, "admin", "organization", id] as const,
  club: (id: string | undefined) => [...scope, "admin", "clubs", id] as const,
  readiness: (id: string | undefined) =>
    [...scope, "admin", "readiness", id] as const,
  branch: (id: string | undefined, branchId: string | undefined) =>
    [...scope, "admin", "clubs", id, "branches", branchId] as const,
  audit: (filters: object = {}) =>
    [...scope, "admin", "audit", filters] as const,
  taxonomies: (kind: string, filters: object = {}) =>
    [...scope, "admin", "taxonomies", kind, filters] as const,
  locations: (kind: string, parentId?: string) =>
    [...scope, "admin", "locations", kind, parentId] as const,
  reviews: (filters: object = {}) =>
    [...scope, "admin", "reviews", filters] as const,
});
