"use client";
import { useApiQuery } from "./query";
export { pushWorkerMessage, PUSH_SCOPE } from "./push-local";
export type PushDeviceStatus = {
  enabled: boolean;
  publicKey: string | null;
  subscriptionId: string | null;
};
export function usePushDevice() {
  return useApiQuery(
    (scope) => [...scope, "push-device"],
    (api, signal) =>
      api.request<PushDeviceStatus>(
        { path: "profile/push", method: "GET" },
        { signal },
      ),
  );
}
