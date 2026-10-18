import assert from "node:assert/strict";
import test from "node:test";
import { teamInvitationErrors } from "../../../packages/ui/src/account/team-invitation";

const valid = {
  phone: "۰۹۱۲۳۴۵۶۷۸۹",
  allBranches: false,
  branchIds: ["a"],
  availableBranchIds: ["a", "b"],
};
test("staff invitations accept server-supported phone formats and an explicit current branch", () => {
  for (const phone of [
    "۰۹۱۲۳۴۵۶۷۸۹",
    "09123456789",
    "+98 (912) 345-6789",
    "00989123456789",
  ])
    assert.deepEqual(teamInvitationErrors({ ...valid, phone }), {});
  assert.deepEqual(teamInvitationErrors({ ...valid, phone: " " }), {
    phone: "AuthValidation.phoneRequired",
  });
  for (const phone of ["12345", "0912abc6789", "+9891234567890"])
    assert.deepEqual(teamInvitationErrors({ ...valid, phone }), {
      phone: "AuthValidation.phoneInvalid",
    });
});
test("restricted grants never accept an empty, stale, duplicated or oversized selection", () => {
  for (const branchIds of [
    [],
    ["other-organization"],
    ["a", "a"],
    Array(101).fill("a"),
  ])
    assert.deepEqual(teamInvitationErrors({ ...valid, branchIds }), {
      scope: "StaffScope.chooseBranches",
    });
  assert.deepEqual(teamInvitationErrors({ ...valid, availableBranchIds: [] }), {
    scope: "StaffScope.chooseBranches",
  });
});
test("unavailable branch reads block restricted grants without changing them to all branches", () => {
  assert.deepEqual(
    teamInvitationErrors({ ...valid, availableBranchIds: undefined }),
    { scope: "StaffScope.refreshBranches" },
  );
  assert.deepEqual(
    teamInvitationErrors({
      ...valid,
      allBranches: true,
      branchIds: [],
      availableBranchIds: undefined,
    }),
    {},
  );
});
