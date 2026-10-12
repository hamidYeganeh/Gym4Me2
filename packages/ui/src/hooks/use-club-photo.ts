"use client";
import { useSyncExternalStore } from "react";

// Keep both ends of a shared-image transition on the same gallery image.
const selections = new Map<string, number>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useClubPhoto(clubId: string) {
  const index = useSyncExternalStore(
    subscribe,
    () => selections.get(clubId) ?? 0,
    () => 0,
  );
  return [
    index,
    (value: number) => {
      selections.set(clubId, value);
      listeners.forEach((listener) => listener());
    },
  ] as const;
}
