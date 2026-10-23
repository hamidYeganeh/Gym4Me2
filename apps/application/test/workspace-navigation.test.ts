import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  workspaceNavigation,
  isWorkspaceRouteActive,
} from "../../../packages/ui/src/account/workspace-navigation";
for (const surface of ["business", "admin"] as const) {
  test(`${surface} navigation exposes unique, existing routes across all workspace sections`, () => {
    const nav = workspaceNavigation(surface);
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
