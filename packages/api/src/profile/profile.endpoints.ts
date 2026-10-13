import type * as dto from "./profile.dto";
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
  affiliations: (): ApiRequest => ({
    method: "GET",
    path: "profile/coach/affiliations",
  }),
  respondAffiliation: (id: string, action: "accept" | "end"): ApiRequest => ({
    method: "POST",
    path: `profile/coach/affiliations/${resourceId(id)}/${action}`,
  }),
};
