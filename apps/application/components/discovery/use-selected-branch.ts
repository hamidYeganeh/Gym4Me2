"use client";
import { useSyncExternalStore } from "react";
const event = "gym4me:branch-selection";
function subscribe(listener: () => void) {
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}
export function useSelectedBranch(club: string) {
  const key = `gym4me:branch:${club}`;
  const branch = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(key) ?? undefined;
      } catch {
        return undefined;
      }
    },
    () => undefined,
  );
  return [
    branch,
    (id: string) => {
      try {
        sessionStorage.setItem(key, id);
      } catch {
        /* Storage may be unavailable. */
      }
      window.dispatchEvent(new Event(event));
    },
  ] as const;
}
