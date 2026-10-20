import type * as dto from "./business.dto";
import type * as catalog from "../catalog/catalog.dto";
import { resourceId, type ApiRequest } from "../transport";
export const businessEndpoints = {
  uploadMedia: (id: string, body: FormData): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/media/upload`,
    body,
  }),
  deleteMedia: (id: string, mediaId: string): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/media/${resourceId(mediaId)}/delete`,
  }),
  mediaPreview: (id: string, mediaId: string): ApiRequest => ({
    method: "GET",
    path: `business/clubs/${resourceId(id)}/media/${resourceId(mediaId)}/preview`,
  }),
  tariffs: (id: string): ApiRequest => ({
    method: "GET",
    path: `business/clubs/${resourceId(id)}/tariffs`,
  }),
  tariffHistory: (id: string, tariffId: string, page = 1): ApiRequest => ({
    method: "GET",
    path: `business/clubs/${resourceId(id)}/tariffs/${resourceId(tariffId)}/versions`,
    query: { page },
  }),
  createTariff: (id: string, input: dto.CreateTariffDto): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/tariffs`,
    body: input,
  }),
  reviseTariff: (
    id: string,
    tariffId: string,
    input: dto.ReviseTariffDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/tariffs/${resourceId(tariffId)}/versions`,
    body: input,
  }),
  setTariffStatus: (
    id: string,
    tariffId: string,
    input: dto.TariffStatusDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/tariffs/${resourceId(tariffId)}/status`,
    body: input,
  }),
  organizations: (): ApiRequest => ({
    method: "GET",
    path: "business/organizations",
  }),
  createOrganization: (input: dto.NameDto): ApiRequest => ({
    method: "POST",
    path: "business/organizations",
    body: input,
  }),
  branches: (organizationId: string): ApiRequest => ({
    method: "GET",
    path: `business/organizations/${resourceId(organizationId)}/branches`,
  }),
  createBranch: (organizationId: string, input: dto.NameDto): ApiRequest => ({
    method: "POST",
    path: `business/organizations/${resourceId(organizationId)}/branches`,
    body: input,
  }),
  team: (organizationId: string): ApiRequest => ({
    method: "GET",
    path: `business/organizations/${resourceId(organizationId)}/team`,
  }),
  inviteTeam: (
    organizationId: string,
    input: dto.InviteTeamDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/organizations/${resourceId(organizationId)}/invitations`,
    body: input,
  }),
  removeMember: (
    organizationId: string,
    memberId: string,
    input: dto.ChangeReasonDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/organizations/${resourceId(organizationId)}/team/${resourceId(memberId)}/remove`,
    body: input,
  }),
  revokeInvitation: (
    organizationId: string,
    invitationId: string,
    input: dto.ChangeReasonDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/organizations/${resourceId(organizationId)}/invitations/${resourceId(invitationId)}/revoke`,
    body: input,
  }),
  createClub: (input: catalog.ClubCreateDto): ApiRequest => ({
    method: "POST",
    path: "business/clubs",
    body: input,
  }),
  club: (id: string): ApiRequest => ({
    method: "GET",
    path: `business/clubs/${resourceId(id)}`,
  }),
  updateClub: (id: string, input: catalog.ClubPatchDto): ApiRequest => ({
    method: "PATCH",
    path: `business/clubs/${resourceId(id)}`,
    body: input,
  }),
  readiness: (id: string): ApiRequest => ({
    method: "GET",
    path: `business/clubs/${resourceId(id)}/readiness`,
  }),
  publication: (id: string, action: dto.PublicationAction): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/publication/${action}`,
  }),
  createMedia: (id: string, input: catalog.MediaInputDto): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/media`,
    body: input,
  }),
  createClubBranch: (
    id: string,
    input: catalog.BranchCreateDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/branches`,
    body: input,
  }),
  clubBranch: (id: string, branchId: string): ApiRequest => ({
    method: "GET",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}`,
  }),
  updateClubBranch: (
    id: string,
    branchId: string,
    input: catalog.BranchPatchDto,
  ): ApiRequest => ({
    method: "PATCH",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}`,
    body: input,
  }),
  createSpace: (
    id: string,
    branchId: string,
    input: catalog.SpaceInputDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/spaces`,
    body: input,
  }),
  updateSpace: (
    id: string,
    branchId: string,
    spaceId: string,
    input: Partial<catalog.SpaceInputDto>,
  ): ApiRequest => ({
    method: "PATCH",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/spaces/${resourceId(spaceId)}`,
    body: input,
  }),
  inviteCoach: (
    id: string,
    branchId: string,
    input: dto.CoachInvitationDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/coaches`,
    body: input,
  }),
  endCoach: (
    id: string,
    branchId: string,
    affiliationId: string,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/coaches/${resourceId(affiliationId)}/end`,
  }),
  replyReview: (
    id: string,
    branchId: string,
    reviewId: string,
    input: dto.ReplyReviewDto,
  ): ApiRequest => ({
    method: "POST",
    path: `business/clubs/${resourceId(id)}/branches/${resourceId(branchId)}/reviews/${resourceId(reviewId)}/reply`,
    body: input,
  }),
};
