import assert from "node:assert/strict";
import test from "node:test";
import { checkoutIssue } from "../lib/checkout-availability";
import { publicServiceFixtures } from "./fixtures/public-services";

const now = new Date("2026-10-17T05:30:00Z");
const services = publicServiceFixtures(now);
const session = services[0]!.occurrences[0]!;

test("a membership purchase does not require a session", () => {
  assert.equal(checkoutIssue(services[3]!, null, +now), null);
});

test("a missing or foreign session cannot continue checkout", () => {
  assert.equal(
    checkoutIssue(services[0]!, null, +now),
    "checkoutChooseSession",
  );
  assert.equal(
    checkoutIssue(services[0]!, services[2]!.occurrences[0]!.id, +now),
    "checkoutChooseSession",
  );
});

test("the last available seat is allowed but a full session is blocked", () => {
  const court = services[2]!;
  assert.equal(checkoutIssue(court, court.occurrences[0]!.id, +now), null);
  assert.equal(
    checkoutIssue(services[0]!, services[0]!.occurrences[1]!.id, +now),
    "checkoutSessionFull",
  );
});

test("a blocked resource is distinct from a full session", () => {
  assert.equal(
    checkoutIssue(services[0]!, services[0]!.occurrences[2]!.id, +now),
    "resourceUnavailableSlot",
  );
});

test("registration closes at the start instant; cancelled or invalid times fail closed", () => {
  const service = services[0]!;
  assert.equal(
    checkoutIssue(service, session.id, Date.parse(session.startAt) - 1),
    null,
  );
  assert.equal(
    checkoutIssue(service, session.id, Date.parse(session.startAt)),
    "checkoutSessionUnavailable",
  );
  for (const change of [{ status: "cancelled" }, { startAt: "invalid" }]) {
    assert.equal(
      checkoutIssue(
        { ...service, occurrences: [{ ...session, ...change }] },
        session.id,
        +now,
      ),
      "checkoutSessionUnavailable",
    );
  }
});

test("a course cannot continue when another session has lost capacity or its resource", () => {
  const course = services[1]!;
  const selected = course.occurrences[0]!;
  assert.equal(checkoutIssue(course, selected.id, +now), null);
  for (const change of [{ remaining: 0 }, { resourceAvailable: false }]) {
    const changed = {
      ...course,
      occurrences: course.occurrences.map((item, index) =>
        index === 1 ? { ...item, ...change } : item,
      ),
    };
    assert.equal(
      checkoutIssue(changed, selected.id, +now),
      "checkoutCourseUnavailable",
    );
  }
});
