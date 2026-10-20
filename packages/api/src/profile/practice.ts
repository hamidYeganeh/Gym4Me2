"use client";
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
    kind: string;
    mode: string;
    entryAmountMinor: string;
    amountMinor: string;
  }[];
  sessions: PracticeSessionDto[];
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
  userId: string;
  displayName: string | null;
  biography: string | null;
  specialties: string[];
  goals: string[];
  city: string;
  experienceYears: number;
  reviewExpiresAt: string;
  fromPriceMinor: string | null;
};
export type CoachDetailDto = CoachDirectoryDto & {
  services: {
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
  reviews: { id: string; rating: number; body: string; example: string }[];
};
export type FinanceDto = {
  bookings?: { id: string; coachId: string; title: string; startAt: string }[];
  contracts: {
    id: string;
    coachId: string;
    version: number;
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
) {
  return useApiQuery(
    (scope) => [...scope, "coaching", path, query],
    (api, signal) => api.request<T>({ method: "GET", path, query }, { signal }),
    enabled,
    0,
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
