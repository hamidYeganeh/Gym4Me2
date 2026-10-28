"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useApiContext } from "../provider";
import { useApiQuery, useApiMutation } from "../query";
import type { QueryParams } from "../transport";
export type PracticeDto = {
  userId: string;
  specialties: string[];
  goals: string[];
  city: string;
  experienceYears: number;
  reviewStatus: "draft" | "pending" | "approved" | "rejected";
  reviewReason: string | null;
  reviewExpiresAt: string | null;
  published: boolean;
  bufferMinutes: number;
  travelMinutes: number;
  revision: number;
};
export type PracticeSessionDto = {
  id: string | null;
  branchName?: string;
  clubName?: string;
  occurrenceId: string;
  occurrenceRevision: number;
  startAt: string;
  endAt: string;
  title: string;
  status: string | null;
  occurrenceStatus: string;
  revision: number | null;
  displayName: string | null;
  userId: string | null;
};
export type PracticeSessionSummaryDto = {
  total: number;
  upcoming: number;
  completed: number;
};
export type CoachingMembershipDto = {
  id: string;
  title: string;
  granted: number | null;
  consumed: number;
  held: number;
  endsAt: string | null;
  status: string;
};
export type PracticeParticipantDto = {
  id: string;
  revision: number;
  displayName: string | null;
  status: string;
  checkedInAt: string | null;
  attendance: string | null;
  paymentStatus: string;
  membershipId: string | null;
  granted: number | null;
  consumed: number | null;
  held: number;
};
export type PracticeWorkspaceDto = {
  practice: PracticeDto | null;
  credentials: {
    id: string;
    title: string;
    issuer: string;
    expiresAt: string;
    hasFile: boolean;
  }[];
  availability: {
    id: string;
    kind: string;
    startsAt: string;
    endsAt: string;
  }[];
  services: {
    id: string;
    title: string;
    branchName: string;
    clubName: string;
    kind: string;
    mode: string;
    entryAmountMinor: string;
    amountMinor: string;
  }[];
  sessions: PracticeSessionDto[];
  sessionSummary?: PracticeSessionSummaryDto;
  studentMemberships?: CoachingMembershipDto[];
  notes: { reservationId: string; note: string; followUp: string }[];
  studentSessions: PracticeSessionDto[];
};
export type AssessmentDto = {
  canEdit: boolean;
  goals: string;
  level: string;
  equipment: string;
  limitations: string;
  shared: boolean;
  revision: number;
};
export type NoteDto = {
  canEdit: boolean;
  note: string;
  followUp: string;
  shared: boolean;
  revision: number;
};
export type CoachDirectoryDto = {
  publicId: string;
  userId: string;
  displayName: string | null;
  biography: string | null;
  specialties: string[];
  goals: string[];
  city: string;
  experienceYears: number;
  reviewExpiresAt: string | null;
  credentialVerified?: boolean;
  fromPriceMinor: string | null;
};
export type CoachDetailDto = CoachDirectoryDto & {
  services: {
    publicId: string;
    serviceId: string;
    title: string;
    kind: string;
    mode: string;
    entryAmountMinor: string;
    amountMinor: string;
    branchName: string;
    clubName: string;
    approvalRequired: boolean;
  }[];
  reviews: {
    id: string;
    rating: number;
    body: string;
    example: string;
    reply: string;
    replyRevision: number;
    coachId: string;
  }[];
};
export type FinanceDto = {
  bookings?: { id: string; coachId: string; title: string; startAt: string }[];
  contracts: {
    id: string;
    coachId: string;
    version: number;
    clubName: string;
    branchName: string;
    startsOn: string;
    endsOn: string | null;
    shareBasisPoints: number;
    basis: string;
    costsMinor: string;
    terms: string;
  }[];
  ledger: {
    id: string;
    contractId: string;
    kind: string;
    amountMinor: string;
    reference: string;
    confirmed: boolean;
    reservationId: string | null;
  }[];
};
export type PracticeReviewDto = PracticeDto & {
  displayName: string | null;
  credentials: PracticeWorkspaceDto["credentials"];
};
/** Shared coaching query scope also isolates identity/language and clears on logout. */
export function usePracticeQuery<T>(
  path: string,
  query: QueryParams = {},
  enabled = true,
  initialData?: T,
) {
  return useApiQuery(
    (scope) => [...scope, "coaching", path, query],
    (api, signal) => api.request<T>({ method: "GET", path, query }, { signal }),
    enabled,
    0,
    false,
    initialData,
  );
}
export function usePracticeCommand() {
  return useApiMutation(
    (api, input: { path: string; body?: unknown }) =>
      api.request<unknown>({
        method: "POST",
        path: input.path,
        ...(input.body === undefined ? {} : { body: input.body }),
      }),
    [["coaching"], ["profile"], ["sports"]],
  );
}

export type CoachReviewReportDto = {
  id: string;
  reviewId: string;
  reason: string;
  body: string;
  reply: string;
  hidden: boolean;
  status: string;
  revision: number;
  decisions: { reason: string; hidden: boolean; createdAt: string }[];
};

/** Ordered coach portfolio, limited to five before/after pairs. */
export type CoachSampleDto = {
  id: string;
  title: string;
  revision: number;
  before: string;
  after: string;
};

export function useInfiniteCoaches(filters: QueryParams = {}, enabled = true) {
  const { api } = useApiContext();
  return useInfiniteQuery({
    queryKey: [...api.scope, "coaching", "directory", filters],
    initialPageParam: 1,
    enabled,
    queryFn: ({ pageParam, signal }) =>
      api.request<{ items: CoachDirectoryDto[]; hasMore: boolean }>(
        {
          method: "GET",
          path: "coaching/directory",
          query: { ...filters, page: pageParam, limit: 50 },
        },
        { signal },
      ),
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length + 1 : undefined,
  });
}
