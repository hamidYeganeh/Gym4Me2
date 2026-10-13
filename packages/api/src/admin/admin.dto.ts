import type { Account, UserStatus } from "../auth/auth.dto";
import type {
  OrganizationStatus,
  OrganizationRole,
} from "../business/business.dto";
import type {
  PageDto,
  PublicationStatus,
  ReviewDto,
  ReviewStatus,
  SaveTaxonomyDto,
  TaxonomyKind,
} from "../catalog/catalog.dto";
export type AdminUserDto = Account & { createdAt: string; isAdmin: boolean };
export type AdminUserFiltersDto = PageDto & {
  search?: string;
  status?: UserStatus;
};
export type UserStatusDto = { status: UserStatus; reason: string };
export type AdminOrganizationDto = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  reviewReason: string | null;
  createdAt: string;
  publicationStatus: PublicationStatus | null;
};
export type AdminOrganizationFiltersDto = PageDto & {
  search?: string;
  status?: OrganizationStatus;
  publicationStatus?: PublicationStatus;
};
export type OrganizationDecisionDto = {
  status: Exclude<OrganizationStatus, "pending">;
  reason: string;
};
export type AdminOrganizationDetailDto = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  hasCatalog: boolean;
  members: {
    id: string;
    userId: string;
    displayName: string | null;
    role: OrganizationRole;
  }[];
  branches: { id: string; name: string; timezone: string }[];
};
export type AdminUserDetailDto = AdminUserDto & {
  phoneVerifiedAt: string | null;
  coach: { biography: string | null } | null;
  memberships: {
    id: string;
    organizationId: string;
    name: string;
    role: OrganizationRole;
  }[];
  sessions: {
    id: string;
    client: string;
    device: string;
    createdAt: string;
    expiresAt: string;
    revokedAt: string | null;
  }[];
};
export type AdminOverviewDto = {
  users: number;
  organizations: number;
  pending: number;
  published: number;
  pendingPublication: number;
  pendingReviews: number;
  recent: {
    id: string;
    action: string;
    createdAt: string;
    reason: string | null;
  }[];
};
export type AuditFiltersDto = PageDto & {
  action?: string;
  actorId?: string;
  organizationId?: string;
  from?: string;
  to?: string;
};
export type AuditEventDto = {
  id: string;
  action: string;
  actorId: string | null;
  actorName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};
export type TaxonomyFiltersDto = PageDto & { search?: string };
export type SaveAdminTaxonomyDto = {
  kind: TaxonomyKind;
  id?: string;
  input: SaveTaxonomyDto | Partial<SaveTaxonomyDto>;
};
export type AdminReviewDto = ReviewDto & {
  authorName: string | null;
  organizationId: string;
  organizationName: string;
  branchName: string;
};
export type ModerationFiltersDto = PageDto & { status?: ReviewStatus };
export type ModerateReviewDto = {
  status: "published" | "rejected";
  reason: string;
  expectedStatus?: ReviewStatus;
};
