"use client";
import type * as dto from "./admin.dto";
import type * as catalog from "../catalog/catalog.dto";
import { adminClients } from "./admin.clients";
import { adminKeys } from "./admin.keys";
import { useApiQuery, useApiMutation } from "../query";

export function useAdminOverview() {
  return useApiQuery(
    (scope) => adminKeys(scope).overview(),
    (api, signal) => adminClients.overview(api, { signal }),
  );
}
export function useAdminUsers(filters: dto.AdminUserFiltersDto = {}) {
  return useApiQuery(
    (scope) => adminKeys(scope).users(filters),
    (api, signal) => adminClients.users(api, filters, { signal }),
  );
}
export function useAdminUser(id: string | undefined) {
  return useApiQuery(
    (scope) => adminKeys(scope).user(id),
    (api, signal) => adminClients.user(api, id ?? "", { signal }),
    Boolean(id),
  );
}
export function useAdminOrganizations(
  filters: dto.AdminOrganizationFiltersDto = {},
) {
  return useApiQuery(
    (scope) => adminKeys(scope).organizations(filters),
    (api, signal) => adminClients.organizations(api, filters, { signal }),
  );
}
export function useAdminOrganization(id: string | undefined) {
  return useApiQuery(
    (scope) => adminKeys(scope).organization(id),
    (api, signal) => adminClients.organization(api, id ?? "", { signal }),
    Boolean(id),
  );
}
export function useAdminClub(id: string | undefined, enabled = true) {
  return useApiQuery(
    (scope) => adminKeys(scope).club(id),
    (api, signal) => adminClients.club(api, id ?? "", { signal }),
    Boolean(id) && enabled,
  );
}
export function useAdminReadiness(id: string | undefined, enabled = true) {
  return useApiQuery(
    (scope) => adminKeys(scope).readiness(id),
    (api, signal) => adminClients.readiness(api, id ?? "", { signal }),
    Boolean(id) && enabled,
  );
}
export function useAdminBranch(
  id: string | undefined,
  branchId: string | undefined,
  enabled = true,
) {
  return useApiQuery(
    (scope) => adminKeys(scope).branch(id, branchId),
    (api, signal) =>
      adminClients.branch(api, id ?? "", branchId ?? "", { signal }),
    Boolean(id && branchId) && enabled,
  );
}
export function useAdminAudit(filters: dto.AuditFiltersDto = {}) {
  return useApiQuery(
    (scope) => adminKeys(scope).audit(filters),
    (api, signal) => adminClients.audit(api, filters, { signal }),
  );
}
export function useAdminTaxonomies(
  kind: catalog.TaxonomyKind,
  filters: dto.TaxonomyFiltersDto = {},
) {
  return useApiQuery(
    (scope) => adminKeys(scope).taxonomies(kind, filters),
    (api, signal) => adminClients.taxonomies(api, kind, filters, { signal }),
  );
}
export function useAdminLocations(
  kind: catalog.GeographyKind,
  parentId?: string,
) {
  return useApiQuery(
    (scope) => adminKeys(scope).locations(kind, parentId),
    (api, signal) => adminClients.locations(api, kind, parentId, { signal }),
    kind === "countries" || Boolean(parentId),
  );
}
export function useAdminReviews(filters: dto.ModerationFiltersDto = {}) {
  return useApiQuery(
    (scope) => adminKeys(scope).reviews(filters),
    (api, signal) => adminClients.reviews(api, filters, { signal }),
  );
}
export function useSetUserStatus() {
  return useApiMutation(
    (api, input: { id: string; input: dto.UserStatusDto }) =>
      adminClients.setUserStatus(api, input.id, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useReviewOrganization() {
  return useApiMutation(
    (api, input: { id: string; input: dto.OrganizationDecisionDto }) =>
      adminClients.reviewOrganization(api, input.id, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useReviewClub() {
  return useApiMutation(
    (api, input: { id: string; input: dto.OrganizationDecisionDto }) =>
      adminClients.reviewClub(api, input.id, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useCreateTaxonomy() {
  return useApiMutation(
    (
      api,
      input: { kind: catalog.TaxonomyKind; input: catalog.SaveTaxonomyDto },
    ) => adminClients.createTaxonomy(api, input.kind, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useUpdateTaxonomy() {
  return useApiMutation(
    (
      api,
      input: {
        kind: catalog.TaxonomyKind;
        id: string;
        input: Partial<catalog.SaveTaxonomyDto>;
      },
    ) => adminClients.updateTaxonomy(api, input.kind, input.id, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useCreateLocation() {
  return useApiMutation(
    (api, input: catalog.CreatePlaceDto) =>
      adminClients.createLocation(api, input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useUpdateLocation() {
  return useApiMutation(
    (
      api,
      input: {
        kind: catalog.GeographyKind;
        id: string;
        input: { name: string };
      },
    ) => adminClients.updateLocation(api, input.kind, input.id, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
export function useModerateReview() {
  return useApiMutation(
    (api, input: { id: string; input: dto.ModerateReviewDto }) =>
      adminClients.moderateReview(api, input.id, input.input),
    [["admin"], ["catalog"], ["profile"]],
  );
}
