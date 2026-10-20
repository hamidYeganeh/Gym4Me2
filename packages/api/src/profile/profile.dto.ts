import type { Account } from "../auth/auth.dto";
import type {
  OrganizationDto,
  OrganizationRole,
} from "../business/business.dto";
export type { Account };
export type UpdateAccountDto = {
  displayName?: string | null;
  profilePublic?: boolean;
};
export type AccessDto = { organizations: OrganizationDto[]; isAdmin: boolean };
export type Invitation = {
  id: string;
  organizationName: string;
  role: OrganizationRole;
  expiresAt: string;
};
export type CoachProfileDto = {
  userId: string;
  biography: string | null;
  createdAt: string;
  updatedAt: string;
};
export type UpdateCoachDto = { biography: string | null };
export type AffiliationDto = {
  id: string;
  branchId: string;
  branchName: string;
  clubId: string;
  status: "pending" | "active" | "ended";
  startsOn: string | null;
  endsOn: string | null;
  sportId: string | null;
};

import type { DataPolicyDto } from "../system/system.dto";
export type { DataPolicyDto } from "../system/system.dto";
export type PrivacyDto = {
  policy: DataPolicyDto;
  marketingConsent: boolean;
  profilePublic: boolean;
  acceptedAt: string | null;
  acceptanceRequired: boolean;
  canRequestDeletion: boolean;
  deletion: {
    status: "pending" | "cancelled" | "processed";
    requestedAt: string;
    eligibleAfter: string;
    processedAt: string | null;
  } | null;
};
export type UpdatePrivacyDto = {
  policyVersion?: string;
  acceptPolicy?: true;
  confirmMinimumAge?: true;
  marketingConsent?: boolean;
  hidePublicProfile?: true;
};
