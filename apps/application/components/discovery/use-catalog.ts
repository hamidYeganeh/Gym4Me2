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
import { availableCatalogData } from "../../lib/catalog-data";

export function useCatalogClubs(
  filters: ClubFiltersDto = {},
  savedOnly = false,
  guestIds?: string[],
) {
  const locale = useLocale();
  const query = useClubs(filters, savedOnly, guestIds);
  const data = availableCatalogData(query.data, query.error);
  const clubs = useMemo(
    () => (data ?? []).map((club) => summaryView(club, locale)),
    [data, locale],
  );
  return { ...query, data, clubs };
}
export function useCatalogClub(id: string, branchId?: string) {
  const locale = useLocale();
  const query = useClub(id);
  const data = availableCatalogData(query.data, query.error);
  const main =
    data?.branches.find((branch) => branch.id === branchId) ??
    data?.branches.find((branch) => branch.isMain) ??
    data?.branches[0];
  const branch = useClubBranch(id, main?.id);
  const branchData = availableCatalogData(branch.data, branch.error);
  const club = useMemo(
    () => (data ? detailView(data, branchData, locale) : undefined),
    [data, branchData, locale],
  );
  return {
    ...query,
    data,
    club,
    selectedBranchId: main?.id,
    branch: branchData,
    branchQuery: branch,
  };
}
