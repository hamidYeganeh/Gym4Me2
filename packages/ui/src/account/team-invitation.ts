import { changeReasonError, type ChangeReasonError } from "./change-reason";
import { normalizeLoginPhone } from "./login-validation";

export type TeamInvitationErrors = {
  reason?: ChangeReasonError;
  phone?: "AuthValidation.phoneRequired" | "AuthValidation.phoneInvalid";
  scope?: "StaffScope.chooseBranches" | "StaffScope.refreshBranches";
};

/** A selected scope must still belong to the loaded organization, never silently broaden. */
export function teamInvitationErrors({
  phone,
  reason,
  allBranches,
  branchIds,
  availableBranchIds,
}: {
  phone: string;
  reason: string;
  allBranches: boolean;
  branchIds: readonly string[];
  availableBranchIds: readonly string[] | undefined;
}): TeamInvitationErrors {
  const errors: TeamInvitationErrors = {};
  if (!phone.trim()) errors.phone = "AuthValidation.phoneRequired";
  else if (!/^\+989\d{9}$/.test(normalizeLoginPhone(phone)))
    errors.phone = "AuthValidation.phoneInvalid";
  if (!allBranches) {
    if (!availableBranchIds) errors.scope = "StaffScope.refreshBranches";
    else if (
      branchIds.length === 0 ||
      branchIds.length > 100 ||
      new Set(branchIds).size !== branchIds.length ||
      branchIds.some((id) => !availableBranchIds.includes(id))
    )
      errors.scope = "StaffScope.chooseBranches";
  }
  const issue = changeReasonError(reason);
  if (issue) errors.reason = issue;
  return errors;
}
