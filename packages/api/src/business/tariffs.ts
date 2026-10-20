"use client";
import type { TariffInputDto } from "../catalog/catalog.dto";
import { useApiMutation, useApiQuery } from "../query";
import { businessClients } from "./business.clients";
export function useBusinessTariffs(id: string) {
  return useApiQuery(
    (scope) => [...scope, "business", "tariffs", id],
    (api, signal) => businessClients.tariffs(api, id, { signal }),
    Boolean(id),
  );
}
export function useTariffHistory(id: string, tariffId?: string, page = 1) {
  return useApiQuery(
    (scope) => [...scope, "business", "tariffs", id, "history", tariffId, page],
    (api, signal) =>
      businessClients.tariffHistory(api, id, tariffId ?? "", page, { signal }),
    Boolean(id && tariffId),
  );
}
export function useSaveTariff() {
  return useApiMutation(
    (
      api,
      input: { id: string } & (
        | { tariffId: string; input: TariffInputDto & { reason: string } }
        | {
            tariffId?: undefined;
            input: TariffInputDto & { branchId?: string | null };
          }
      ),
    ) =>
      input.tariffId !== undefined
        ? businessClients.reviseTariff(
            api,
            input.id,
            input.tariffId,
            input.input,
          )
        : businessClients.createTariff(api, input.id, input.input),
    [["business"], ["catalog"], ["admin"]],
  );
}
export function useSetTariffStatus() {
  return useApiMutation(
    (
      api,
      input: {
        id: string;
        tariffId: string;
        isActive: boolean;
        reason: string;
      },
    ) =>
      businessClients.setTariffStatus(api, input.id, input.tariffId, {
        isActive: input.isActive,
        reason: input.reason,
      }),
    [["business"], ["catalog"], ["admin"]],
  );
}
