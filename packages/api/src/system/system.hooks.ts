"use client";
import { systemClients } from "./system.clients";
import { systemKeys } from "./system.keys";
import { useApiQuery } from "../query";

export function useHealth(enabled = true) {
  return useApiQuery(
    (scope) => systemKeys(scope).health(),
    (api, signal) => systemClients.health(api, { signal }),
    enabled,
    0,
    true,
  );
}
export function useReadiness(enabled = true) {
  return useApiQuery(
    (scope) => systemKeys(scope).readiness(),
    (api, signal) => systemClients.readiness(api, { signal }),
    enabled,
    0,
    true,
  );
}
export function useApiDocs(enabled = true) {
  return useApiQuery(
    (scope) => systemKeys(scope).docs(),
    (api, signal) => systemClients.docs(api, { signal }),
    enabled,
  );
}
