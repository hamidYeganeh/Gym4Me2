import type * as business from "../business/business.dto";
import type * as dto from "./profile.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { profileEndpoints } from "./profile.endpoints";
export const profileClients = {
  account: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.Account>(profileEndpoints.account(), options),
  updateAccount: (
    api: ApiClient,
    input: dto.UpdateAccountDto,
    options: RequestOptions = {},
  ) => api.request<dto.Account>(profileEndpoints.updateAccount(input), options),
  access: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.AccessDto>(profileEndpoints.access(), options),
  invitations: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.Invitation[]>(profileEndpoints.invitations(), options),
  acceptInvitation: (
    api: ApiClient,
    id: string,
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      profileEndpoints.acceptInvitation(id),
      options,
    ),
  updateCoach: (
    api: ApiClient,
    input: dto.UpdateCoachDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.CoachProfileDto>(
      profileEndpoints.updateCoach(input),
      options,
    ),
  affiliations: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.AffiliationDto[]>(profileEndpoints.affiliations(), options),
  respondAffiliation: (
    api: ApiClient,
    id: string,
    action: "accept" | "end",
    options: RequestOptions = {},
  ) =>
    api.request<business.AffiliationRecordDto>(
      profileEndpoints.respondAffiliation(id, action),
      options,
    ),
};
