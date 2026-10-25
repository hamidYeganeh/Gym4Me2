"use client";
import { useApiQuery, useApiMutation } from "./query";
export type AdvancedSurface = "business" | "admin" | "coach";
export type AdvancedScope = {
  organizationId: string;
  branchId?: string;
  from?: string;
  to?: string;
  page?: number;
};
export type BusinessPlan = {
  code: "basic" | "pro";
  amount_minor: string;
  branch_limit: number;
  advanced_finance: boolean;
  terms: string;
  revision: number;
};
export type BusinessStatement = {
  id: string;
  organization_id: string;
  branch_id: string;
  coach_id: string;
  coach_name: string;
  branch_name: string;
  from_on: string;
  to_on: string;
  status: "draft" | "approved" | "paid";
  revision: number;
  earned_minor: string;
  adjusted_minor: string;
  paid_minor: string;
};
export type BusinessEarning = {
  id: string;
  statement_id: string;
  contract_id: string;
  reservation_id: string | null;
  source_key: string;
  amount_minor: string;
  basis_snapshot: Record<string, unknown>;
};
export type BusinessPayout = {
  id: string;
  statement_id: string;
  amount_minor: string;
  method: "mock" | "manual";
  reference: string;
  state: "succeeded" | "failed" | "unknown";
  created_at: string;
};
export type BusinessDispute = {
  id: string;
  earning_id: string;
  reason: string;
  state: "open" | "resolved";
  decision: string | null;
  revision: number;
};
export type AdvancedData = {
  totals?: { earned_minor: string; adjusted_minor: string; paid_minor: string };
  pages?: { statements: boolean; memberships: boolean };
  planPayments?: {
    id: string;
    plan_code: "basic" | "pro";
    amount_minor: string;
    state: "succeeded" | "failed" | "unknown";
    reference: string;
  }[];
  plans: BusinessPlan[];
  subscription: {
    plan_code: "basic" | "pro";
    revision: number;
    expires_at: string | null;
    branch_limit: number;
    advanced_finance: boolean;
  } | null;
  branches: {
    id: string;
    name: string;
    active: boolean;
    revision: number;
    future_bookings: number;
  }[];
  contracts: {
    id: string;
    branch_id: string;
    coach_id: string;
    coach_name: string;
    version: number;
    starts_on: string;
    ends_on: string | null;
    share_basis_points: number;
    basis: string;
    mode: "percentage" | "per_session" | "fixed" | null;
  }[];
  statements: BusinessStatement[];
  earnings: BusinessEarning[];
  payouts: BusinessPayout[];
  disputes: BusinessDispute[];
  adjustments: {
    id: string;
    earning_id: string;
    amount_minor: string;
    reason: string;
  }[];
  memberships: {
    id: string;
    revision: number;
    branch_id: string;
    granted: number | null;
    consumed: number;
    display_name: string;
    title: string;
  }[];
  allocations: {
    membership_id: string;
    branch_id: string;
    amount_minor: string;
    basis_points: number;
  }[];
  comparison?: {
    id: string;
    name: string;
    sold_minor: string;
    allocated_minor: string;
    members: number;
  }[];
  report?: {
    sold_minor: string;
    collected_minor: string;
    unique_members: number;
    renewals: number;
    renewal_denominator: number;
    capacity: string;
  };
  prices?: {
    kind: "class" | "course" | "court" | "access" | "membership" | "program";
    amount_minor: string;
    revision: number;
    branch_id: string | null;
  }[];
  services?: { id: string; title: string; branch_id: string; kind: string }[];
};
const root = (surface: AdvancedSurface) =>
  surface === "coach" ? "profile/settlements" : `${surface}/advanced`;
export function useAdvanced(surface: AdvancedSurface, scope: AdvancedScope) {
  return useApiQuery<AdvancedData>(
    (s) => [...s, "advanced-business", surface, scope],
    (api, signal) =>
      api.request(
        { method: "GET", path: root(surface), query: scope },
        { signal },
      ),
    !!scope.organizationId,
    30000,
  );
}
export function useSettlementOrganizations(enabled: boolean) {
  return useApiQuery<{ id: string; name: string }[]>(
    (s) => [...s, "advanced-business", "coach-organizations"],
    (api, signal) =>
      api.request(
        { method: "GET", path: "profile/settlements/organizations" },
        { signal },
      ),
    enabled,
  );
}
export function useAdvancedCommand(surface: AdvancedSurface) {
  return useApiMutation<
    unknown,
    { path: string; body: Record<string, unknown> }
  >(
    (api, v) =>
      api.request({
        method: "POST",
        path: `${root(surface)}/${v.path}`,
        body: v.body,
      }),
    [["advanced-business"], ["business"], ["sports"], ["analytics"]],
  );
}

export function useAdvancedOptions(surface: AdvancedSurface) {
  return useApiQuery<{
    organizations: {
      id: string;
      name: string;
      role: string | null;
      all_branches: boolean;
    }[];
    branches: { id: string; organization_id: string; name: string }[];
  }>(
    (s) => [...s, "advanced-business", "options", surface],
    (api, signal) =>
      api.request(
        { method: "GET", path: `${root(surface)}/options` },
        { signal },
      ),
  );
}
