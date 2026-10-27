import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  workspaceNavigation,
  workspaceSecondaryNavigation,
  isWorkspaceRouteActive,
} from "../../../packages/ui/src/account/workspace-navigation";
for (const surface of ["business", "admin"] as const) {
  test(`${surface} navigation exposes unique, existing routes across all workspace sections`, () => {
    const context = {
      manage: true,
      operate: true,
      finance: true,
      businessReady: true,
      multipleBranches: true,
      messages: true,
      teamInvites: true,
    };
    const nav = [
      ...workspaceNavigation(surface, context),
      ...(surface === "business" ? workspaceSecondaryNavigation(context) : []),
    ];
    assert.equal(new Set(nav.map((i) => i.href)).size, nav.length);
    for (const item of nav)
      assert.ok(
        existsSync(
          resolve(
            __dirname,
            `../../${surface}/app`,
            `.${item.href}`,
            "page.tsx",
          ),
        ),
        `${surface}: ${item.href}`,
      );
    for (const group of ["work", "management", "finance", "account"])
      assert.ok(nav.some((i) => i.group === group));
  });
}
test("nested records keep their parent active without matching unrelated prefixes", () => {
  assert.equal(
    isWorkspaceRouteActive("/organizations/a/branches/b", "/organizations"),
    true,
  );
  assert.equal(
    isWorkspaceRouteActive("/organizations-other", "/organizations"),
    false,
  );
  assert.equal(isWorkspaceRouteActive("/advanced", "/"), false);
  assert.equal(isWorkspaceRouteActive("/", "/"), true);
});

test("new accounts only see setup and account destinations", () => {
  assert.deepEqual(
    workspaceNavigation("business").map((i) => i.key),
    ["overview", "organizations", "profile", "sessions"],
  );
  assert.deepEqual(workspaceSecondaryNavigation(), []);
});
test("advanced tools appear only when relevant and stay out of everyday navigation", () => {
  const owner = { manage: true, operate: true, finance: true };
  const main = workspaceNavigation("business", owner).map((i) => i.key);
  for (const key of [
    "crm",
    "advanced",
    "branches",
    "invitations",
    "sports-messages",
    "training",
  ])
    assert.ok(!main.includes(key));
  assert.ok(
    !workspaceSecondaryNavigation(owner).some((i) =>
      ["crm", "advanced", "branches"].includes(i.key),
    ),
  );
  const established = workspaceSecondaryNavigation({
    ...owner,
    businessReady: true,
    multipleBranches: true,
  }).map((i) => i.key);
  for (const key of ["crm", "advanced", "branches"])
    assert.ok(established.includes(key));
  const accountant = workspaceSecondaryNavigation({
    finance: true,
    businessReady: true,
  }).map((i) => i.key);
  assert.deepEqual(accountant, ["advanced"]);
  const receptionist = workspaceNavigation("business", { operate: true }).map(
    (i) => i.key,
  );
  assert.ok(receptionist.includes("reception"));
  assert.ok(!receptionist.includes("payments"));
});
