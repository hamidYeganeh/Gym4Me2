"use client";
import { useApiQuery } from "../query";
export function useMediaPreview(clubId: string, mediaId: string) {
  return useApiQuery((scope) => [...scope, "media-preview", clubId, mediaId], (api, signal) => api.request<{ url: string; expiresIn: number | null }>({ method: "GET", path: `${api.scope[2] === "admin" ? "admin" : "business"}/clubs/${encodeURIComponent(clubId)}/media/${encodeURIComponent(mediaId)}/preview` }, { signal }), Boolean(clubId && mediaId), 30_000);
}
