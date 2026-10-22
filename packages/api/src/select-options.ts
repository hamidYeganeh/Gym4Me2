"use client";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useApiContext } from "./provider";
import type { ApiClient } from "./transport";
import {
  filterSelectOptions,
  pageSelectOptions,
  mergeSelectOptions,
  type SearchableOption,
} from "./select-options-model";
export {
  filterSelectOptions,
  pageSelectOptions,
  mergeSelectOptions,
  normalizeOptionSearch,
} from "./select-options-model";
export type { SearchableOption } from "./select-options-model";

export type SelectOptionPage<T> = { items: T[]; nextPage?: number };
export type SelectOptionsSource<T> = {
  key: readonly unknown[];
  resolve?: (
    api: ApiClient,
    values: string[],
    signal: AbortSignal,
  ) => Promise<T[]>;
  loadPage: (
    api: ApiClient,
    request: {
      search: string;
      page: number;
      pageSize: number;
      signal: AbortSignal;
    },
  ) => Promise<SelectOptionPage<T>>;
};

/** Each picker has scoped, cancellable pages; a search or dependency change starts at page one. */
export function useSelectOptions<T extends SearchableOption>({
  options,
  source,
  search,
  enabled,
  id,
  pageSize = 25,
  selectedValues = [],
}: {
  options: T[];
  source?: SelectOptionsSource<T>;
  search: string;
  enabled: boolean;
  id: string;
  pageSize?: number;
  selectedValues?: string[];
}) {
  const { api } = useApiContext();
  const size = Math.max(1, Math.min(100, Math.floor(pageSize) || 25));
  const client = useQueryClient();
  const selected = useQuery({
    queryKey: [
      ...api.scope,
      "select-options-selected",
      source?.key ?? id,
      selectedValues,
    ],
    queryFn: ({ signal }) =>
      source?.resolve
        ? source.resolve(api, selectedValues, signal)
        : Promise.resolve([] as T[]),
    enabled: Boolean(source?.resolve && selectedValues.length),
  });
  const cached = source
    ? client
        .getQueriesData<{ pages: { items: T[] }[] }>({
          queryKey: [...api.scope, "select-options", source.key],
        })
        .flatMap(([, data]) => data?.pages ?? [])
    : [];
  const matches = filterSelectOptions(options, search);
  const result = useInfiniteQuery({
    queryKey: [
      ...api.scope,
      "select-options",
      source
        ? source.key
        : [
            id,
            options.map(
              ({ value, label, subtitle, keywords, group, disabled }) => ({
                value,
                label,
                subtitle,
                keywords,
                group,
                disabled,
              }),
            ),
          ],
      search,
      size,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      source
        ? source.loadPage(api, {
            search,
            page: pageParam,
            pageSize: size,
            signal,
          })
        : Promise.resolve(pageSelectOptions(matches, pageParam, size)),
    getNextPageParam: (lastPage, pages, page) => {
      if (
        !lastPage.nextPage ||
        lastPage.nextPage <= page ||
        !lastPage.items.length
      )
        return undefined;
      const previous = new Set(
        pages.slice(0, -1).flatMap((p) => p.items.map((item) => item.value)),
      );
      return lastPage.items.some((item) => !previous.has(item.value))
        ? lastPage.nextPage
        : undefined;
    },
    enabled,
    // Failed pages remain visible and retry only on an explicit action.
    retry: false,
  });
  return {
    ...result,
    items: mergeSelectOptions(result.data?.pages ?? []),
    selectedItems: mergeSelectOptions([
      { items: selected.data ?? [] },
      ...cached,
    ]),
  };
}
