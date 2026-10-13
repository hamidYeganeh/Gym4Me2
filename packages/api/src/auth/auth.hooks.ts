"use client";
import type * as dto from "./auth.dto";
import { authClients } from "./auth.clients";
import { authKeys } from "./auth.keys";
import { useApiQuery, useApiMutation } from "../query";

export function usePasswordLogin() {
  return useApiMutation(
    (api, input: dto.PasswordLoginDto) => authClients.passwordLogin(api, input),
    [],
    true,
  );
}
export function usePasswordStatus() {
  return useApiQuery(
    (scope) => [...scope, "auth", "password"],
    (api, signal) => authClients.passwordStatus(api, { signal }),
  );
}
export function useSetPassword() {
  return useApiMutation(
    (api, input: dto.SetPasswordDto) => authClients.setPassword(api, input),
    [],
    true,
  );
}
export function useSessions() {
  return useApiQuery(
    (scope) => authKeys(scope).sessions(),
    (api, signal) => authClients.sessions(api, { signal }),
  );
}
export function useRequestOtp() {
  return useApiMutation(
    (api, input: dto.RequestOtpDto) => authClients.requestOtp(api, input),
    [],
  );
}
export function useVerifyOtp() {
  return useApiMutation(
    (api, input: dto.VerifyOtpDto) => authClients.verifyOtp(api, input),
    [],
    true,
  );
}
export function useLogout() {
  return useApiMutation((api) => authClients.logout(api), [], true);
}
export function useRevokeSession() {
  return useApiMutation(
    (api, input: { id: string }) => authClients.revokeSession(api, input.id),
    [],
    true,
  );
}
