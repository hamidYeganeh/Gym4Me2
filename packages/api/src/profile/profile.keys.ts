import type { ApiScope } from "../transport";
export const profileKeys = (scope: ApiScope) => ({
  all: [...scope, "profile"] as const,
  account: () => [...scope, "profile", "account"] as const,
  access: () => [...scope, "profile", "access"] as const,
  invitations: () => [...scope, "profile", "invitations"] as const,
  affiliations: () => [...scope, "profile", "affiliations"] as const,
});
