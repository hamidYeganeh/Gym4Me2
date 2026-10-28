"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
function getBase() {
  return process.env.NEXT_PUBLIC_NATIVE_EXPORT === "true"
    ? (process.env.NEXT_PUBLIC_SITE_URL ?? "")
    : (process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin);
}
export function useClubUrl(clubId: string, _branchId?: string) {
  const base = useSyncExternalStore(
    subscribe,
    getBase,
    () => process.env.NEXT_PUBLIC_SITE_URL ?? "",
  );
  if (!base) return "";
  const url = new URL(`/discovery/clubs/${encodeURIComponent(clubId)}`, base);

  return url.href;
}
