import type { ApiScope } from "../transport";
export const systemKeys = (scope: ApiScope) => ({
  all: [...scope, "system"] as const,
  health: () => [...scope, "system", "health"] as const,
  readiness: () => [...scope, "system", "readiness"] as const,
  docs: () => [...scope, "system", "docs"] as const,
});
