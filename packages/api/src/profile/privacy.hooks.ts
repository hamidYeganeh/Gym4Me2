"use client";
import { useApiMutation, useApiQuery } from "../query";
import type { UpdatePrivacyDto } from "./profile.dto";
export type {
  DataPolicyDto,
  PrivacyDto,
  UpdatePrivacyDto,
} from "./profile.dto";
import { profileClients } from "./profile.clients";
import { systemClients } from "../system/system.clients";
export function useDataPolicy() {
  return useApiQuery(
    (scope) => [...scope, "system", "policy"],
    (api, signal) => systemClients.policy(api, { signal }),
    true,
    0,
  );
}
export function usePrivacy(enabled = true) {
  return useApiQuery(
    (scope) => [...scope, "profile", "privacy"],
    (api, signal) => profileClients.privacy(api, { signal }),
    enabled,
    0,
  );
}
export function useUpdatePrivacy() {
  return useApiMutation(
    (api, input: UpdatePrivacyDto) => profileClients.updatePrivacy(api, input),
    [["profile"]],
  );
}
export function useExportAccount() {
  return useApiMutation((api) => profileClients.exportAccount(api), []);
}
export function useRequestDeletion() {
  return useApiMutation(
    (api) => profileClients.requestDeletion(api),
    [["profile"], ["catalog"]],
  );
}
export function useCancelDeletion() {
  return useApiMutation(
    (api) => profileClients.cancelDeletion(api),
    [["profile"], ["catalog"]],
  );
}
