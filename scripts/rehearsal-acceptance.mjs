import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

// Commands only operate on explicitly approved synthetic accounts in one of
// these two named environments. Credentials/cookies never enter the receipt.
assert.equal(process.env.GYM4ME_REHEARSAL_WRITE, "synthetic-demo");
const target = process.env.GYM4ME_REHEARSAL_TARGET ?? "local";
assert.ok(["local", "vercel"].includes(target));
const base =
  target === "local"
    ? "http://127.0.0.1:7410"
    : "https://gym4me-demo-api.vercel.app";
const origin = (surface) =>
  target === "local"
    ? `http://localhost:${{ application: 7411, business: 7412, admin: 7413 }[surface]}`
    : `https://gym4me-demo-${surface}.vercel.app`;
const cases = [],
  timings = [],
  sessions = [];
const key = () => randomUUID();
const reason = "هماهنگی و ثبت برنامهٔ مراجعه";
async function request(session, path, body, expected) {
  const started = performance.now();
  const response = await fetch(`${base}/api/v1/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gym-client": session.surface,
      Origin: origin(session.surface),
      ...(session.cookie ? { Cookie: session.cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(45000),
  });
  timings.push({
    path: path.split("?")[0],
    status: response.status,
    ms: Math.round(performance.now() - started),
  });
  const data = response.status === 204 ? {} : await response.json();
  if (expected)
    assert.equal(
      response.status,
      expected,
      `${path}: ${data.code ?? response.status}`,
    );
  else assert.ok(response.ok, `${path}: ${response.status} ${data.code ?? ""}`);
  return {
    data,
    cookie: response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; "),
  };
}
const get = async (session, path) => (await request(session, path)).data;
const post = async (session, path, body) =>
  (await request(session, path, body)).data;
function pass(name) {
  cases.push(name);
  console.log("PASS " + name);
}
async function login(suffix, surface) {
  const session = { surface, role: suffix };
  const challenge = await post(session, "auth/otp/request", {
    phone: `0900000000${suffix}`,
  });
  const verified = await request(session, "auth/otp/verify", {
    challengeId: challenge.challengeId,
    code: "11111",
  });
  assert.ok(verified.cookie);
  session.cookie = verified.cookie;
  sessions.push(session);
  const account = await get(session, "profile/account");
  session.id = account.id;
  const policy = await get(session, "system/policy");
  await post(session, "profile/account/privacy/preferences", {
    policyVersion: policy.version,
    acceptPolicy: true,
    confirmMinimumAge: true,
  });
  await get(session, "profile/access");
  await get(session, "auth/sessions");
  return session;
}
const guest = { surface: "application" };
let output;
try {
  const clubs = await get(guest, "catalog/clubs");
  const services = await get(guest, "sports/services");
  const coaches = await get(guest, "coaching/directory");
  assert.ok(clubs.length >= 2);
  assert.ok(services.length >= 6);
  assert.ok(coaches.items?.length ?? coaches.length);
  pass("guest catalog, services and approved coach discovery");
  const owner = await login(1, "business"),
    foreign = await login(2, "business"),
    athlete = await login(3, "application"),
    admin = await login(4, "admin"),
    manager = await login(5, "business"),
    reception = await login(6, "business"),
    accountant = await login(7, "business"),
    coach = await login(8, "application");
  pass("all eight account logins, consent, sessions and role access");
  const organizations = await get(owner, "business/organizations");
  const organization =
    organizations.find((o) => o.name === "باشگاه آفتاب") ?? organizations[0];
  assert.ok(organization);
  const membershipService = services.find(
    (s) =>
      s.organizationId === organization.id &&
      s.kind === "membership" &&
      !s.coachUserId,
  );
  const classService = services.find(
    (s) =>
      s.organizationId === organization.id &&
      s.kind === "class" &&
      !s.coachUserId,
  );
  assert.ok(membershipService);
  assert.ok(classService);
  const branchId = classService.branchId,
    scope = `organizationId=${organization.id}&branchId=${branchId}`;
  for (const actor of [owner, manager, reception, accountant])
    await get(actor, "business/organizations");
  for (const path of [
    "admin/overview",
    "admin/users",
    "admin/organizations",
    "admin/audit",
    "admin/sports",
    "admin/demo",
    "admin/advanced/options",
  ])
    await get(admin, path);
  for (const actor of [owner, manager])
    await get(actor, `business/sports/services?${scope}`);
  await get(reception, `business/sports/reception?${scope}`);
  await get(accountant, `business/sports/report?${scope}`);
  await request(foreign, `business/sports/report?${scope}`, undefined, 403);
  await request(athlete, "admin/overview", undefined, 403);
  pass("role dashboards, business scope and cross-account denial");

  const detail = await get(guest, `sports/services/${classService.id}`);
  const existingBookings = await get(athlete, "sports/account/bookings");
  const occupied = new Set(
    existingBookings
      .filter((b) =>
        ["held", "confirmed", "pending_approval"].includes(b.status),
      )
      .map((b) => b.occurrenceId),
  );
  const occurrence = detail.occurrences.find(
    (o) =>
      o.status === "scheduled" &&
      new Date(o.startAt) > new Date() &&
      o.remaining > 1 &&
      !occupied.has(o.id),
  );
  assert.ok(occurrence);
  const operations = await get(
    owner,
    `business/sports-operations/services/${classService.id}/occurrences`,
  );
  const editable = operations.find((o) => o.id === occurrence.id);
  assert.ok(editable);
  const edit = {
    revision: Number(editable.revision),
    idempotencyKey: key(),
    startAt: occurrence.startAt,
    endAt: occurrence.endAt,
    capacity: occurrence.capacity + 1,
    reason,
  };
  const changed = await post(
    owner,
    `business/sports-operations/occurrences/${occurrence.id}/edit`,
    edit,
  );
  const replay = await post(
    owner,
    `business/sports-operations/occurrences/${occurrence.id}/edit`,
    edit,
  );
  assert.deepEqual(replay, changed);
  await request(
    owner,
    `business/sports-operations/occurrences/${occurrence.id}/edit`,
    { ...edit, idempotencyKey: key() },
    409,
  );
  const adminRead = await get(
    admin,
    `admin/sports/services/${classService.id}/occurrences`,
  );
  const current = adminRead.find((o) => o.id === occurrence.id);
  await post(admin, `admin/sports/occurrences/${occurrence.id}/edit`, {
    ...edit,
    revision: Number(current.revision),
    capacity: occurrence.capacity,
    idempotencyKey: key(),
  });
  pass(
    "business and admin occurrence edit, replay, stale revision and preserved time",
  );

  async function checkout(serviceId, occurrenceId) {
    const input = { serviceId, ...(occurrenceId ? { occurrenceId } : {}) };
    const quote = await post(athlete, "sports/account/quote", input);
    const command = { ...input, quoteId: quote.id, idempotencyKey: key() };
    const order = await post(athlete, "sports/account/checkout", command);
    assert.equal(
      (await post(athlete, "sports/account/checkout", command)).id,
      order.id,
    );
    return order;
  }
  const order = await checkout(membershipService.id);
  await post(athlete, `sports/account/orders/${order.id}/payment`, {
    scenario: "failure",
    idempotencyKey: key(),
  });
  await post(athlete, `sports/account/orders/${order.id}/verify`, {});
  await post(athlete, `sports/account/orders/${order.id}/payment`, {
    scenario: "success",
    idempotencyKey: key(),
  });
  const paid = await post(
    athlete,
    `sports/account/orders/${order.id}/verify`,
    {},
  );
  assert.equal(paid.balanceDueMinor, "0");
  await post(athlete, `sports/account/orders/${order.id}/verify`, {});
  const memberships = await get(athlete, "sports/account/memberships");
  const membership = memberships.find((m) => m.orderId === order.id);
  assert.ok(membership);
  const ticket = await post(
    athlete,
    `sports/account/memberships/${membership.id}/ticket`,
    {},
  );
  await request(
    accountant,
    "business/sports/check-in",
    { token: ticket.token, reason },
    403,
  );
  await request(
    foreign,
    "business/sports/check-in",
    { token: ticket.token, reason },
    403,
  );
  const visit = await post(reception, "business/sports/check-in", {
    token: ticket.token,
    reason,
  });
  assert.equal(
    (
      await post(reception, "business/sports/check-in", {
        token: ticket.token,
        reason,
      })
    ).id,
    visit.id,
  );
  await post(reception, `business/sports/visits/${visit.id}/exit`, { reason });
  assert.equal(
    (await get(athlete, "sports/account/memberships")).find(
      (m) => m.id === membership.id,
    ).consumed,
    membership.consumed + 1,
  );
  pass(
    "membership checkout replay, failed payment retry, verified payment and QR attendance replay",
  );
  const classOrder = await checkout(classService.id, occurrence.id);
  await post(athlete, `sports/account/orders/${classOrder.id}/payment`, {
    scenario: "success",
    idempotencyKey: key(),
  });
  await post(athlete, `sports/account/orders/${classOrder.id}/verify`, {});
  await request(
    athlete,
    "sports/account/checkout",
    {
      serviceId: classService.id,
      occurrenceId: occurrence.id,
      quoteId: (
        await post(athlete, "sports/account/quote", {
          serviceId: classService.id,
          occurrenceId: occurrence.id,
        })
      ).id,
      idempotencyKey: key(),
    },
    409,
  );
  const bookings = await get(athlete, "sports/account/bookings");
  const booking = bookings.find((b) => b.orderId === classOrder.id);
  assert.ok(booking);
  const cancellation = await get(
    athlete,
    `sports/account/bookings/${booking.id}/cancellation`,
  );
  await post(athlete, `sports/account/bookings/${booking.id}/cancel`, {
    revision: Number(booking.revision),
    idempotencyKey: key(),
    expectedRefundMinor: cancellation.refundMinor,
  });
  const cancelled = await get(
    athlete,
    `sports/account/orders/${classOrder.id}`,
  );
  assert.ok(["refunded", "partially_refunded"].includes(cancelled.status));
  pass("class booking, cancellation and automatic refund");

  const workspace = await get(athlete, "profile/training");
  const relation = workspace.relationships.find(
    (r) => r.coachId === coach.id && r.status === "active",
  );
  assert.ok(relation);
  assert.ok(
    workspace.assignments.some((a) => a.relationshipId === relation.id),
  );
  const planId = key(),
    prescriptionId = key();
  const content = {
    title: "تمرین تمام بدن",
    note: "حرکت‌ها را با آرامش و در دامنهٔ راحت انجام دهید.",
    days: [
      {
        name: "روز اول",
        exercises: [
          {
            id: prescriptionId,
            exerciseId: "squat",
            sets: 1,
            reps: 10,
            seconds: null,
            load: null,
            restSeconds: 30,
            note: "",
            group: "single",
            groupId: "",
          },
        ],
      },
    ],
  };
  const save = {
    id: planId,
    revision: 0,
    content,
    relationshipId: null,
    isTemplate: false,
    operationId: key(),
  };
  await post(athlete, "profile/training/plans", save);
  await post(athlete, "profile/training/plans", save);
  await post(athlete, `profile/training/plans/${planId}/publish`, {
    revision: 1,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    operationId: key(),
  });
  const assigned = (await get(athlete, "profile/training")).assignments.find(
    (a) => a.planId === planId,
  );
  assert.ok(assigned);
  const session = {
    id: key(),
    assignmentId: assigned.id,
    dayIndex: 0,
    logs: [
      {
        prescriptionId,
        exerciseId: "squat",
        set: 1,
        reps: 10,
        seconds: null,
        load: null,
        rpe: 5,
        done: true,
      },
    ],
    state: "completed",
    revision: 0,
    shared: false,
    startedAt: new Date().toISOString(),
    operationId: key(),
  };
  await post(athlete, "profile/training/sessions/sync", session);
  await post(athlete, "profile/training/sessions/sync", session);
  const progress = await get(athlete, "profile/training/progress");
  assert.equal(progress.sessions.filter((s) => s.id === session.id).length, 1);
  const sharingPath = `profile/coaching-collaboration/${relation.id}/sharing`;
  const privateBefore = await get(
    coach,
    `profile/coaching-collaboration/${relation.id}`,
  );
  assert.ok(!privateBefore.plans.some((p) => p.id === planId));
  await post(athlete, sharingPath, {
    personalPlans: true,
    measurements: false,
  });
  assert.ok(
    (
      await get(coach, `profile/coaching-collaboration/${relation.id}`)
    ).plans.some((p) => p.id === planId),
  );
  await post(athlete, sharingPath, {
    personalPlans: false,
    measurements: false,
  });
  assert.ok(
    !(
      await get(coach, `profile/coaching-collaboration/${relation.id}`)
    ).plans.some((p) => p.id === planId),
  );
  const message = {
    body: "تمرین امروز انجام شد. برای ادامهٔ برنامه آماده‌ام.",
    workoutId: null,
    operationId: key(),
  };
  await post(
    athlete,
    `profile/coaching-collaboration/${relation.id}/messages`,
    message,
  );
  await post(
    athlete,
    `profile/coaching-collaboration/${relation.id}/messages`,
    message,
  );
  await get(coach, `profile/coaching-collaboration/${relation.id}/messages`);
  await request(
    owner,
    `profile/coaching-collaboration/${relation.id}`,
    undefined,
    403,
  );
  await get(athlete, "profile/account/privacy/export");
  pass(
    "personal and assigned plans, publish, workout completion replay, progress, sharing revocation, private messages and export",
  );

  const range = `from=${new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}`;
  await get(admin, `admin/analytics?${range}`);
  await get(owner, `business/analytics?${range}&${scope}`);
  await get(coach, `profile/coach-analytics?${range}`);
  const finance = await get(
    owner,
    `business/advanced?organizationId=${organization.id}`,
  );
  const pro = finance.plans.find((p) => p.code === "pro");
  assert.ok(pro);
  await post(owner, "business/advanced/plan", {
    organizationId: organization.id,
    plan: "pro",
    revision: finance.subscription?.revision ?? 1,
    catalogRevision: pro.revision,
    outcome: "succeeded",
    acceptTerms: true,
    months: 1,
    reason,
    idempotencyKey: key(),
  });
  assert.equal(
    (await get(owner, `business/advanced?organizationId=${organization.id}`))
      .subscription.plan_code,
    "pro",
  );
  await get(coach, `profile/settlements?organizationId=${organization.id}`);
  await get(admin, `admin/advanced?organizationId=${organization.id}`);
  await request(
    foreign,
    `business/advanced?organizationId=${organization.id}`,
    undefined,
    403,
  );
  await get(athlete, "sports/community/notifications/page");
  await get(athlete, "sports/community/preferences");
  pass(
    "dated analytics, mock Pro activation, coach settlements, admin controls and private finance scope",
  );
  output = {
    target,
    passed: true,
    cases,
    requests: timings.length,
    timings,
    ids: {
      organizationId: organization.id,
      branchId,
      classServiceId: classService.id,
      occurrenceId: occurrence.id,
      membershipOrderId: order.id,
      trainingPlanId: planId,
      trainingSessionId: session.id,
      relationshipId: relation.id,
    },
  };
} catch (error) {
  output = {
    target,
    passed: false,
    cases,
    requests: timings.length,
    timings,
    error: error.message,
  };
  throw error;
} finally {
  const logoutErrors = [];
  for (const session of sessions) {
    try {
      await post(session, "auth/sessions/logout", {});
      await request(session, "profile/account", undefined, 401);
    } catch (error) {
      logoutErrors.push(error.message);
    }
  }
  if (output) {
    output.requests = timings.length;
    output.logoutVerified = logoutErrors.length === 0;
    if (logoutErrors.length) {
      output.passed = false;
      output.logoutErrors = logoutErrors;
    }
    await writeFile(
      process.env.GYM4ME_REHEARSAL_RECEIPT ??
        `.artifacts/demo-rehearsal-2026-10-23/${target}-acceptance.json`,
      JSON.stringify(output, null, 2),
    );
  }
  if (logoutErrors.length)
    throw new Error("Sign-out did not invalidate every test session");
}
