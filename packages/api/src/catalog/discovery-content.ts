"use client";
import { useApiQuery, useApiMutation } from "../query";
export type DiscoveryPage = "home" | "clubs" | "coaches" | "classes" | "map";
export type DiscoveryContent = {
  page: DiscoveryPage;
  title: string;
  subtitle: string;
  carouselType: "single" | "carousel" | "grid";
  imageRatio: "16/9" | "4/3" | "1/1" | "3/4";
  position: number;
  published: boolean;
  slides: { title: string; subtitle: string; image: string; href: string }[];
};
export type DiscoveryContentRow = {
  id: string;
  config: DiscoveryContent;
  revision: number;
};
export function useDiscoveryContent(page?: DiscoveryPage, admin = false) {
  return useApiQuery(
    (scope) => [...scope, "discovery-content", admin, page],
    (api, signal) =>
      api.request<DiscoveryContentRow[]>(
        {
          method: "GET",
          path: admin ? "admin/discovery-content" : "catalog/discovery-content",
          query: page ? { page } : {},
        },
        { signal },
      ),
    admin || Boolean(page),
  );
}
export function useSaveDiscoveryContent() {
  return useApiMutation(
    (
      api,
      value: {
        id?: string;
        revision?: number;
        content?: DiscoveryContent;
        deleted?: boolean;
      },
    ) =>
      api.request({
        method: value.id ? "PATCH" : "POST",
        path: `admin/discovery-content${value.id ? `/${value.id}` : ""}`,
        body: value.id
          ? {
              revision: value.revision,
              content: value.content,
              deleted: value.deleted,
            }
          : value.content,
      }),
    [["discovery-content"]],
  );
}
