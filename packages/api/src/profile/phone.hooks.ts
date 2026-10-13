"use client";
import { useApiMutation } from "../query";
import type {
  OtpChallengeDto,
  RequestOtpDto,
  VerifyOtpDto,
  SuccessDto,
} from "../auth/auth.dto";
export function useRequestPhoneChange() {
  return useApiMutation(
    (api, input: RequestOtpDto) =>
      api.request<OtpChallengeDto>({
        method: "POST",
        path: "profile/account/phone/request",
        body: input,
      }),
    [],
  );
}
export function useVerifyPhoneChange() {
  return useApiMutation(
    (api, input: VerifyOtpDto) =>
      api.request<SuccessDto>({
        method: "POST",
        path: "profile/account/phone/verify",
        body: input,
      }),
    [],
    true,
  );
}
