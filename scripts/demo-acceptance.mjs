import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Explicit opt-in: this writes synthetic purchases/relationships in the named demo.
if (process.env.GYM4ME_DEMO_ACCEPTANCE !== "gym4me-demo")
  throw new Error(
    "Set GYM4ME_DEMO_ACCEPTANCE=gym4me-demo to exercise the shared demo.",
  );
const base = "https://gym4me-demo-api.vercel.app";
const web = (surface) => `https://gym4me-demo-${surface}.vercel.app`;
async function request(session, path, body, expected, attempt = 0) {
  const response = await fetch(`${base}/api/v1/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gym-client": session.surface,
      Origin: web(session.surface),
      ...(session.cookie ? { Cookie: session.cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(45000),
  });
  const data = await response.json();
  if (
    response.status === 429 &&
    path === "auth/otp/request" &&
    data.code === "Backend.waitOneMinuteBeforeResending" &&
    attempt === 0
  ) {
    console.log(
      "Waiting for the normal synthetic-account OTP resend cooldown.",
    );
    await new Promise((resolve) => setTimeout(resolve, 61000));
    return request(session, path, body, expected, attempt + 1);
  }
  if (expected)
    assert.equal(response.status, expected, `${path}: unexpected status`);
  else
    assert(
      response.ok,
      `${path}: ${response.status} ${JSON.stringify(data).slice(0, 250)}`,
    );
  return {
    data,
    cookie: response.headers
      .getSetCookie()
      .map((x) => x.split(";")[0])
      .join("; "),
  };
}
async function login(phone, surface = "application") {
  const session = { surface };
  const { data: challenge } = await request(session, "auth/otp/request", {
    phone,
  });
  const result = await request(session, "auth/otp/verify", {
    challengeId: challenge.challengeId,
    code: "11111",
  });
  session.cookie = result.cookie;
  assert(session.cookie);
  const { data: account } = await request(session, "profile/account");
  session.id = account.id;
  const { data: policy } = await request(session, "system/policy");
  await request(session, "profile/account/privacy/preferences", {
    policyVersion: policy.version,
    acceptPolicy: true,
    confirmMinimumAge: true,
  });
  return session;
}
async function dashboard(session) {
  return (await request(session, "profile/coaching")).data;
}
async function answer(session, row, action, expected) {
  return request(
    session,
    `profile/coaching/relationships/${row.id}`,
    {
      action,
      revision: row.revision,
    },
    expected,
  );
}
const coach = await login("09000000008");
const athlete = await login("09000000003");
const stranger = await login("09000000005");
const owner = await login("09000000001", "business");
const reception = await login("09000000006", "business");
const accountant = await login("09000000007", "business");
const foreignOwner = await login("09000000002", "business");
let own = await dashboard(coach);
assert(own.profile);
let row = (await dashboard(athlete)).items.find((x) => x.coachId === coach.id);
if (row && ["pending", "active"].includes(row.status))
  await answer(coach, row, "end");
const invitations = await Promise.all(
  [1, 2].map(() =>
    request(coach, "profile/coaching/invitations", { phone: "09000000003" }),
  ),
);
assert.equal(invitations[0].data.id, invitations[1].data.id);
row = (await dashboard(athlete)).items.find(
  (x) => x.id === invitations[0].data.id,
);
assert(row);
assert(!Object.keys(row).some((key) => /phone|medical|email/.test(key)));
await answer(coach, row, "accept", 403);
await answer(stranger, row, "accept", 404);
await request(owner, "profile/coaching", undefined, 403);
await request(
  coach,
  "profile/coaching/invitations",
  { phone: "09000000008" },
  409,
);
await answer(athlete, { ...row, revision: row.revision + 100 }, "accept", 409);
await answer(athlete, row, "decline");
await request(coach, "profile/coaching/invitations", { phone: "09000000003" });
let reopened = (await dashboard(athlete)).items.find((x) => x.id === row.id);
await answer(athlete, row, "accept", 409);
await answer(athlete, reopened, "accept");
await answer(athlete, reopened, "accept"); // idempotent retry
row = (await dashboard(coach)).items.find((x) => x.id === row.id);
assert.equal(row.status, "active");
await answer(coach, row, "end");
await answer(athlete, reopened, "accept", 409);
assert(!(await dashboard(stranger)).items.some((x) => x.id === row.id));
// Leave one fresh invitation for testing acceptance from the UI.
await request(coach, "profile/coaching/invitations", { phone: "09000000003" });
console.log(
  "PASS PH3: duplicate/concurrent invite, recipient-only answer, third-account isolation, stale version, decline, accept, end, no implicit private-record access.",
);

const { data: organizations } = await request(owner, "business/organizations");
const { data: catalog } = await request(athlete, "sports/services");
const membershipService = catalog.find(
  (x) =>
    x.kind === "membership" &&
    !x.coachUserId &&
    x.organizationId === organizations[0].id,
);
assert(membershipService, "Demo membership service missing");
const input = { serviceId: membershipService.id };
const { data: quote } = await request(athlete, "sports/account/quote", input);
const checkout = { ...input, quoteId: quote.id, idempotencyKey: randomUUID() };
const { data: order } = await request(
  athlete,
  "sports/account/checkout",
  checkout,
);
const { data: duplicate } = await request(
  athlete,
  "sports/account/checkout",
  checkout,
);
assert.equal(duplicate.id, order.id);
await request(athlete, `sports/account/orders/${order.id}/payment`, {
  scenario: "success",
  idempotencyKey: randomUUID(),
});
const { data: paid } = await request(
  athlete,
  `sports/account/orders/${order.id}/verify`,
  {},
);
assert.equal(paid.balanceDueMinor, "0");
const { data: memberships } = await request(
  athlete,
  "sports/account/memberships",
);
const membership = memberships.find(
  (x) => x.orderId === order.id || x.order_id === order.id,
);
assert(membership, "Purchased membership missing");
const { data: ticket } = await request(
  athlete,
  `sports/account/memberships/${membership.id}/ticket`,
  {},
);
const checkIn = { token: ticket.token, reason: "آزمون پذیرش دموی PH2" };
await request(accountant, "business/sports/check-in", checkIn, 403);
await request(foreignOwner, "business/sports/check-in", checkIn, 403);
const { data: visit } = await request(
  reception,
  "business/sports/check-in",
  checkIn,
);
const { data: replay } = await request(
  reception,
  "business/sports/check-in",
  checkIn,
);
assert.equal(visit.id, replay.id);
await request(reception, `business/sports/visits/${visit.id}/exit`, {
  reason: "پایان آزمون دمو",
});
console.log(
  "PASS PH2: membership purchase, idempotent checkout, mock payment, QR token, receptionist check-in/replay/exit, accountant and foreign-club rejection.",
);
// Session cookies stay in memory and are not printed or written to artifacts.
