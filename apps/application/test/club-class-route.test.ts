import assert from "node:assert/strict";
import test from "node:test";
import { belongsToClubClass, clubClassPath } from "../lib/club-class-route";
import { applicationRouteLayout } from "../lib/navigation-route";
test("nested classes are scoped to both the club and service kind", () => {
  assert.equal(
    belongsToClubClass({ organizationId: "atlas", kind: "class" }, "atlas"),
    true,
  );
  assert.equal(
    belongsToClubClass({ organizationId: "other", kind: "class" }, "atlas"),
    false,
  );
  assert.equal(
    belongsToClubClass(
      { organizationId: "atlas", kind: "membership" },
      "atlas",
    ),
    false,
  );
});
test("club class list and detail paths retain their parent and encode identifiers", () => {
  assert.equal(clubClassPath("atlas"), "/club/atlas/classes");
  assert.equal(
    clubClassPath("atlas", "class-123"),
    "/discovery/clubs/atlas/classess/class-123",
  );
  assert.equal(
    clubClassPath("a/b", "c/d"),
    "/discovery/clubs/a%2Fb/classess/c%2Fd",
  );
});
test("discovery directories and nested details have no primary bottom navigation", () => {
  for (const path of [
    "/discovery/clubs",
    "/discovery/coaches",
    "/discovery/coaches/coach-123",
    clubClassPath("atlas"),
    clubClassPath("atlas", "class-123"),
  ])
    assert.equal(applicationRouteLayout(path, "").navigationVisible, false);
});

import { applicationRouteRequiresAccount } from "../../../packages/ui/src/lib/auth-routes";
test("club classes are public while private club routes stay protected", () => {
  assert.equal(applicationRouteRequiresAccount("/club/madar/classes"), false);
  assert.equal(applicationRouteRequiresAccount("/club/madar/settings"), true);
});
