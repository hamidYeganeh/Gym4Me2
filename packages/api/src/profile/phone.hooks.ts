"use client";
import { useApiMutation } from "../query";
import { profileClients } from "./profile.clients";
import type { RequestOtpDto, VerifyOtpDto } from "../auth/auth.dto";
export function useRequestPhoneChange() {
  return useApiMutation(
    (api, input: RequestOtpDto) =>
      profileClients.requestPhoneChange(api, input),
    [],
  );
}
export function useVerifyPhoneChange() {
  return useApiMutation(
    (api, input: VerifyOtpDto) => profileClients.verifyPhoneChange(api, input),
    [],
    true,
  );
}
