"use client";
import { useApiQuery } from "./query";
export type AnalyticsSurface = "admin" | "business" | "coach";
export type AnalyticsFilters = {
  from: string;
  to: string;
  interval: "day" | "week" | "month";
  organizationId?: string;
  branchId?: string;
  serviceId?: string;
  kind?: "class" | "course" | "court" | "access" | "membership" | "program";
};
export type AnalyticsMetric =
  | "orders"
  | "collectedMinor"
  | "refundedMinor"
  | "bookings"
  | "cancelled"
  | "noShows"
  | "attendance"
  | "sessions"
  | "capacity"
  | "occupied"
  | "sharedWorkouts"
  | "reviewedWorkouts"
  | "plansPublished";
export type AnalyticsReport = {
  filters: AnalyticsFilters;
  timezone: string;
  generatedAt: string;
  data: { bucket: string; metric: AnalyticsMetric; value: string }[];
  statuses: { status: string; count: number }[];
  platform: { name: string; count: number }[];
  growth: { users: number; organizations: number; branches: number } | null;
  options: {
    branches: {
      id: string;
      name: string;
      organization_id: string;
      organization_name: string;
    }[];
    services: {
      id: string;
      title: string;
      branch_id: string;
      organization_id: string;
      kind: string;
    }[];
  };
};
export function useAnalytics(
  surface: AnalyticsSurface,
  filters: AnalyticsFilters,
  enabled = true,
) {
  const path =
    surface === "coach" ? "profile/coach-analytics" : `${surface}/analytics`;
  return useApiQuery<AnalyticsReport>(
    (scope) => [...scope, "analytics", surface, filters],
    (api, signal) =>
      api.request({ path, method: "GET", query: filters }, { signal }),
    enabled,
    60_000,
  );
}
