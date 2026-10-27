import assert from "node:assert/strict";
import test from "node:test";
import {
  isPrimaryService,
  primaryNavigationSection,
} from "../lib/product-scope";
import { membershipAccess } from "../lib/membership-access";
import type { MembershipDto } from "@repo/api/sports";

test("gym services are primary while program purchases remain secondary", () => {
  for (const kind of ["membership", "access", "class", "course", "court"])
    assert.equal(isPrimaryService(kind), true);
  assert.equal(isPrimaryService("program"), false);
  assert.equal(primaryNavigationSection("/memberships/detail"), "memberships");
  assert.equal(primaryNavigationSection("/bookings/detail"), "bookings");
  assert.equal(primaryNavigationSection("/coaching"), null);
});

test("entry is not offered for expired, future, exhausted, overdue or reservation-only memberships", () => {
  const now = Date.parse("2026-10-27T12:00:00Z");
  const m = {
    status: "active",
    granted: 5,
    consumed: 1,
    held: 1,
    startsAt: "2026-10-26T12:00:00Z",
    endsAt: "2026-10-28T12:00:00Z",
  } as MembershipDto;
  assert.equal(membershipAccess(m, now), "active");
  assert.equal(
    membershipAccess({ ...m, endsAt: new Date(now).toISOString() }, now),
    "expired",
  );
  assert.equal(
    membershipAccess({ ...m, startsAt: "2026-10-28T12:00:00Z" }, now),
    "notStarted",
  );
  assert.equal(membershipAccess({ ...m, consumed: 4 }, now), "exhausted");
  assert.equal(
    membershipAccess({ ...m, paymentOverdue: true }, now),
    "paymentOverdue",
  );
  assert.equal(
    membershipAccess(
      { ...m, offering: { entryAllowed: false } as MembershipDto["offering"] },
      now,
    ),
    "reservationRequired",
  );
  assert.equal(membershipAccess({ ...m, endsAt: "invalid" }, now), "expired");
  assert.equal(
    membershipAccess({ ...m, granted: null, consumed: 100 }, now),
    "active",
  );
});
