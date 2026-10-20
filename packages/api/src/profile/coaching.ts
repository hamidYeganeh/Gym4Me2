"use client";
import type { CoachProfileDto } from "./profile.dto";
import { resourceId, type ApiClient, type RequestOptions } from "../transport";
import { useApiMutation, useApiQuery } from "../query";
export type CoachingRelationshipDto = {
  id: string;
  coachId: string;
  studentId: string | null;
  initiatedBy: string;
  revision: number;
  counterpartName: string | null;
  status: "pending" | "active" | "declined" | "ended";
  expired: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
export type CoachingDashboardDto = {
  profile: CoachProfileDto | null;
  items: CoachingRelationshipDto[];
  hasMore: boolean;
};
export type CoachingAnswerDto = {
  id: string;
  action: "accept" | "decline" | "end";
  revision: number;
};
export const coachingClients = {
  dashboard: (api: ApiClient, page = 1, options: RequestOptions = {}) =>
    api.request<CoachingDashboardDto>(
      { method: "GET", path: "profile/coaching", query: { page } },
      options,
    ),
  invite: (api: ApiClient, phone: string) =>
    api.request<{ id: string; status: string }>({
      method: "POST",
      path: "profile/coaching/invitations",
      body: { phone },
    }),
  answer: (api: ApiClient, { id, ...body }: CoachingAnswerDto) =>
    api.request<{ id: string; status: string }>({
      method: "POST",
      path: `profile/coaching/relationships/${resourceId(id)}`,
      body,
    }),
};
export function useCoachingDashboard(page = 1, enabled = true) {
  return useApiQuery(
    (scope) => [...scope, "profile", "coaching", page],
    (api, signal) => coachingClients.dashboard(api, page, { signal }),
    enabled,
    0,
  );
}
export function useInviteStudent() {
  return useApiMutation(
    (api, phone: string) => coachingClients.invite(api, phone),
    [["profile", "coaching"]],
  );
}
export function useAnswerCoaching() {
  return useApiMutation(
    (api, input: CoachingAnswerDto) => coachingClients.answer(api, input),
    [["profile", "coaching"]],
  );
}
