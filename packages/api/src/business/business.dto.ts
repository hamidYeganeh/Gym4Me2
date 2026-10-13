export type OrganizationRole =
  "owner" | "manager" | "receptionist" | "accountant";
export type TeamRole = Exclude<OrganizationRole, "owner">;
export type OrganizationStatus =
  "pending" | "approved" | "rejected" | "suspended";
export type OrganizationDto = {
  id: string;
  name: string;
  slug?: string;
  status: OrganizationStatus;
  role: OrganizationRole;
  allBranches: boolean;
  reviewReason: string | null;
  createdAt?: string;
};
export type OrganizationRecordDto = {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
};
export type BranchDto = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  createdAt: string;
};
export type NameDto = { name: string };
export type TeamMemberDto = {
  id: string;
  phone: string;
  displayName: string | null;
  role: OrganizationRole;
  allBranches: boolean;
  branchIds: string[];
};
export type TeamInvitationDto = {
  id: string;
  phone: string;
  role: TeamRole;
  expiresAt: string;
  allBranches: boolean;
  branchIds: string[];
};
export type TeamDto = {
  members: TeamMemberDto[];
  invitations: TeamInvitationDto[];
};
export type InviteTeamDto = {
  phone: string;
  role: TeamRole;
  branchIds?: string[];
};
export type CoachInvitationDto = {
  coachId: string;
  sportId?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
};
export type ReplyReviewDto = { reply: string };
export type PublicationAction = "submit" | "publish" | "hide" | "archive";
export type AffiliationRecordDto = {
  id: string;
  branchId: string;
  coachId: string;
  sportId: string | null;
  startsOn: string | null;
  endsOn: string | null;
  status: "pending" | "active" | "ended";
  createdAt: string;
  updatedAt: string;
};
