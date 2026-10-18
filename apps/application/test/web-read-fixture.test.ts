import assert from "node:assert/strict";
import test from "node:test";
import type {
  CalendarPageDto,
  CalendarDetailDto,
  CalendarServicePageDto,
  ServiceDto,
} from "@repo/api/sports";
import {
  publicServiceFixtures,
  publicServiceListItem,
  webFixtureCoverId,
  webFixtureId,
} from "./fixtures/public-services";
import { webReadServer, type WebReadScenario } from "./fixtures/web-read-api";
import { checkoutMembershipFixtures } from "./fixtures/checkout-memberships";
import { documentFixtures } from "./fixtures/documents";
import { invitationFixtures } from "./fixtures/invitations";
import { notificationFixtures } from "./fixtures/notifications";
import { conversationFixtures } from "./fixtures/conversations";
import { supportFixtures } from "./fixtures/support";
import { publicPolicyFixture } from "./fixtures/privacy";
import {
  initialNotificationPreferences,
  refreshedNotificationPreferences,
} from "./fixtures/notification-preferences";

async function fixture(scenario: WebReadScenario = "populated") {
  const services = publicServiceFixtures();
  const server = webReadServer({
    services,
    scenario,
    memberships: checkoutMembershipFixtures(services),
    documents: documentFixtures(),
    invitations: invitationFixtures(),
    notifications: notificationFixtures(),
    conversations: conversationFixtures(),
    tickets: supportFixtures(),
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    url: `http://127.0.0.1:${address.port}/api/v1`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeIdleConnections();
      }),
  };
}

test("public PH0 fixture links catalog, branch services and calendars without issuing account access", async (t) => {
  const f = await fixture("ph0-public");
  t.after(f.close);
  const clubs = await (await fetch(`${f.url}/catalog/clubs`)).json();
  assert.equal(clubs.length, 2);
  const club = await (
    await fetch(`${f.url}/catalog/clubs/${clubs[0].id}`)
  ).json();
  const branch = club.branches[0];
  const services: ReturnType<typeof publicServiceListItem>[] = await (
    await fetch(
      `${f.url}/sports/services?organizationId=${club.id}&branchId=${branch.id}`,
    )
  ).json();
  assert.equal(services.length, publicServiceFixtures().length);
  for (const service of services) {
    const detail: ServiceDto = await (
      await fetch(`${f.url}/sports/services/${service.id}`)
    ).json();
    assert.equal(detail.organizationId, club.id);
    assert.equal(detail.branchId, branch.id);
  }
  const calendars: CalendarPageDto = await (
    await fetch(`${f.url}/sports/calendars/page`)
  ).json();
  const calendar: CalendarDetailDto = await (
    await fetch(`${f.url}/sports/calendars/${calendars.items[0]!.id}`)
  ).json();
  assert.equal(calendar.organizationId, club.id);
  assert.equal(calendar.branchId, branch.id);
  assert.ok(calendar.services.length);
  const linked: ServiceDto = await (
    await fetch(`${f.url}/sports/services/${calendar.services[0]!.id}`)
  ).json();
  assert.equal(linked.organizationId, club.id);
  assert.equal(linked.branchId, branch.id);
  assert.deepEqual(
    await (await fetch(`${f.url}/system/policy`)).json(),
    publicPolicyFixture,
  );
  for (const path of [
    "profile/account",
    "auth/sessions",
    "sports/community/calendars/page",
  ])
    assert.equal((await fetch(`${f.url}/${path}`)).status, 401, path);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const denied = await fetch(`${f.url}/auth/otp/request`, { method });
    assert.equal(denied.status, 405);
    assert.equal(denied.headers.get("set-cookie"), null);
  }
});

test("calendar DTO simulation paginates list/services and links to consistent detail without granting writes", async (t) => {
  const f = await fixture("calendars-read");
  t.after(f.close);
  const response = await fetch(`${f.url}/sports/calendars/page`);
  assert.equal(response.headers.get("Set-Cookie"), null);
  const first: CalendarPageDto = await response.json();
  const second: CalendarPageDto = await (
    await fetch(`${f.url}/sports/calendars/page?cursor=${first.nextCursor}`)
  ).json();
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 3);
  assert.equal(
    new Set([...first.items, ...second.items].map((item) => item.id)).size,
    23,
  );
  assert.equal(second.nextCursor, null);
  const detail: CalendarDetailDto = await (
    await fetch(`${f.url}/sports/calendars/${first.items[0].id}`)
  ).json();
  assert.equal(detail.title.length, 160);
  assert.equal(detail.services.length, 20);
  assert.ok(
    detail.services.every((service) => service.branchId === detail.branchId),
  );
  const next: CalendarServicePageDto = await (
    await fetch(
      `${f.url}/sports/calendars/${detail.id}/services?cursor=${detail.nextServiceCursor}`,
    )
  ).json();
  assert.equal(next.items.length, 3);
  assert.equal(next.nextCursor, null);
  const service: ServiceDto = await (
    await fetch(`${f.url}/sports/services/${next.items[0].id}`)
  ).json();
  assert.equal(service.id, next.items[0].id);
  assert.equal(service.branchId, detail.branchId);
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(`${f.url}/sports/community/calendars/${detail.id}/follow`, {
        method: "POST",
        body: "synthetic-only",
      })
    ).status,
    405,
  );
});

test("calendar simulation validates filtered cursors and contract limits", async (t) => {
  const f = await fixture("calendars-read");
  t.after(f.close);
  const filtered: CalendarPageDto = await (
    await fetch(`${f.url}/sports/calendars/page?search=Ph0Calendar&limit=1`)
  ).json();
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.nextCursor, null);
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/calendars/page?search=unmatched&cursor=${filtered.items[0].id}`,
      )
    ).status,
    400,
  );
  for (const query of [
    "limit=0",
    "limit=26",
    "limit=1.5",
    "unknown=1",
    `search=${"x".repeat(101)}`,
  ])
    assert.equal(
      (await fetch(`${f.url}/sports/calendars/page?${query}`)).status,
      400,
    );
  assert.equal(
    (await fetch(`${f.url}/sports/calendars/${webFixtureId(99999)}`)).status,
    404,
  );
});

test("calendar page failures and final-empty pages retain the original cursor boundary", async (t) => {
  for (const [scenario, status] of [
    ["calendars-page-error", 503],
    ["calendars-page-forbidden", 403],
    ["calendars-last-empty", 200],
  ] as const) {
    const f = await fixture(scenario);
    t.after(f.close);
    const first: CalendarPageDto = await (
      await fetch(`${f.url}/sports/calendars/page`)
    ).json();
    assert.equal(first.items.length, 20);
    const response = await fetch(
      `${f.url}/sports/calendars/page?cursor=${first.nextCursor}`,
    );
    assert.equal(response.status, status);
    if (status === 200)
      assert.deepEqual(await response.json(), { items: [], nextCursor: null });
    const detail: CalendarDetailDto = await (
      await fetch(`${f.url}/sports/calendars/${first.items[0].id}`)
    ).json();
    const next = await fetch(
      `${f.url}/sports/calendars/${detail.id}/services?cursor=${detail.nextServiceCursor}`,
    );
    assert.equal(next.status, status);
    if (status === 200)
      assert.deepEqual(await next.json(), { items: [], nextCursor: null });
  }
});

test("calendar empty and denied followed views stay separate from public reads", async (t) => {
  const empty = await fixture("calendars-empty");
  const denied = await fixture("calendars-forbidden");
  t.after(empty.close);
  t.after(denied.close);
  assert.deepEqual(
    await (await fetch(`${empty.url}/sports/calendars/page`)).json(),
    { items: [], nextCursor: null },
  );
  assert.equal(
    (await fetch(`${denied.url}/sports/community/calendars/page`)).status,
    403,
  );
  assert.equal(
    (await fetch(`${denied.url}/sports/calendars/page`)).status,
    200,
  );
});

test("protected catalog visual DTOs keep clubs and branches associated without granting writes", async (t) => {
  const f = await fixture("protected-catalog");
  t.after(f.close);
  const response = await fetch(`${f.url}/catalog/clubs`);
  assert.equal(response.headers.get("Set-Cookie"), null);
  const list = await response.json();
  assert.equal(list.length, 2);
  const detail = await (
    await fetch(`${f.url}/catalog/clubs/${list[0].id}`)
  ).json();
  assert.equal(detail.branches[0].id, list[0].mainBranch.id);
  const branch = await (
    await fetch(
      `${f.url}/catalog/clubs/${list[0].id}/branches/${list[0].mainBranch.id}`,
    )
  ).json();
  assert.equal(branch.clubId, detail.id);
  assert.ok(branch.openingHours.weekly.length);
  assert.equal(
    (
      await fetch(
        `${f.url}/catalog/clubs/${list[0].id}/branches/${list[1].mainBranch.id}`,
      )
    ).status,
    404,
  );
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(`${f.url}/catalog/clubs/${list[0].id}`, {
        method: "PATCH",
        body: "synthetic-only",
      })
    ).status,
    405,
  );
});

test("support simulation separates list/detail and never grants a session or writes", async (t) => {
  const f = await fixture("support-read");
  t.after(f.close);
  const response = await fetch(`${f.url}/sports/community/support`);
  assert.equal(response.headers.get("Set-Cookie"), null);
  const list = await response.json();
  assert.equal(list.length, 3);
  assert.equal("messages" in list[0], false);
  const detail = await (
    await fetch(`${f.url}/sports/community/support/${list[0].id}`)
  ).json();
  assert.equal(detail.messages.length, 1);
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (await fetch(`${f.url}/sports/community/support/invalid`)).status,
    404,
  );
  for (const path of [
    "sports/community/support",
    `sports/community/support/${list[0].id}/messages`,
  ])
    assert.equal(
      (
        await fetch(`${f.url}/${path}`, {
          method: "POST",
          body: "synthetic-only",
        })
      ).status,
      405,
    );
});
test("support empty, access denial and unavailable reads are distinct", async (t) => {
  for (const [scenario, status] of [
    ["populated", 401],
    ["support-empty", 200],
    ["support-forbidden", 403],
    ["support-unavailable", 503],
  ] as const) {
    const f = await fixture(scenario);
    t.after(f.close);
    const response = await fetch(`${f.url}/sports/community/support`);
    assert.equal(response.status, status);
    if (response.ok) assert.deepEqual(await response.json(), []);
  }
});

test("conversation pages keep archived scopes and 20-row cursors separate", async (t) => {
  const f = await fixture("conversations-read");
  t.after(f.close);
  for (const [archived, total] of [
    [false, 29],
    [true, 23],
  ] as const) {
    const response = await fetch(
      `${f.url}/sports/community/conversations/page?archived=${archived}`,
    );
    assert.equal(response.headers.get("Set-Cookie"), null);
    const first = await response.json();
    assert.equal(first.items.length, 20);
    assert.equal(first.nextCursor, first.items.at(-1).id);
    const second = await (
      await fetch(
        `${f.url}/sports/community/conversations/page?archived=${archived}&cursor=${first.nextCursor}`,
      )
    ).json();
    const combined = [...first.items, ...second.items];
    assert.equal(combined.length, total);
    assert.equal(new Set(combined.map((c) => c.id)).size, total);
    assert.ok(combined.every((c) => c.archived === archived));
    assert.equal(second.nextCursor, null);
  }
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/conversations/page?archived=invalid`,
      )
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${f.url}/sports/community/conversations/page?cursor=invalid`))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/conversations/page?archived=true&cursor=${conversationFixtures()[0]!.id}`,
      )
    ).status,
    400,
  );
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/conversations/${conversationFixtures()[0]!.id}`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/conversations/${conversationFixtures()[0]!.id}/preferences`,
        { method: "POST", body: "synthetic-only" },
      )
    ).status,
    405,
  );
});

test("conversation empty, exhausted, continuation failure and forbidden states differ", async (t) => {
  for (const scenario of [
    "conversations-empty",
    "conversations-last-empty",
    "conversations-page-error",
    "conversations-forbidden",
  ] as const) {
    const f = await fixture(scenario);
    t.after(f.close);
    const response = await fetch(
      `${f.url}/sports/community/conversations/page`,
    );
    if (scenario === "conversations-forbidden") {
      assert.equal(response.status, 403);
      continue;
    }
    const first = await response.json();
    if (scenario === "conversations-empty") {
      assert.deepEqual(first, { items: [], nextCursor: null });
      continue;
    }
    assert.equal(first.items.length, 20);
    const second = await fetch(
      `${f.url}/sports/community/conversations/page?cursor=${first.nextCursor}`,
    );
    assert.equal(
      second.status,
      scenario === "conversations-page-error" ? 503 : 200,
    );
    if (second.ok)
      assert.deepEqual(await second.json(), { items: [], nextCursor: null });
  }
});

test("notification pages preserve the server's 20-row cursor contract and unread filter", async (t) => {
  const f = await fixture("notifications-read");
  t.after(f.close);
  for (const [view, total] of [
    ["all", 29],
    ["unread", 23],
  ] as const) {
    const response = await fetch(
      `${f.url}/sports/community/notifications/page?view=${view}`,
    );
    assert.equal(response.headers.get("Set-Cookie"), null);
    const first = await response.json();
    assert.equal(first.items.length, 20);
    assert.equal(first.nextCursor, first.items.at(-1).id);
    const second = await (
      await fetch(
        `${f.url}/sports/community/notifications/page?view=${view}&cursor=${first.nextCursor}`,
      )
    ).json();
    const combined = [...first.items, ...second.items];
    assert.equal(combined.length, total);
    assert.equal(new Set(combined.map((n) => n.id)).size, total);
    assert.equal(second.nextCursor, null);
    if (view === "unread") assert.ok(combined.every((n) => n.readAt === null));
  }
  assert.equal(
    (await fetch(`${f.url}/sports/community/notifications/page?view=unknown`))
      .status,
    400,
  );
  assert.equal(
    (await fetch(`${f.url}/sports/community/notifications/page?cursor=invalid`))
      .status,
    400,
  );
  // The first read notification is not a valid anchor for the unread view.
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/notifications/page?view=unread&cursor=${notificationFixtures()[0]!.id}`,
      )
    ).status,
    400,
  );
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/notifications/${notificationFixtures()[0]!.id}/read`,
        { method: "POST", body: "synthetic-only" },
      )
    ).status,
    405,
  );
});

test("notification empty, exhausted, continuation failure and forbidden states differ", async (t) => {
  for (const scenario of [
    "notifications-empty",
    "notifications-last-empty",
    "notifications-page-error",
    "notifications-forbidden",
  ] as const) {
    const f = await fixture(scenario);
    t.after(f.close);
    const response = await fetch(
      `${f.url}/sports/community/notifications/page`,
    );
    if (scenario === "notifications-forbidden") {
      assert.equal(response.status, 403);
      continue;
    }
    const first = await response.json();
    if (scenario === "notifications-empty") {
      assert.deepEqual(first, { items: [], nextCursor: null });
      continue;
    }
    assert.equal(first.items.length, 20);
    const second = await fetch(
      `${f.url}/sports/community/notifications/page?cursor=${first.nextCursor}`,
    );
    assert.equal(
      second.status,
      scenario === "notifications-page-error" ? 503 : 200,
    );
    if (second.ok)
      assert.deepEqual(await second.json(), { items: [], nextCursor: null });
  }
});

test("invitation pages use the returned cursor without gaps or duplicates", async (t) => {
  const f = await fixture("invitations-read");
  t.after(f.close);
  const firstResponse = await fetch(`${f.url}/sports/community/invitations`);
  assert.equal(firstResponse.headers.get("Set-Cookie"), null);
  const first = await firstResponse.json();
  assert.equal(first.items.length, 25);
  assert.equal(first.nextCursor, first.items.at(-1).id);
  const second = await (
    await fetch(
      `${f.url}/sports/community/invitations?cursor=${first.nextCursor}`,
    )
  ).json();
  assert.equal(second.items.length, 4);
  assert.equal(second.nextCursor, null);
  assert.equal(
    new Set([...first.items, ...second.items].map((i) => i.id)).size,
    29,
  );
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(
        `${f.url}/sports/community/invitations/${first.items[0].id}/answer`,
        { method: "POST", body: "synthetic-only" },
      )
    ).status,
    405,
  );
  assert.equal(
    (await fetch(`${f.url}/sports/community/invitations?cursor=invalid`))
      .status,
    400,
  );
});

test("invitation empty and page-error scenarios remain distinguishable", async (t) => {
  const empty = await fixture("invitations-empty");
  const failed = await fixture("invitations-page-error");
  t.after(empty.close);
  t.after(failed.close);
  assert.deepEqual(
    await (await fetch(`${empty.url}/sports/community/invitations`)).json(),
    { items: [], nextCursor: null },
  );
  const first = await (
    await fetch(`${failed.url}/sports/community/invitations`)
  ).json();
  assert.equal(first.items.length, 25);
  assert.equal(
    (
      await fetch(
        `${failed.url}/sports/community/invitations?cursor=${first.nextCursor}`,
      )
    ).status,
    503,
  );
});

test("an exhausted continuation can end the list without appending an invitation", async (t) => {
  const f = await fixture("invitations-last-empty");
  t.after(f.close);
  const first = await (
    await fetch(`${f.url}/sports/community/invitations`)
  ).json();
  assert.equal(first.items.length, 25);
  assert.deepEqual(
    await (
      await fetch(
        `${f.url}/sports/community/invitations?cursor=${first.nextCursor}`,
      )
    ).json(),
    { items: [], nextCursor: null },
  );
});

test("preferences read scenarios do not grant a session or save preferences", async (t) => {
  const f = await fixture("preferences-read");
  t.after(f.close);
  const response = await fetch(`${f.url}/sports/community/preferences`);
  assert.deepEqual(await response.json(), initialNotificationPreferences);
  assert.equal(response.headers.get("Set-Cookie"), null);
  assert.equal((await fetch(`${f.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(`${f.url}/sports/community/preferences`, {
        method: "POST",
        body: "synthetic-only",
      })
    ).status,
    405,
  );
});

test("preferences refresh can return a changed snapshot or an explicit failure", async (t) => {
  for (const scenario of [
    "preferences-refresh",
    "preferences-refresh-error",
  ] as const) {
    const f = await fixture(scenario);
    t.after(f.close);
    assert.deepEqual(
      await (await fetch(`${f.url}/sports/community/preferences`)).json(),
      initialNotificationPreferences,
    );
    const next = await fetch(`${f.url}/sports/community/preferences`);
    assert.equal(next.status, scenario === "preferences-refresh" ? 200 : 503);
    if (next.ok)
      assert.deepEqual(await next.json(), refreshedNotificationPreferences);
  }
});

test("public policy rendering never grants account privacy access or accepts consent", async (t) => {
  const f = await fixture("privacy-read");
  t.after(f.close);
  const policy = await fetch(`${f.url}/system/policy`);
  assert.equal(policy.status, 200);
  assert.equal(policy.headers.get("Set-Cookie"), null);
  assert.deepEqual(await policy.json(), publicPolicyFixture);
  assert.equal((await fetch(`${f.url}/profile/account/privacy`)).status, 401);
  assert.equal(
    (
      await fetch(`${f.url}/profile/account/privacy/preferences`, {
        method: "POST",
        body: "synthetic-only",
      })
    ).status,
    405,
  );
});

test("session expiry simulation keeps public discovery readable and rejects all writes", async (t) => {
  const f = await fixture("session-expired");
  t.after(f.close);
  for (const path of [
    "business/organizations",
    "admin/operations",
    "sports/bookings",
    "profile/account",
  ])
    assert.equal((await fetch(`${f.url}/${path}`)).status, 401);
  assert.equal((await fetch(`${f.url}/sports/services`)).status, 200);
  assert.equal(
    (await fetch(`${f.url}/sports/services/${webFixtureId(1)}`)).status,
    200,
  );
  assert.equal(
    (
      await fetch(`${f.url}/sports/bookings`, {
        method: "POST",
        body: "synthetic-only",
      })
    ).status,
    405,
  );
});

test("documents stay private except the explicit read-only DTO scenario", async (t) => {
  const guest = await fixture();
  const read = await fixture("documents-read");
  t.after(guest.close);
  t.after(read.close);
  assert.equal((await fetch(`${guest.url}/sports/documents`)).status, 401);
  const response = await fetch(`${read.url}/sports/documents`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Set-Cookie"), null);
  const documents = await response.json();
  assert.equal(documents.length, 1);
  assert.equal(
    (await fetch(`${read.url}/sports/documents/${documents[0].id}/preview`))
      .status,
    401,
  );
  assert.equal((await fetch(`${read.url}/profile/account`)).status, 401);
  assert.equal(
    (
      await fetch(`${read.url}/sports/documents`, {
        method: "POST",
        body: "synthetic-only",
      })
    ).status,
    405,
  );
});

test("failed document reads are not successful empty lists", async (t) => {
  const f = await fixture("documents-read-error");
  t.after(f.close);
  assert.equal((await fetch(`${f.url}/sports/documents`)).status, 503);
  assert.equal((await fetch(`${f.url}/sports/services`)).status, 200);
});

test("checkout DTO simulation never grants profile/auth or allows a write", async (t) => {
  const f = await fixture("checkout-read");
  t.after(f.close);
  const list = await fetch(`${f.url}/sports/account/memberships`);
  assert.equal(list.status, 200);
  assert.equal(list.headers.get("Set-Cookie"), null);
  assert.equal((await list.json()).length, 8);
  for (const path of [
    "profile/account",
    "auth/session",
    "sports/account/orders",
  ]) {
    assert.equal((await fetch(`${f.url}/${path}`)).status, 401);
  }
  for (const path of [
    "sports/account/quote",
    "sports/account/checkout",
    "sports/account/memberships",
  ]) {
    assert.equal(
      (await fetch(`${f.url}/${path}`, { method: "POST", body: "synthetic" }))
        .status,
      405,
    );
  }
});

test("membership read failure remains distinct from an empty allowance list", async (t) => {
  const f = await fixture("checkout-read-error");
  t.after(f.close);
  assert.equal(
    (await fetch(`${f.url}/sports/account/memberships`)).status,
    503,
  );
  assert.equal((await fetch(`${f.url}/sports/services`)).status, 200);
});

test("public list and detail preserve their different API projections", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const list = await fetch(`${f.url}/sports/services`);
  assert.equal(list.headers.get("X-Gym4me-Web-Fixture"), "readonly");
  const items = await list.json();
  assert.equal(items.length, 5);
  assert.equal("occurrences" in items[0], false);
  assert.equal("policy" in items[0], false);
  assert.equal(typeof items[0].amountMinor, "string");
  const detail = await (
    await fetch(`${f.url}/sports/services/${items[0].id}`)
  ).json();
  assert.equal("nextStartAt" in detail, false);
  assert.equal(detail.occurrences.length, 3);
  assert.ok(
    detail.occurrences.some((o: { remaining: number }) => o.remaining === 0),
  );
  assert.ok(
    detail.occurrences.some(
      (o: { resourceAvailable: boolean }) => !o.resourceAvailable,
    ),
  );
});

test("search and branch filters have observable results without inventing auth", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const search = await (
    await fetch(`${f.url}/sports/services?q=${encodeURIComponent("یوگا")}`)
  ).json();
  assert.equal(search.length, 1);
  assert.equal(
    (await fetch(`${f.url}/sports/services?q=${"x".repeat(161)}`)).status,
    400,
  );
  assert.deepEqual(
    await (
      await fetch(`${f.url}/sports/services?branchId=${webFixtureId(999)}`)
    ).json(),
    [],
  );
  assert.equal(
    (await fetch(`${f.url}/sports/services/${webFixtureId(999)}`)).status,
    404,
  );
});

test("all mutating methods are rejected, including payment and auth routes", async (t) => {
  const f = await fixture();
  t.after(f.close);
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    for (const path of [
      "sports/account/orders",
      "sports/payment-callbacks/saman-mock",
      "auth/session",
    ]) {
      const response = await fetch(`${f.url}/${path}`, {
        method,
        body: "synthetic-body-must-not-be-processed",
      });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("Allow"), "GET, HEAD");
      assert.equal(response.headers.get("Set-Cookie"), null);
    }
  }
});

test("local cookies never turn fixture profile or private routes into a session", async (t) => {
  const f = await fixture();
  t.after(f.close);
  for (const path of [
    "profile/account",
    "auth/session",
    "sports/account/orders",
  ]) {
    const response = await fetch(`${f.url}/${path}`, {
      headers: { Cookie: "test-only=synthetic" },
    });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Set-Cookie"), null);
  }
});

test("empty mode removes the public catalog and its details", async (t) => {
  const f = await fixture("empty");
  t.after(f.close);
  assert.deepEqual(await (await fetch(`${f.url}/sports/services`)).json(), []);
  assert.equal(
    (await fetch(`${f.url}/sports/services/${webFixtureId(1)}`)).status,
    404,
  );
});

test("unavailable mode is a failure rather than a successful empty response", async (t) => {
  const f = await fixture("unavailable");
  t.after(f.close);
  assert.equal((await fetch(`${f.url}/sports/services`)).status, 503);
});

test("unknown media is rejected without a fallback image or external fetch", async (t) => {
  const f = await fixture("missing-image");
  t.after(f.close);
  assert.equal(
    (await fetch(`${f.url}/sports/media/${webFixtureCoverId}`)).status,
    404,
  );
});

test("slow reads remain abortable and the isolated server can close", async (t) => {
  const f = await fixture("slow");
  t.after(f.close);
  await assert.rejects(
    fetch(`${f.url}/sports/services`, { signal: AbortSignal.timeout(20) }),
  );
});
