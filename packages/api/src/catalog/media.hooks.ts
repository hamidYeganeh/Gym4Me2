"use client";
import { useApiQuery } from "../query";
import { businessClients } from "../business/business.clients";
import { adminClients } from "../admin/admin.clients";
export function useMediaPreview(clubId: string, mediaId: string) {
  return useApiQuery(
    (scope) => [...scope, "media-preview", clubId, mediaId],
    (api, signal) =>
      (api.scope[2] === "admin" ? adminClients : businessClients).mediaPreview(
        api,
        clubId,
        mediaId,
        { signal },
      ),
    Boolean(clubId && mediaId),
    30_000,
  );
}
