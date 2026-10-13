import type { ApiScope } from "../transport";
export const authKeys = (scope: ApiScope) => ({
  all: [...scope, "auth"] as const,
  sessions: () => [...scope, "auth", "sessions"] as const,
});
