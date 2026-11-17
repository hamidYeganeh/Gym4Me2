import assert from "node:assert/strict";
import { test } from "node:test";

import { occupied, readSchedule, reserve, validateSession } from "./session-store.ts";

const now = Date.parse("2026-11-14T10:00:00Z");
const session = {
  id: "class",
  clubId: "club",
  name: "Strength",
  kind: "Group class",
  instructor: "Alex",
  startsAt: "2026-11-15T10:00:00Z",
  endsAt: "2026-11-15T11:00:00Z",
  location: "Studio",
  description: "",
  capacity: 1,
  price: 0,
  approval: false,
  waitlist: true,
  visibility: "Public",
  cover: "",
};
const input = { sessionId: "class", name: "Member", phone: "09123456789", notes: "" };
test("confirms available spots and normalizes member phone", () => {
  const result = reserve(
    { sessions: [session], reservations: [] },
    { ...input, phone: " ۰۹۱۲۳۴۵۶۷۸۹ " },
    now,
  );
  assert.equal(result.status, "confirmed");
  assert.equal(result.phone, "+989123456789");
});
test("approval reservations occupy capacity; waitlisted reservations do not", () => {
  const data = { sessions: [{ ...session, approval: true }], reservations: [] };
  const pending = reserve(data, input, now);
  assert.equal(pending.status, "pending");
  data.reservations.push(pending);
  const waiting = reserve(data, { ...input, phone: "09123456780" }, now);
  assert.equal(waiting.status, "waitlisted");
  data.reservations.push(waiting);
  assert.equal(occupied(data, "class"), 1);
});
test("full classes without waitlists reject reservations", () => {
  const first = reserve({ sessions: [session], reservations: [] }, input, now);
  assert.throws(
    () =>
      reserve(
        { sessions: [{ ...session, waitlist: false }], reservations: [first] },
        { ...input, phone: "09123456781" },
        now,
      ),
    /full/,
  );
});
test("duplicate phones are rejected across international and local formats", () => {
  const first = reserve({ sessions: [session], reservations: [] }, input, now);
  assert.throws(
    () =>
      reserve(
        { sessions: [session], reservations: [first] },
        { ...input, phone: "+989123456789" },
        now,
      ),
    /already/,
  );
});
test("missing and started sessions cannot receive reservations", () => {
  assert.throws(() => reserve({ sessions: [], reservations: [] }, input, now), /no longer/);
  assert.throws(
    () => reserve({ sessions: [session], reservations: [] }, input, Date.parse(session.startsAt)),
    /no longer/,
  );
});
test("session validation rejects invalid time ranges and capacity", () => {
  assert.doesNotThrow(() => validateSession(session, now));
  for (const change of [
    { endsAt: session.startsAt },
    { startsAt: "bad" },
    { capacity: 0 },
    { capacity: 1.5 },
    { price: -1 },
    { name: " " },
    { startsAt: "2026-11-13T10:00:00Z" },
  ])
    assert.throws(() => validateSession({ ...session, ...change }, now));
});
test("malformed browser storage safely becomes an empty schedule", () => {
  for (const value of ["not json", "null", "{}", '{"sessions":[null,{}],"reservations":[null,{}]}'])
    assert.deepEqual(readSchedule(value), { sessions: [], reservations: [] });
});
