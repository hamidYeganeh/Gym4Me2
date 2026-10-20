import assert from "node:assert/strict";
import test from "node:test";
import { changeReasonError } from "../../../packages/ui/src/account/change-reason";
import { teamInvitationErrors } from "../../../packages/ui/src/account/team-invitation";

test("sensitive changes require a trimmed, bounded human reason", () => {
  for (const value of ["", "  ", "ab", "  ab  "])
    assert.equal(changeReasonError(value), "AuditReason.tooShort");
  assert.equal(changeReasonError("x".repeat(501)), "AuditReason.tooLong");
  for (const value of ["  علت  ", "x".repeat(500)])
    assert.equal(changeReasonError(value), undefined);
  assert.deepEqual(
    teamInvitationErrors({
      phone: "09123456789",
      reason: " ",
      allBranches: true,
      branchIds: [],
      availableBranchIds: undefined,
    }),
    { reason: "AuditReason.tooShort" },
  );
});
