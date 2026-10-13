import type { ApiScope } from "../transport";
export const businessKeys = (scope: ApiScope) => ({
  all: [...scope, "business"] as const,
  organizations: () => [...scope, "business", "organizations"] as const,
  branches: (id: string | undefined) =>
    [...scope, "business", "branches", id] as const,
  team: (id: string | undefined) => [...scope, "business", "team", id] as const,
  club: (id: string | undefined) =>
    [...scope, "business", "clubs", id] as const,
  readiness: (id: string | undefined) =>
    [...scope, "business", "readiness", id] as const,
  clubBranch: (id: string | undefined, branchId: string | undefined) =>
    [...scope, "business", "clubs", id, "branches", branchId] as const,
});
