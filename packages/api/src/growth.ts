"use client";
import { useApiMutation, useApiQuery } from "./query";
import type { QueryParams } from "./transport";
export type LeadStage = "new" | "contacted" | "trial" | "won" | "lost";
export type CrmLead = {
  id: string;
  name: string;
  phone: string;
  stage: LeadStage;
  note: string;
  follow_up_at: string | null;
  revision: number;
};
export type CrmCampaign = {
  id: string;
  title: string;
  body: string;
  stage: LeadStage | "all";
  status: "draft" | "sent";
  revision: number;
  delivered: number;
  sent_at: string | null;
};
export type CrmData = {
  leads: CrmLead[];
  campaigns: CrmCampaign[];
  funnel: { stage: LeadStage; count: number; overdue: number }[];
  hasMore: boolean;
};
export type CrmBranch = {
  id: string;
  organization_id: string;
  name: string;
  organization_name: string;
  role: "owner" | "manager" | "receptionist";
};
export type CampaignPreview = {
  count: number;
  audienceHash: string;
  revision: number;
};
export function useGrowthQuery<T>(
  path: string,
  query: QueryParams = {},
  enabled = true,
) {
  return useApiQuery<T>(
    (s) => [...s, "growth", path, query],
    (api, signal) => api.request({ method: "GET", path, query }, { signal }),
    enabled,
  );
}
export function useGrowthCommand<T = unknown>() {
  return useApiMutation<T, { path: string; body: Record<string, unknown> }>(
    (api, v) => api.request({ method: "POST", path: v.path, body: v.body }),
    [
      ["growth"],
      ["sports"],
      ["training"],
      ["advanced-business"],
      ["analytics"],
    ],
  );
}
