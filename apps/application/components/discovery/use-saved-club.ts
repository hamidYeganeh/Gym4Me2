"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  useAccount,
  useFavorites,
  useMergeFavorites,
  useSetFavorite,
  usePrivacy,
} from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import { toast } from "@repo/ui/kit/Sileo";
import { useRequireAccount } from "../use-require-account";
const eventName = "gym4me:saved-clubs";
const memory = new Map<string, boolean>();
const realId = (id: string) =>
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    id,
  );
const keyOf = (id: string) => `gym4me:club:${id}:saved`;
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(eventName, listener);
  };
}
function guestSaved(id: string) {
  try {
    return localStorage.getItem(keyOf(id)) === "true";
  } catch {
    return memory.get(id) ?? false;
  }
}
function guestIds() {
  const ids = new Set(
    [...memory].filter(([, saved]) => saved).map(([id]) => id),
  );
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const id = key?.match(/^gym4me:club:([a-f0-9-]{36}):saved$/i)?.[1];
      if (id && key && localStorage.getItem(key) === "true") ids.add(id);
    }
  } catch {
    /* Session state remains available without persistent storage. */
  }
  return [...ids].filter(realId).sort().slice(0, 500).join(",");
}
function writeGuest(id: string, saved: boolean) {
  memory.set(id, saved);
  try {
    if (saved) localStorage.setItem(keyOf(id), "true");
    else localStorage.removeItem(keyOf(id));
  } catch {
    /* Session state remains available without persistent storage. */
  }
  window.dispatchEvent(new Event(eventName));
}
export function FavoritesSync() {
  const account = useAccount();
  const privacy = usePrivacy(Boolean(account.data));
  const merge = useMergeFavorites();
  const t = useTranslations("Favorites");
  const snapshot = useSyncExternalStore(subscribe, guestIds, () => "");
  const userId = account.data?.id;
  const ready =
    privacy.data?.acceptanceRequired === false &&
    privacy.data.deletion?.status !== "pending";
  const mergeFavorites = merge.mutateAsync;
  useEffect(() => {
    if (!userId || !snapshot || !ready) return;
    let disposed = false;
    void mergeFavorites(snapshot.split(","))
      .then((saved) => {
        if (!disposed) saved.forEach((id) => writeGuest(id, false));
      })
      .catch(() => {
        if (!disposed) toast.error(t("mergeError"));
      });
    return () => {
      disposed = true;
    };
  }, [userId, snapshot, ready, mergeFavorites, t]);
  return null;
}
export function useSavedClub(id: string) {
  const account = useAccount();
  const favorites = useFavorites(Boolean(account.data));
  const setSaved = useClubSaveCommand();
  const guest = useSyncExternalStore(
    subscribe,
    () => guestSaved(id),
    () => false,
  );
  return [
    account.data ? (favorites.data ?? []).includes(id) : guest,
    (saved: boolean) => setSaved(id, saved),
  ] as const;
}

/** Mount once for a saved list: row mounts must not restart its guest account query. */
export function useSetSavedClub() {
  return useClubSaveCommand();
}

function useClubSaveCommand() {
  const setFavorite = useSetFavorite();
  const requireAccount = useRequireAccount();
  const t = useTranslations("Favorites");
  return async (id: string, saved: boolean) => {
    if (setFavorite.isPending || !(await requireAccount())) return;
    await setFavorite
      .mutateAsync({ id, saved })
      .catch(() => toast.error(t("saveError")));
  };
}
export function useSavedClubIds(ids?: string[]) {
  const account = useAccount();
  const favorites = useFavorites(Boolean(account.data));
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (ids ? ids.filter(guestSaved).join(",") : guestIds()),
    () => "",
  );
  return account.data
    ? (favorites.data ?? []).filter((id) => !ids || ids.includes(id))
    : snapshot
      ? snapshot.split(",")
      : [];
}
