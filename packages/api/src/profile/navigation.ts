"use client";
import { useApiQuery } from "../query";

export type ProductNavigation = {
  canCoach: boolean;
  documents: boolean;
  waiting: boolean;
  messages: boolean;
  family: boolean;
  programHistory: boolean;
  teamInvites: boolean;
  manage: boolean;
  operate: boolean;
  finance: boolean;
  businessReady: boolean;
  multipleBranches: boolean;
};

export function useProductNavigation(enabled = true, business = false) {
  return useApiQuery(
    (scope) => [...scope, business ? "business" : "sports", "navigation"],
    (api, signal) =>
      api.request<ProductNavigation>(
        { method: "GET", path: "profile/navigation" },
        { signal },
      ),
    enabled,
    0,
  );
}
