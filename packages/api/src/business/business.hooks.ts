"use client";
import type * as dto from "./business.dto";
import type * as catalog from "../catalog/catalog.dto";
import { businessClients } from "./business.clients";
import { businessKeys } from "./business.keys";
import { useApiQuery, useApiMutation } from "../query";

export function useOrganizations() {
  return useApiQuery(
    (scope) => businessKeys(scope).organizations(),
    (api, signal) => businessClients.organizations(api, { signal }),
  );
}
export function useBranches(id: string | undefined) {
  return useApiQuery(
    (scope) => businessKeys(scope).branches(id),
    (api, signal) => businessClients.branches(api, id ?? "", { signal }),
    Boolean(id),
  );
}
export function useTeam(id: string | undefined, enabled = true) {
  return useApiQuery(
    (scope) => businessKeys(scope).team(id),
    (api, signal) => businessClients.team(api, id ?? "", { signal }),
    Boolean(id) && enabled,
  );
}
export function useBusinessClub(id: string | undefined) {
  return useApiQuery(
    (scope) => businessKeys(scope).club(id),
    (api, signal) => businessClients.club(api, id ?? "", { signal }),
    Boolean(id),
  );
}
export function useBusinessReadiness(id: string | undefined) {
  return useApiQuery(
    (scope) => businessKeys(scope).readiness(id),
    (api, signal) => businessClients.readiness(api, id ?? "", { signal }),
    Boolean(id),
  );
}
export function useBusinessBranch(
  id: string | undefined,
  branchId: string | undefined,
) {
  return useApiQuery(
    (scope) => businessKeys(scope).clubBranch(id, branchId),
    (api, signal) =>
      businessClients.clubBranch(api, id ?? "", branchId ?? "", { signal }),
    Boolean(id && branchId),
  );
}
export function useCreateOrganization() {
  return useApiMutation(
    (api, input: dto.NameDto) => businessClients.createOrganization(api, input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useCreateBranch() {
  return useApiMutation(
    (api, input: { organizationId: string; input: dto.NameDto }) =>
      businessClients.createBranch(api, input.organizationId, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useInviteTeam() {
  return useApiMutation(
    (api, input: { organizationId: string; input: dto.InviteTeamDto }) =>
      businessClients.inviteTeam(api, input.organizationId, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useRemoveMember() {
  return useApiMutation(
    (api, input: { organizationId: string; memberId: string }) =>
      businessClients.removeMember(api, input.organizationId, input.memberId),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useRevokeInvitation() {
  return useApiMutation(
    (api, input: { organizationId: string; invitationId: string }) =>
      businessClients.revokeInvitation(
        api,
        input.organizationId,
        input.invitationId,
      ),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useCreateClub() {
  return useApiMutation(
    (api, input: catalog.ClubCreateDto) =>
      businessClients.createClub(api, input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useUpdateClub() {
  return useApiMutation(
    (api, input: { id: string; input: catalog.ClubPatchDto }) =>
      businessClients.updateClub(api, input.id, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function usePublication() {
  return useApiMutation(
    (api, input: { id: string; action: dto.PublicationAction }) =>
      businessClients.publication(api, input.id, input.action),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useCreateMedia() {
  return useApiMutation(
    (api, input: { id: string; input: catalog.MediaInputDto }) =>
      businessClients.createMedia(api, input.id, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useUploadMedia() {
  return useApiMutation((api, input: { id: string; file: File; alt?: string }) => businessClients.uploadMedia(api, input.id, input), [["business"], ["catalog"], ["admin"]]);
}
export function useDeleteMedia() {
  return useApiMutation((api, input: { id: string; mediaId: string }) => businessClients.deleteMedia(api, input.id, input.mediaId), [["business"], ["catalog"], ["admin"]]);
}
export function useCreateClubBranch() {
  return useApiMutation(
    (api, input: { id: string; input: catalog.BranchCreateDto }) =>
      businessClients.createClubBranch(api, input.id, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useUpdateClubBranch() {
  return useApiMutation(
    (
      api,
      input: { id: string; branchId: string; input: catalog.BranchPatchDto },
    ) =>
      businessClients.updateClubBranch(
        api,
        input.id,
        input.branchId,
        input.input,
      ),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useCreateSpace() {
  return useApiMutation(
    (
      api,
      input: { id: string; branchId: string; input: catalog.SpaceInputDto },
    ) =>
      businessClients.createSpace(api, input.id, input.branchId, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useUpdateSpace() {
  return useApiMutation(
    (
      api,
      input: {
        id: string;
        branchId: string;
        spaceId: string;
        input: Partial<catalog.SpaceInputDto>;
      },
    ) =>
      businessClients.updateSpace(
        api,
        input.id,
        input.branchId,
        input.spaceId,
        input.input,
      ),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useInviteCoach() {
  return useApiMutation(
    (
      api,
      input: { id: string; branchId: string; input: dto.CoachInvitationDto },
    ) =>
      businessClients.inviteCoach(api, input.id, input.branchId, input.input),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useEndCoach() {
  return useApiMutation(
    (api, input: { id: string; branchId: string; affiliationId: string }) =>
      businessClients.endCoach(
        api,
        input.id,
        input.branchId,
        input.affiliationId,
      ),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
export function useReplyReview() {
  return useApiMutation(
    (
      api,
      input: {
        id: string;
        branchId: string;
        reviewId: string;
        input: dto.ReplyReviewDto;
      },
    ) =>
      businessClients.replyReview(
        api,
        input.id,
        input.branchId,
        input.reviewId,
        input.input,
      ),
    [["business"], ["profile"], ["catalog"], ["admin"]],
  );
}
