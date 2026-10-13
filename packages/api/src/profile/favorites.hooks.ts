"use client";
import { useApiMutation, useApiQuery } from "../query";
export function useFavorites(enabled = true) {
  return useApiQuery(
    (scope) => [...scope, "profile", "favorites"],
    (api, signal) =>
      api.request<string[]>(
        { method: "GET", path: "profile/favorites" },
        { signal },
      ),
    enabled,
  );
}
export function useSetFavorite() {
  return useApiMutation(
    (api, input: { id: string; saved: boolean }) =>
      api.request<string[]>({
        method: "POST",
        path: `profile/favorites/${encodeURIComponent(input.id)}`,
        body: { saved: input.saved },
      }),
    [["profile", "favorites"], ["catalog"]],
  );
}
export function useMergeFavorites() {
  return useApiMutation(
    (api, ids: string[]) =>
      api.request<string[]>({
        method: "POST",
        path: "profile/favorites/merge",
        body: { ids },
      }),
    [["profile", "favorites"], ["catalog"]],
  );
}
