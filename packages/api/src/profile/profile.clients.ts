import type * as business from "../business/business.dto";
import type * as dto from "./profile.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { profileEndpoints } from "./profile.endpoints";
import type {
  OtpChallengeDto,
  RequestOtpDto,
  VerifyOtpDto,
  SuccessDto,
} from "../auth/auth.dto";
import { readNumberedPages } from "../paged-list";
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
    readNumberedPages(
      100,
      (page) =>
        api.request<dto.AffiliationDto[]>(
          profileEndpoints.affiliations(page),
          options,
        ),
      options.signal,
    ),
  affiliationPage: (api: ApiClient, page = 1, options: RequestOptions = {}) =>
    api.request<dto.AffiliationDto[]>(
      profileEndpoints.affiliations(page),
      options,
    ),
  favorites: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<string[]>(profileEndpoints.favorites(), options),
  setFavorite: (
    api: ApiClient,
    id: string,
    input: { saved: boolean },
    options: RequestOptions = {},
  ) => api.request<string[]>(profileEndpoints.setFavorite(id, input), options),
  mergeFavorites: (
    api: ApiClient,
    ids: string[],
    options: RequestOptions = {},
  ) => api.request<string[]>(profileEndpoints.mergeFavorites(ids), options),
  privacy: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.PrivacyDto>(profileEndpoints.privacy(), options),
  updatePrivacy: (
    api: ApiClient,
    input: dto.UpdatePrivacyDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.PrivacyDto>(profileEndpoints.updatePrivacy(input), options),
  exportAccount: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<Record<string, unknown>>(
      profileEndpoints.exportAccount(),
      options,
    ),
  requestDeletion: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.PrivacyDto>(profileEndpoints.requestDeletion(), options),
  cancelDeletion: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.PrivacyDto>(profileEndpoints.cancelDeletion(), options),
  requestPhoneChange: (
    api: ApiClient,
    input: RequestOtpDto,
    options: RequestOptions = {},
  ) =>
    api.request<OtpChallengeDto>(
      profileEndpoints.requestPhoneChange(input),
      options,
    ),
  verifyPhoneChange: (
    api: ApiClient,
    input: VerifyOtpDto,
    options: RequestOptions = {},
  ) =>
    api.request<SuccessDto>(profileEndpoints.verifyPhoneChange(input), options),
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
