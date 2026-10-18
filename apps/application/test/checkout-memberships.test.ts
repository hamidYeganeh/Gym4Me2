import assert from "node:assert/strict";
import test from "node:test";
import {
  remainingMembershipSessions,
  usableCheckoutMemberships,
} from "../lib/checkout-memberships";
import { checkoutMembershipFixtures } from "./fixtures/checkout-memberships";
import { publicServiceFixtures } from "./fixtures/public-services";

const now = new Date("2026-10-17T05:30:00Z");
const services = publicServiceFixtures(now);
const memberships = checkoutMembershipFixtures(services, now);
const service = services[0]!;
const valid = memberships[0]!;

test("remaining allowance subtracts both consumed and reserved sessions", () => {
  assert.equal(remainingMembershipSessions(valid), 8);
  assert.equal(remainingMembershipSessions({ ...valid, granted: 1 }), 0);
  assert.equal(remainingMembershipSessions({ ...valid, granted: null }), null);
});

test("single-session checkout excludes expired, frozen, empty and foreign memberships", () => {
  assert.deepEqual(
    usableCheckoutMemberships(service, memberships, +now).map((m) => m.id),
    memberships.slice(0, 3).map((m) => m.id),
  );
});

test("the whole course needs enough unreserved sessions", () => {
  const course = services[1]!;
  assert.deepEqual(
    usableCheckoutMemberships(course, memberships, +now).map((m) => m.id),
    [memberships[0]!.id, memberships[2]!.id],
  );
  assert.equal(
    usableCheckoutMemberships(course, [{ ...valid, held: 3 }], +now).length,
    0,
  );
});

test("expiry is exclusive and malformed dates do not create entitlement", () => {
  assert.equal(
    usableCheckoutMemberships(
      service,
      [{ ...valid, endsAt: now.toISOString() }],
      +now,
    ).length,
    0,
  );
  assert.equal(
    usableCheckoutMemberships(service, [{ ...valid, endsAt: "invalid" }], +now)
      .length,
    0,
  );
  assert.equal(
    usableCheckoutMemberships(
      service,
      [{ ...valid, endsAt: new Date(+now + 1).toISOString() }],
      +now,
    ).length,
    1,
  );
});

test("an active row still cannot be used during a future or malformed freeze", () => {
  for (const freezeUntil of [new Date(+now + 1).toISOString(), "invalid"]) {
    assert.equal(
      usableCheckoutMemberships(service, [{ ...valid, freezeUntil }], +now)
        .length,
      0,
    );
  }
  assert.equal(
    usableCheckoutMemberships(
      service,
      [{ ...valid, freezeUntil: now.toISOString() }],
      +now,
    ).length,
    1,
  );
});
