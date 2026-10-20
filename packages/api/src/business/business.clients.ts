import type * as dto from "./business.dto";
import type * as catalog from "../catalog/catalog.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { businessEndpoints } from "./business.endpoints";
export const businessClients = {
  uploadMedia: (
    api: ApiClient,
    id: string,
    input: catalog.UploadMediaDto,
    options: RequestOptions = {},
  ) => {
    const body = new FormData();
    body.set("file", input.file);
    if (input.alt) body.set("alt", input.alt);
    return api.request<catalog.MediaDto>(
      businessEndpoints.uploadMedia(id, body),
      options,
    );
  },
  deleteMedia: (
    api: ApiClient,
    id: string,
    mediaId: string,
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      businessEndpoints.deleteMedia(id, mediaId),
      options,
    ),
  mediaPreview: (
    api: ApiClient,
    id: string,
    mediaId: string,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.MediaPreviewDto>(
      businessEndpoints.mediaPreview(id, mediaId),
      options,
    ),
  tariffs: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<catalog.TariffDto[]>(businessEndpoints.tariffs(id), options),
  tariffHistory: (
    api: ApiClient,
    id: string,
    tariffId: string,
    page = 1,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.TariffDto[]>(
      businessEndpoints.tariffHistory(id, tariffId, page),
      options,
    ),
  createTariff: (
    api: ApiClient,
    id: string,
    input: dto.CreateTariffDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.TariffDto>(
      businessEndpoints.createTariff(id, input),
      options,
    ),
  reviseTariff: (
    api: ApiClient,
    id: string,
    tariffId: string,
    input: dto.ReviseTariffDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.TariffDto>(
      businessEndpoints.reviseTariff(id, tariffId, input),
      options,
    ),
  setTariffStatus: (
    api: ApiClient,
    id: string,
    tariffId: string,
    input: dto.TariffStatusDto,
    options: RequestOptions = {},
  ) =>
    api.request<{ id: string; isActive: boolean }>(
      businessEndpoints.setTariffStatus(id, tariffId, input),
      options,
    ),
  organizations: (api: ApiClient, options: RequestOptions = {}) =>
    api.request<dto.OrganizationDto[]>(
      businessEndpoints.organizations(),
      options,
    ),
  createOrganization: (
    api: ApiClient,
    input: dto.NameDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.OrganizationRecordDto>(
      businessEndpoints.createOrganization(input),
      options,
    ),
  branches: (
    api: ApiClient,
    organizationId: string,
    options: RequestOptions = {},
  ) =>
    api.request<dto.BranchDto[]>(
      businessEndpoints.branches(organizationId),
      options,
    ),
  createBranch: (
    api: ApiClient,
    organizationId: string,
    input: dto.NameDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.BranchDto>(
      businessEndpoints.createBranch(organizationId, input),
      options,
    ),
  team: (
    api: ApiClient,
    organizationId: string,
    options: RequestOptions = {},
  ) =>
    api.request<dto.TeamDto>(businessEndpoints.team(organizationId), options),
  inviteTeam: (
    api: ApiClient,
    organizationId: string,
    input: dto.InviteTeamDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.TeamInvitationDto>(
      businessEndpoints.inviteTeam(organizationId, input),
      options,
    ),
  removeMember: (
    api: ApiClient,
    organizationId: string,
    memberId: string,
    input: dto.ChangeReasonDto,
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      businessEndpoints.removeMember(organizationId, memberId, input),
      options,
    ),
  revokeInvitation: (
    api: ApiClient,
    organizationId: string,
    invitationId: string,
    input: dto.ChangeReasonDto,
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      businessEndpoints.revokeInvitation(organizationId, invitationId, input),
      options,
    ),
  createClub: (
    api: ApiClient,
    input: catalog.ClubCreateDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.ClubDto>(businessEndpoints.createClub(input), options),
  club: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<catalog.ClubDto>(businessEndpoints.club(id), options),
  updateClub: (
    api: ApiClient,
    id: string,
    input: catalog.ClubPatchDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.ClubDto>(
      businessEndpoints.updateClub(id, input),
      options,
    ),
  readiness: (api: ApiClient, id: string, options: RequestOptions = {}) =>
    api.request<catalog.ReadinessDto>(businessEndpoints.readiness(id), options),
  publication: (
    api: ApiClient,
    id: string,
    action: dto.PublicationAction,
    options: RequestOptions = {},
  ) =>
    api.request<{ publicationStatus: catalog.PublicationStatus }>(
      businessEndpoints.publication(id, action),
      options,
    ),
  createMedia: (
    api: ApiClient,
    id: string,
    input: catalog.MediaInputDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.MediaDto>(
      businessEndpoints.createMedia(id, input),
      options,
    ),
  createClubBranch: (
    api: ApiClient,
    id: string,
    input: catalog.BranchCreateDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.BranchProfileDto>(
      businessEndpoints.createClubBranch(id, input),
      options,
    ),
  clubBranch: (
    api: ApiClient,
    id: string,
    branchId: string,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.BranchProfileDto>(
      businessEndpoints.clubBranch(id, branchId),
      options,
    ),
  updateClubBranch: (
    api: ApiClient,
    id: string,
    branchId: string,
    input: catalog.BranchPatchDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.BranchProfileDto>(
      businessEndpoints.updateClubBranch(id, branchId, input),
      options,
    ),
  createSpace: (
    api: ApiClient,
    id: string,
    branchId: string,
    input: catalog.SpaceInputDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.SpaceDto>(
      businessEndpoints.createSpace(id, branchId, input),
      options,
    ),
  updateSpace: (
    api: ApiClient,
    id: string,
    branchId: string,
    spaceId: string,
    input: Partial<catalog.SpaceInputDto>,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.SpaceDto>(
      businessEndpoints.updateSpace(id, branchId, spaceId, input),
      options,
    ),
  inviteCoach: (
    api: ApiClient,
    id: string,
    branchId: string,
    input: dto.CoachInvitationDto,
    options: RequestOptions = {},
  ) =>
    api.request<dto.AffiliationRecordDto>(
      businessEndpoints.inviteCoach(id, branchId, input),
      options,
    ),
  endCoach: (
    api: ApiClient,
    id: string,
    branchId: string,
    affiliationId: string,
    options: RequestOptions = {},
  ) =>
    api.request<dto.AffiliationRecordDto>(
      businessEndpoints.endCoach(id, branchId, affiliationId),
      options,
    ),
  replyReview: (
    api: ApiClient,
    id: string,
    branchId: string,
    reviewId: string,
    input: dto.ReplyReviewDto,
    options: RequestOptions = {},
  ) =>
    api.request<catalog.ReviewDto>(
      businessEndpoints.replyReview(id, branchId, reviewId, input),
      options,
    ),
};
