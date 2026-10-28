"use client";
import { useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApiContext } from "./provider";
import type { ApiClient } from "./transport";
import { catalogClients } from "./catalog/catalog.clients";
import { catalogKeys } from "./catalog/catalog.keys";
import type { CoachDetailDto } from "./profile/practice";
import type { ServiceDto } from "./sports";

export type PublicDetailTarget = {
  kind: "club" | "coach" | "class";
  id: string;
  view?: string;
};
const valid = (id: string | undefined): id is string =>
  !!id && /^[a-z0-9-]{3,120}$/.test(id);
/** Match only public reading routes. Never prefetch checkout, account actions or mutations. */
export function publicDetailTarget(href: string): PublicDetailTarget | null {
  let url: URL;
  try {
    url = new URL(href, "https://prefetch.invalid");
  } catch {
    return null;
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "discovery" && parts[1] === "clubs" && valid(parts[2])) {
    if (parts[3] === "classess" && valid(parts[4]) && parts.length === 5)
      return { kind: "class", id: parts[4] };
    if (
      parts.length === 3 ||
      (parts.length === 4 &&
        ["gallery", "reviews", "slots", "classess"].includes(parts[3]!))
    )
      return { kind: "club", id: parts[2], view: parts[3] };
  }
  if (
    parts[0] === "club" &&
    valid(parts[1]) &&
    parts[2] === "classes" &&
    parts.length === 3
  )
    return { kind: "club", id: parts[1], view: "classess" };
  if (
    parts[0] === "discovery" &&
    ["coaches", "classes"].includes(parts[1] ?? "") &&
    parts.length === 3 &&
    valid(parts[2])
  )
    return { kind: parts[1] === "coaches" ? "coach" : "class", id: parts[2] };
  const id = url.searchParams.get("id") ?? undefined;
  if (valid(id) && url.pathname === "/discovery/club")
    return {
      kind: "club",
      id,
      view: url.searchParams.get("view") ?? undefined,
    };
  if (valid(id) && url.pathname === "/services/detail")
    return { kind: "class", id };
  if (valid(id) && url.pathname === "/coaches/detail")
    return { kind: "coach", id };
  return null;
}

/** Use the exact same scoped keys as the consuming hooks so navigation can render synchronously. */
export async function prefetchPublicDetail(
  api: ApiClient,
  client: QueryClient,
  target: PublicDetailTarget,
) {
  const read = <T>(
    key: readonly unknown[],
    path: string,
    query?: Record<string, string>,
  ) =>
    client.fetchQuery<T>({
      queryKey: key,
      queryFn: ({ signal }) =>
        api.request<T>({ method: "GET", path, query }, { signal }),
      staleTime: 30_000,
      retry: false,
    });
  if (target.kind === "class") {
    await read<ServiceDto>(
      [...api.scope, "sports", `sports/services/${target.id}`, {}],
      `sports/services/${target.id}`,
    );
    return;
  }
  if (target.kind === "coach") {
    // The named illustrative profiles are static routes and have no corresponding API record.
    if (!/^(coach|affiliate)-[a-f0-9]{32}$/.test(target.id)) return;
    const path = `coaching/directory/${target.id}`;
    await read<CoachDetailDto>([...api.scope, "coaching", path, {}], path, {});
    return;
  }
  const keys = catalogKeys(api.scope);
  const club = await client.fetchQuery({
    queryKey: keys.club(target.id),
    queryFn: ({ signal }) => catalogClients.club(api, target.id, { signal }),
    staleTime: 30_000,
    retry: false,
  });
  // Internal ID and public slug represent the same record; branch hooks use the internal ID.
  for (const id of [club.id, club.slug])
    if (id !== target.id) client.setQueryData(keys.club(id), club);
  const branch = club.branches.find((item) => item.isMain) ?? club.branches[0];
  if (branch)
    await client.prefetchQuery({
      queryKey: keys.branch(club.id, branch.id),
      queryFn: ({ signal }) =>
        catalogClients.branch(api, club.id, branch.id, { signal }),
      staleTime: 30_000,
      retry: false,
    });
  if (target.view === "classess")
    await read<ServiceDto[]>(
      [
        ...api.scope,
        "sports",
        "sports/services",
        {
          q: "",
          sportId: undefined,
          kind: "class",
          organizationId: club.id,
          branchId: undefined,
        },
      ],
      "sports/services",
      { organizationId: club.id, kind: "class", q: "" },
    );
}
export function usePublicDetailPrefetch() {
  const { api } = useApiContext();
  const client = useQueryClient();
  return useCallback(
    (target: PublicDetailTarget) => prefetchPublicDetail(api, client, target),
    [api, client],
  );
}
