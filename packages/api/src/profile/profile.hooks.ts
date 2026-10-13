"use client";
import type * as dto from "./profile.dto";
import { profileClients } from "./profile.clients";
import { profileKeys } from "./profile.keys";
import { useApiQuery, useApiMutation } from "../query";

export function useAccount() {
  return useApiQuery(
    (scope) => profileKeys(scope).account(),
    (api, signal) => profileClients.account(api, { signal }),
    true,
    0,
  );
}
export function useAccess(enabled = true) {
  return useApiQuery(
    (scope) => profileKeys(scope).access(),
    (api, signal) => profileClients.access(api, { signal }),
    enabled,
    0,
  );
}
export function useInvitations() {
  return useApiQuery(
    (scope) => profileKeys(scope).invitations(),
    (api, signal) => profileClients.invitations(api, { signal }),
  );
}
export function useCoachAffiliations() {
  return useApiQuery(
    (scope) => profileKeys(scope).affiliations(),
    (api, signal) => profileClients.affiliations(api, { signal }),
  );
}
export function useUpdateAccount() {
  return useApiMutation(
    (api, input: dto.UpdateAccountDto) =>
      profileClients.updateAccount(api, input),
    [["profile"], ["admin", "users"]],
  );
}
export function useAcceptInvitation() {
  return useApiMutation(
    (api, input: { id: string }) =>
      profileClients.acceptInvitation(api, input.id),
    [["profile"], ["business", "organizations"]],
  );
}
export function useUpdateCoach() {
  return useApiMutation(
    (api, input: dto.UpdateCoachDto) => profileClients.updateCoach(api, input),
    [["profile"]],
  );
}
export function useRespondAffiliation() {
  return useApiMutation(
    (api, input: { id: string; action: "accept" | "end" }) =>
      profileClients.respondAffiliation(api, input.id, input.action),
    [["profile"], ["catalog", "clubs"], ["admin", "clubs"]],
  );
}
