"use client";
import { useMemo } from "react";
import { useLocale } from "@repo/i18n";
import {
  useClub,
  useClubBranch,
  useClubs,
  type ClubFiltersDto,
} from "@repo/api/catalog";
import { detailView, summaryView } from "../../lib/catalog-view";

export function useCatalogClubs(
  filters: ClubFiltersDto = {},
  savedOnly = false,
  guestIds?: string[],
) {
  const locale = useLocale();
  const query = useClubs(filters, savedOnly, guestIds);
  const clubs = useMemo(
    () => (query.data ?? []).map((club) => summaryView(club, locale)),
    [query.data, locale],
  );
  return { ...query, clubs };
}
export function useCatalogClub(id: string, branchId?: string) {
  const locale = useLocale();
  const query = useClub(id);
  const main =
    query.data?.branches.find((branch) => branch.id === branchId) ??
    query.data?.branches.find((branch) => branch.isMain) ??
    query.data?.branches[0];
  const branch = useClubBranch(id, main?.id);
  const club = useMemo(
    () =>
      query.data ? detailView(query.data, branch.data, locale) : undefined,
    [query.data, branch.data, locale],
  );
  return { ...query, club, branch: branch.data, branchQuery: branch };
}
