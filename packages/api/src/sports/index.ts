"use client";
import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
  type QueryKey,
} from "@tanstack/react-query";
import { useApiContext } from "../provider";
import { useApiMutation } from "../query";
import type { ApiError, QueryParams } from "../transport";

export type PolicyDto = {
  cancellationHours: number;
  lateRefundBasisPoints: number;
  noShowConsumesSession: boolean;
  consumeOn: "attendance" | "confirmation";
  freezeDays: number;
  depositBasisPoints: number;
  guestAllowance: number;
  transferable: boolean;
  terms: string;
};
export type ServiceEligibilityDto = {
  minimumAge: number | null;
  maximumAge: number | null;
  prerequisites: {
    kind: "experience" | "equipment" | "preparation";
    description: string;
  }[];
};
export type ServiceCoverDto = {
  id: string;
  alt: string;
  width: number;
  height: number;
};
export type ServiceCoverResultDto = {
  revision: number;
  cover: ServiceCoverDto | null;
};
export type OccurrenceDto = {
  id: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  capacity: number;
  remaining: number;
  resourceAvailable?: boolean;
  status: string;
};
export type SportsResourceDto = {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  active: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  revision: number;
  unitIds: string[];
};
export type ResourceCreateInput = {
  organizationId: string;
  branchId: string;
  name: string;
  unitIds: string[];
  idempotencyKey: string;
};
export type ResourceSettingsInput = Pick<
  SportsResourceDto,
  "name" | "bufferBeforeMinutes" | "bufferAfterMinutes" | "revision"
> & { idempotencyKey: string; reason: string };
export type ResourceBlockInput = {
  kind: "closure" | "maintenance";
  startAt: string;
  endAt: string;
  revision: number;
  idempotencyKey: string;
  reason: string;
};
export type ResourceBlockDto = Omit<ResourceBlockInput, "idempotencyKey"> & {
  id: string;
  resourceId: string;
  active: boolean;
  cancelledAt: string | null;
};
export type ResourceCalendarEventDto = {
  id: string;
  kind: "closure" | "maintenance" | "session";
  title: string;
  startAt: string;
  endAt: string;
  blockId: string | null;
  blockRevision: number | null;
};
export type OccurrenceSeriesInput = {
  startAt: string;
  endAt: string;
  capacity: number;
  count: number;
  intervalDays: 1 | 7 | 14;
  revision: number;
  idempotencyKey: string;
};
export type OccurrenceSeriesDto = {
  id: string;
  occurrences: Omit<OccurrenceDto, "remaining">[];
};
export type OccurrenceSeriesSummaryDto = {
  id: string;
  serviceId: string;
  versionId: string;
  intervalDays: 1 | 7 | 14;
  occurrenceCount: number;
  revision: number;
  startAt: string;
  endAt: string;
  capacity: number;
  editable: boolean;
};
export type OccurrenceSeriesEditInput = Omit<OccurrenceSeriesInput, "count"> & {
  reason: string;
};
export type OccurrenceSeriesEditDto = {
  id: string;
  revision: number;
  occurrences: Pick<OccurrenceDto, "id" | "startAt" | "endAt" | "capacity">[];
};
export type ServiceDto = {
  id: string;
  title: string;
  kind: "class" | "course" | "court" | "access" | "membership";
  branchId: string;
  branchName: string;
  clubName: string;
  organizationId: string;
  amountMinor: string;
  description: string;
  coachName: string;
  level: string;
  nextStartAt: string | null;
  policy: PolicyDto;
  eligibility: ServiceEligibilityDto;
  cover: ServiceCoverDto | null;
  durationDays: number | null;
  sessionCount: number | null;
  requirements: string[];
  resourceIds?: string[];
  coachUserId?: string | null;
  visibility?: "public" | "unlisted";
  approvalRequired?: boolean;
  showParticipants?: boolean;
  hasUnpublishedChanges?: boolean;
  occurrences: OccurrenceDto[];
  status: string;
  revision: number;
};
export type BookingDto = {
  id: string;
  title: string;
  serviceId: string;
  branchName: string;
  branchId: string;
  occurrenceId: string;
  orderId: string;
  status: string;
  revision: number;
  startAt: string;
  endAt: string;
  amountMinor: string;
  snapshot: {
    policy: PolicyDto;
    title: string;
    eligibility?: ServiceEligibilityDto;
  };
};
export type BookingTab = "upcoming" | "past";
export type BookingPageDto = { items: BookingDto[]; nextCursor: string | null };
export type VisitDto = {
  id: string;
  userId: string;
  branchId: string;
  displayName: string;
  createdAt: string;
  exitedAt: string | null;
  reason: string;
  exitReason: string | null;
};
export type DocumentReviewDto = {
  id: string;
  name: string;
  status: "pending" | "approved" | "rejected" | "expired";
  revision: number;
  displayName: string | null;
  expiresAt: string | null;
  reviewedAt: string | null;
};
export type DocumentDto = {
  id: string;
  serviceId: string;
  name: string;
  status: DocumentReviewDto["status"];
  revision: number;
  expiresAt: string | null;
  reviewedAt: string | null;
  reason: string | null;
  createdAt: string;
};
export type CouponDto = {
  id: string;
  code: string;
  basisPoints: number;
  maxUses: number;
  used: number;
  expiresAt: string;
  disabledAt: string | null;
  revision: number;
};
export type CreateCouponInput = Pick<
  CouponDto,
  "code" | "basisPoints" | "maxUses" | "expiresAt"
>;
export type MembershipDto = {
  sharedServiceIds?: string[];
  id: string;
  title: string;
  serviceId: string;
  organizationId: string;
  branchId: string;
  status: string;
  revision: number;
  granted: number | null;
  held: number;
  consumed: number;
  endsAt: string | null;
  freezeUntil: string | null;
  policy: PolicyDto;
  events: { id: string; kind: string; quantity: number; createdAt: string }[];
};
export type OrderDto = {
  id: string;
  amountMinor: string;
  refundedMinor: string;
  status: string;
  expiresAt: string;
  balanceDueMinor: string;
  createdAt: string;
  snapshot: {
    title: string;
    policy: PolicyDto;
    eligibility?: ServiceEligibilityDto;
  };
  reservations: BookingDto[];
  payments: { id: string; state: string; provider: string }[];
  refunds: { id: string; state: string; amountMinor: string; reason: string }[];
};
export type CalendarSettingsDto = {
  id: string;
  title: string;
  description: string;
  organizationId: string;
  branchId: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type CalendarDto = CalendarSettingsDto & {
  clubName: string;
  branchName: string;
};
export type CalendarServiceDto = Pick<
  ServiceDto,
  | "id"
  | "title"
  | "kind"
  | "organizationId"
  | "branchId"
  | "branchName"
  | "clubName"
  | "amountMinor"
  | "description"
  | "level"
  | "coachName"
  | "eligibility"
  | "cover"
  | "nextStartAt"
>;
export type CalendarServicePageDto = {
  items: CalendarServiceDto[];
  nextCursor: string | null;
};
export type CalendarPageDto = {
  items: CalendarDto[];
  nextCursor: string | null;
};
export type CalendarDetailDto = CalendarDto & {
  services: CalendarServiceDto[];
  nextServiceCursor: string | null;
};
export type HostCalendarDto = {
  calendar: CalendarSettingsDto | null;
  clubName: string;
  branchName: string;
  canManage: boolean;
};
export type CalendarSettingsInput = {
  title: string;
  description: string;
  revision: number;
  idempotencyKey: string;
};
export type CalendarFollowInput = { following: boolean };
export type CalendarFollowDto = { following: boolean };
export type ConversationDto = {
  id: string;
  title: string;
  closed: boolean;
  revision: number;
  host: boolean;
  occurrenceId: string;
  archived: boolean;
  createdAt: string;
  members?: { id: string; displayName: string | null }[];
};
export type ConversationListItemDto = ConversationDto & {
  unread: number;
  lastMessage: string | null;
  lastMessageHasImage: boolean | null;
};
export type ConversationPageDto = {
  items: ConversationListItemDto[];
  nextCursor: string | null;
};
export type ConversationStateInput = {
  closed: boolean;
  revision: number;
  reason: string;
  idempotencyKey: string;
};
export type ConversationStateDto = { closed: boolean; revision: number };
export type NotificationPageDto = {
  items: NotificationDto[];
  nextCursor: string | null;
};
export type NotificationReadDto = { ok: boolean; readAt: string };
export type MessageDto = {
  id: string;
  body: string;
  senderId: string;
  displayName: string;
  imageUrl: string | null;
  createdAt: string;
  readByCount: number;
};
export type ConversationPreferencesInput = {
  archived?: boolean;
  readMessageId?: string;
};
export type ConversationDetailDto = {
  conversation: ConversationDto & { organizationId: string; branchId: string };
  messages: MessageDto[];
  hasMore: boolean;
};
export type InvitationDto = {
  id: string;
  title: string;
  serviceId: string;
  status: "invited" | "accepted" | "declined" | "cancelled";
  revision: number;
  userId: string;
  displayName: string | null;
  phoneSuffix: string;
  clubName: string;
  branchName: string;
  available: boolean;
  createdAt: string;
  updatedAt: string;
};
export type InvitationPageDto = {
  items: InvitationDto[];
  nextCursor: string | null;
};
export type InvitationRecipientDto = {
  id: string;
  displayName: string | null;
  phoneSuffix: string;
};
export type InvitationCreateInput = {
  serviceId: string;
  userId: string;
  idempotencyKey: string;
};
export type InvitationAnswerInput = {
  accept: boolean;
  revision: number;
  idempotencyKey: string;
};
export type InvitationCancelInput = {
  revision: number;
  idempotencyKey: string;
};
export type InvitationResultDto = Pick<
  InvitationDto,
  "id" | "status" | "revision"
>;
export type NotificationDto = {
  id: string;
  title: string;
  body: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};
export type NotificationPreferencesDto = {
  reminders: boolean;
  messages: boolean;
  invitations: boolean;
};
export type WaitlistDto = {
  id: string;
  title: string;
  serviceId: string;
  occurrenceId: string;
  status: string;
  offerExpiresAt: string | null;
};
export type TicketSummaryDto = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};
export type TicketMessageDto = { id: string; body: string; createdAt: string };
export type TicketDto = TicketSummaryDto & { messages: TicketMessageDto[] };
export type CreateTicketInput = {
  title: string;
  body: string;
  orderId?: string;
};
export type ReplyTicketInput = { body: string };
export type SportsCheckoutInput = {
  serviceId: string;
  occurrenceId?: string;
  membershipId?: string;
  coupon?: string;
  quoteId?: string;
  idempotencyKey: string;
};
export const sportsEndpoints = {
  services: (q = "", branchId?: string) => ({
    method: "GET" as const,
    path: "sports/services",
    query: { q, branchId },
  }),
  service: (id: string) => ({
    method: "GET" as const,
    path: `sports/services/${encodeURIComponent(id)}`,
  }),
  checkout: (body: SportsCheckoutInput) => ({
    method: "POST" as const,
    path: "sports/account/checkout",
    body,
  }),
  scheduleSeries: (serviceId: string, body: OccurrenceSeriesInput) => ({
    method: "POST" as const,
    path: `business/sports/services/${encodeURIComponent(serviceId)}/occurrence-series`,
    body,
  }),
  occurrenceSeries: (serviceId: string) => ({
    method: "GET" as const,
    path: `business/sports/services/${encodeURIComponent(serviceId)}/occurrence-series`,
  }),
  editOccurrenceSeries: (
    serviceId: string,
    seriesId: string,
    body: OccurrenceSeriesEditInput,
  ) => ({
    method: "POST" as const,
    path: `business/sports/services/${encodeURIComponent(serviceId)}/occurrence-series/${encodeURIComponent(seriesId)}/edit`,
    body,
  }),
  coupons: (serviceId: string) => ({
    method: "GET" as const,
    path: `business/sports/services/${encodeURIComponent(serviceId)}/coupons`,
  }),
  createCoupon: (serviceId: string, body: CreateCouponInput) => ({
    method: "POST" as const,
    path: `business/sports/services/${encodeURIComponent(serviceId)}/coupons`,
    body,
  }),
  disableCoupon: (serviceId: string, couponId: string, revision: number) => ({
    method: "POST" as const,
    path: `business/sports/services/${encodeURIComponent(serviceId)}/coupons/${encodeURIComponent(couponId)}/disable`,
    body: { revision },
  }),
};
export function useSportsQuery<T>(
  path: string,
  query?: QueryParams,
  enabled = true,
  poll = false,
) {
  const { api } = useApiContext();
  return useQuery<T, ApiError>({
    queryKey: [...api.scope, "sports", path, query ?? {}],
    queryFn: ({ signal }) =>
      api.request<T>({ method: "GET", path, query }, { signal }),
    enabled,
    refetchInterval: poll ? 5000 : false,
    refetchIntervalInBackground: false,
  });
}
export function useSportsCommand<T = unknown, TInput = unknown>(path: string) {
  return useApiMutation<T, TInput>(
    (api, body) => api.request<T>({ method: "POST", path, body }),
    [["sports"]],
  );
}

export function useSportsBookings(tab: BookingTab) {
  const { api } = useApiContext();
  return useInfiniteQuery<
    BookingPageDto,
    ApiError,
    InfiniteData<BookingPageDto, string>,
    QueryKey,
    string
  >({
    queryKey: [...api.scope, "sports", "bookings/page", tab],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api.request<BookingPageDto>(
        {
          method: "GET",
          path: "sports/account/bookings/page",
          query: { tab, limit: 20, cursor: pageParam || undefined },
        },
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useSportsInvitations(serviceId?: string) {
  const { api } = useApiContext();
  const path = serviceId
    ? `sports/community/host/services/${serviceId}/invitations`
    : "sports/community/invitations";
  return useInfiniteQuery<
    InvitationPageDto,
    ApiError,
    InfiniteData<InvitationPageDto, string>,
    QueryKey,
    string
  >({
    queryKey: [...api.scope, "sports", path],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api.request<InvitationPageDto>(
        { method: "GET", path, query: { cursor: pageParam || undefined } },
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}

export function useSportsConversation(id: string, hostOnly = false) {
  const { api } = useApiContext();
  return useInfiniteQuery<
    ConversationDetailDto,
    ApiError,
    InfiniteData<ConversationDetailDto, string>,
    QueryKey,
    string
  >({
    queryKey: [...api.scope, "sports", "conversation", id, hostOnly],
    initialPageParam: "",
    queryFn: ({ signal, pageParam }) =>
      api.request<ConversationDetailDto>(
        {
          method: "GET",
          path: `sports/community/${hostOnly ? "host/" : ""}conversations/${encodeURIComponent(id)}`,
          query: { before: pageParam || undefined },
        },
        { signal },
      ),
    getNextPageParam: (last) =>
      last.hasMore ? last.messages[0]?.id : undefined,
    enabled: Boolean(id),
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}

function useCommunityPage<T extends { nextCursor: string | null }>(
  path: string,
  query: QueryParams,
  enabled = true,
) {
  const { api } = useApiContext();
  return useInfiniteQuery<
    T,
    ApiError,
    InfiniteData<T, string>,
    QueryKey,
    string
  >({
    queryKey: [...api.scope, "sports", path, query],
    initialPageParam: "",
    queryFn: ({ signal, pageParam }) =>
      api.request<T>(
        {
          method: "GET",
          path,
          query: { ...query, cursor: pageParam || undefined },
        },
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
}
export function useSportsConversations(archived: boolean) {
  return useCommunityPage<ConversationPageDto>(
    "sports/community/conversations/page",
    { archived },
  );
}
export function useSportsHostConversations(
  organizationId: string | undefined,
  branchId: string | undefined,
  archived: boolean,
) {
  return useCommunityPage<ConversationPageDto>(
    "sports/community/host/conversations/page",
    { organizationId, branchId, archived },
    Boolean(organizationId && branchId),
  );
}
export function useSportsNotifications(view: "all" | "unread") {
  return useCommunityPage<NotificationPageDto>(
    "sports/community/notifications/page",
    { view },
  );
}

export function useSportsCalendars(view: "all" | "following", search = "") {
  const { api } = useApiContext();
  return useInfiniteQuery<
    CalendarPageDto,
    ApiError,
    InfiniteData<CalendarPageDto, string>,
    QueryKey,
    string
  >({
    queryKey: [...api.scope, "sports", "calendars/page", view, search],
    initialPageParam: "",
    queryFn: ({ pageParam, signal }) =>
      api.request<CalendarPageDto>(
        {
          method: "GET",
          path:
            view === "following"
              ? "sports/community/calendars/page"
              : "sports/calendars/page",
          query: { search, cursor: pageParam || undefined },
        },
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
export function useCalendarServices(calendar: CalendarDetailDto) {
  const { api } = useApiContext();
  return useInfiniteQuery<
    CalendarServicePageDto,
    ApiError,
    InfiniteData<CalendarServicePageDto, string>,
    QueryKey,
    string
  >({
    queryKey: [...api.scope, "sports", "calendar/services", calendar.id],
    initialPageParam: "",
    initialData: {
      pages: [
        { items: calendar.services, nextCursor: calendar.nextServiceCursor },
      ],
      pageParams: [""],
    },
    queryFn: ({ pageParam, signal }) =>
      api.request<CalendarServicePageDto>(
        {
          method: "GET",
          path: `sports/calendars/${calendar.id}/services`,
          query: { cursor: pageParam || undefined },
        },
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
export function useSaveSportsCalendar(scope: {
  organizationId: string;
  branchId: string;
}) {
  return useApiMutation<CalendarSettingsDto, CalendarSettingsInput>(
    (api, body) =>
      api.request<CalendarSettingsDto>({
        method: "POST",
        path: "sports/community/host/calendar",
        query: scope,
        body,
      }),
    [["sports"]],
  );
}

export type QuoteDto = {
  coaching?: {
    coachId: string;
    mode: string;
    entryAmountMinor: string;
    coachingAmountMinor: string;
  } | null;
  id: string;
  amountMinor: string;
  payNowMinor: string;
  balanceDueMinor: string;
  expiresAt: string;
  policy: PolicyDto;
  eligibility: ServiceEligibilityDto;
  cover: ServiceCoverDto | null;
};
