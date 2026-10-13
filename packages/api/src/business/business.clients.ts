import type * as dto from "./business.dto";
import type * as catalog from "../catalog/catalog.dto";
import type { ApiClient, RequestOptions } from "../transport";
import { businessEndpoints } from "./business.endpoints";
export const businessClients = {
  uploadMedia: (api: ApiClient, id: string, input: { file: File; alt?: string }, options: RequestOptions = {}) => {
    const body = new FormData(); body.set("file", input.file); if (input.alt) body.set("alt", input.alt);
    return api.request<catalog.MediaDto>({ method: "POST", path: `business/clubs/${encodeURIComponent(id)}/media/upload`, body }, options);
  },
  deleteMedia: (api: ApiClient, id: string, mediaId: string, options: RequestOptions = {}) => api.request<{ success: true }>({ method: "POST", path: `business/clubs/${encodeURIComponent(id)}/media/${encodeURIComponent(mediaId)}/delete` }, options),
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
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      businessEndpoints.removeMember(organizationId, memberId),
      options,
    ),
  revokeInvitation: (
    api: ApiClient,
    organizationId: string,
    invitationId: string,
    options: RequestOptions = {},
  ) =>
    api.request<{ success: true }>(
      businessEndpoints.revokeInvitation(organizationId, invitationId),
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
