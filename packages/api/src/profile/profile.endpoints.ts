import type * as dto from "./profile.dto";
import type { RequestOtpDto, VerifyOtpDto } from "../auth/auth.dto";
import { resourceId, type ApiRequest } from "../transport";
export const profileEndpoints = {
  account: (): ApiRequest => ({ method: "GET", path: "profile/account" }),
  updateAccount: (input: dto.UpdateAccountDto): ApiRequest => ({
    method: "PATCH",
    path: "profile/account",
    body: input,
  }),
  access: (): ApiRequest => ({ method: "GET", path: "profile/access" }),
  invitations: (): ApiRequest => ({
    method: "GET",
    path: "profile/invitations",
  }),
  acceptInvitation: (id: string): ApiRequest => ({
    method: "POST",
    path: `profile/invitations/${resourceId(id)}/accept`,
  }),
  updateCoach: (input: dto.UpdateCoachDto): ApiRequest => ({
    method: "POST",
    path: "profile/coach",
    body: input,
  }),
  affiliations: (page = 1): ApiRequest => ({
    method: "GET",
    path: "profile/coach/affiliations",
    query: { page },
  }),
  respondAffiliation: (id: string, action: "accept" | "end"): ApiRequest => ({
    method: "POST",
    path: `profile/coach/affiliations/${resourceId(id)}/${action}`,
  }),
  favorites: (): ApiRequest => ({ method: "GET", path: "profile/favorites" }),
  setFavorite: (id: string, input: { saved: boolean }): ApiRequest => ({
    method: "POST",
    path: `profile/favorites/${resourceId(id)}`,
    body: input,
  }),
  mergeFavorites: (ids: string[]): ApiRequest => ({
    method: "POST",
    path: "profile/favorites/merge",
    body: { ids },
  }),
  privacy: (): ApiRequest => ({
    method: "GET",
    path: "profile/account/privacy",
  }),
  updatePrivacy: (input: dto.UpdatePrivacyDto): ApiRequest => ({
    method: "POST",
    path: "profile/account/privacy/preferences",
    body: input,
  }),
  exportAccount: (): ApiRequest => ({
    method: "GET",
    path: "profile/account/privacy/export",
  }),
  requestDeletion: (): ApiRequest => ({
    method: "POST",
    path: "profile/account/privacy/deletion",
    body: { confirm: true },
  }),
  cancelDeletion: (): ApiRequest => ({
    method: "POST",
    path: "profile/account/privacy/deletion/cancel",
  }),
  requestPhoneChange: (input: RequestOtpDto): ApiRequest => ({
    method: "POST",
    path: "profile/account/phone/request",
    body: input,
  }),
  verifyPhoneChange: (input: VerifyOtpDto): ApiRequest => ({
    method: "POST",
    path: "profile/account/phone/verify",
    body: input,
  }),
};
