"use client";
import { useApiMutation, useApiQuery } from "../query";
export type DataPolicyDto = {
  version: string;
  minimumAge: number;
  backupRetentionDays: number;
  deletionGraceDays: number;
  otpRetentionDays: number;
  sessionRetentionDays: number;
  invitationRetentionDays: number;
  auditRetentionDays: number;
};
export type PrivacyDto = {
  policy: DataPolicyDto;
  marketingConsent: boolean;
  profilePublic: boolean;
  acceptedAt: string | null;
  acceptanceRequired: boolean;
  canRequestDeletion: boolean;
  deletion: {
    status: "pending" | "cancelled" | "processed";
    requestedAt: string;
    eligibleAfter: string;
    processedAt: string | null;
  } | null;
};
export type UpdatePrivacyDto = {
  policyVersion?: string;
  acceptPolicy?: true;
  confirmMinimumAge?: true;
  marketingConsent?: boolean;
  hidePublicProfile?: true;
};
export function useDataPolicy() {
  return useApiQuery(
    (scope) => [...scope, "system", "policy"],
    (api, signal) =>
      api.request<DataPolicyDto>(
        { method: "GET", path: "system/policy" },
        { signal },
      ),
    true,
    0,
  );
}
export function usePrivacy(enabled = true) {
  return useApiQuery(
    (scope) => [...scope, "profile", "privacy"],
    (api, signal) =>
      api.request<PrivacyDto>(
        { method: "GET", path: "profile/account/privacy" },
        { signal },
      ),
    enabled,
    0,
  );
}
export function useUpdatePrivacy() {
  return useApiMutation(
    (api, input: UpdatePrivacyDto) =>
      api.request<PrivacyDto>({
        method: "POST",
        path: "profile/account/privacy/preferences",
        body: input,
      }),
    [["profile"]],
  );
}
export function useExportAccount() {
  return useApiMutation(
    (api) =>
      api.request<Record<string, unknown>>({
        method: "GET",
        path: "profile/account/privacy/export",
      }),
    [],
  );
}
export function useRequestDeletion() {
  return useApiMutation(
    (api) =>
      api.request<PrivacyDto>({
        method: "POST",
        path: "profile/account/privacy/deletion",
        body: { confirm: true },
      }),
    [["profile"], ["catalog"]],
  );
}
export function useCancelDeletion() {
  return useApiMutation(
    (api) =>
      api.request<PrivacyDto>({
        method: "POST",
        path: "profile/account/privacy/deletion/cancel",
      }),
    [["profile"], ["catalog"]],
  );
}
