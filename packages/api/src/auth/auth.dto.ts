import type { ApiApplication } from "../transport";
export type Client = ApiApplication;
export type UserStatus = "active" | "suspended";
export type Account = {
  id: string;
  phone: string;
  displayName: string | null;
  profilePublic?: boolean;
  deletionPending?: boolean;
  status: UserStatus;
  phoneVerifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type PasswordLoginDto = { phone: string; password: string };
export type SetPasswordDto = { password: string };
export type PasswordStatusDto = {
  hasPassword: boolean;
  canSetPassword: boolean;
};
export type RequestOtpDto = { phone: string };
export type OtpChallengeDto = {
  challengeId: string;
  retryAfter: number;
  expiresIn: number;
};
export type VerifyOtpDto = { challengeId: string; code: string };
export type VerifiedSessionDto = { user: Account; expiresAt: string };
export type SessionDto = {
  id: string;
  client: ApiApplication;
  device: string;
  createdAt: string;
  expiresAt: string;
  current: boolean;
};
export type SuccessDto = { success: true };
