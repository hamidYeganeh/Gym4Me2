import type * as dto from "./auth.dto";
import { resourceId, type ApiRequest } from "../transport";
export const authEndpoints = {
  passwordLogin: (input: dto.PasswordLoginDto): ApiRequest => ({
    method: "POST",
    path: "auth/password/login",
    body: input,
  }),
  passwordStatus: (): ApiRequest => ({ method: "GET", path: "auth/password" }),
  setPassword: (input: dto.SetPasswordDto): ApiRequest => ({
    method: "POST",
    path: "auth/password",
    body: input,
  }),
  requestOtp: (input: dto.RequestOtpDto): ApiRequest => ({
    method: "POST",
    path: "auth/otp/request",
    body: input,
  }),
  verifyOtp: (input: dto.VerifyOtpDto): ApiRequest => ({
    method: "POST",
    path: "auth/otp/verify",
    body: input,
  }),
  sessions: (): ApiRequest => ({ method: "GET", path: "auth/sessions" }),
  revokeSession: (id: string): ApiRequest => ({
    method: "POST",
    path: `auth/sessions/${resourceId(id)}/revoke`,
  }),
  logout: (): ApiRequest => ({ method: "POST", path: "auth/sessions/logout" }),
};
