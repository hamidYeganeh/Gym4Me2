"use client";
import type { TariffDto, TariffInputDto } from "../catalog/catalog.dto";
import { useApiMutation, useApiQuery } from "../query";
const base = (id: string) => `business/clubs/${encodeURIComponent(id)}/tariffs`;
export function useBusinessTariffs(id: string) {
  return useApiQuery(
    (scope) => [...scope, "business", "tariffs", id],
    (api, signal) =>
      api.request<TariffDto[]>({ method: "GET", path: base(id) }, { signal }),
    Boolean(id),
  );
}
export function useTariffHistory(id: string, tariffId?: string, page = 1) {
  return useApiQuery(
    (scope) => [...scope, "business", "tariffs", id, "history", tariffId, page],
    (api, signal) =>
      api.request<TariffDto[]>(
        {
          method: "GET",
          path: `${base(id)}/${encodeURIComponent(tariffId ?? "")}/versions`,
          query: { page },
        },
        { signal },
      ),
    Boolean(id && tariffId),
  );
}
export function useSaveTariff() {
  return useApiMutation(
    (
      api,
      input: {
        id: string;
        tariffId?: string;
        input: TariffInputDto & { branchId?: string | null };
      },
    ) =>
      api.request<TariffDto>({
        method: "POST",
        path: input.tariffId
          ? `${base(input.id)}/${encodeURIComponent(input.tariffId)}/versions`
          : base(input.id),
        body: input.input,
      }),
    [["business"], ["catalog"], ["admin"]],
  );
}
export function useSetTariffStatus() {
  return useApiMutation(
    (api, input: { id: string; tariffId: string; isActive: boolean }) =>
      api.request<{ id: string; isActive: boolean }>({
        method: "POST",
        path: `${base(input.id)}/${encodeURIComponent(input.tariffId)}/status`,
        body: { isActive: input.isActive },
      }),
    [["business"], ["catalog"], ["admin"]],
  );
}
