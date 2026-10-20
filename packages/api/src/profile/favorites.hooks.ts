"use client";
import { useApiMutation, useApiQuery } from "../query";
import { profileClients } from "./profile.clients";
export function useFavorites(enabled = true) {
  return useApiQuery(
    (scope) => [...scope, "profile", "favorites"],
    (api, signal) => profileClients.favorites(api, { signal }),
    enabled,
  );
}
export function useSetFavorite() {
  return useApiMutation(
    (api, input: { id: string; saved: boolean }) =>
      profileClients.setFavorite(api, input.id, { saved: input.saved }),
    [["profile", "favorites"], ["catalog"]],
  );
}
export function useMergeFavorites() {
  return useApiMutation(
    (api, ids: string[]) => profileClients.mergeFavorites(api, ids),
    [["profile", "favorites"], ["catalog"]],
  );
}
