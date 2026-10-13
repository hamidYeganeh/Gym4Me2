import type * as dto from "./auth.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { authEndpoints } from "./auth.endpoints";
export const authClients = {
  passwordLogin: (api: ApiClient, input: dto.PasswordLoginDto) =>
    api.request<dto.VerifiedSessionDto>(authEndpoints.passwordLogin(input)),
  passwordStatus: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.PasswordStatusDto>(authEndpoints.passwordStatus(), options),
  setPassword: (api: ApiClient, input: dto.SetPasswordDto) =>
    api.request<dto.SuccessDto>(authEndpoints.setPassword(input)),
  requestOtp: (
    api: ApiClient,
    input: dto.RequestOtpDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.OtpChallengeDto>(authEndpoints.requestOtp(input), options),
  verifyOtp: (
    api: ApiClient,
    input: dto.VerifyOtpDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.VerifiedSessionDto>(
      authEndpoints.verifyOtp(input),
      options,
    ),
  sessions: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.SessionDto[]>(authEndpoints.sessions(), options),
  revokeSession: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<dto.SuccessDto>(authEndpoints.revokeSession(id), options),
  logout: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.SuccessDto>(authEndpoints.logout(), options),
};
