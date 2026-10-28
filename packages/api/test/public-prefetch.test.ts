import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { createApiClient, ApiError } from "../src/transport";
import {
  publicDetailTarget,
  prefetchPublicDetail,
} from "../src/public-prefetch";
import { catalogKeys } from "../src/catalog/catalog.keys";

test("only public detail routes are eligible, including nested and native routes", () => {
  assert.deepEqual(publicDetailTarget("/discovery/clubs/atlas"), {
    kind: "club",
    id: "atlas",
    view: undefined,
  });
  assert.deepEqual(
    publicDetailTarget("/discovery/clubs/atlas/classess/class-123"),
    { kind: "class", id: "class-123" },
  );
  assert.deepEqual(
    publicDetailTarget("/discovery/club?id=atlas&view=gallery"),
    { kind: "club", id: "atlas", view: "gallery" },
  );
  assert.deepEqual(publicDetailTarget("/club/atlas/classes"), {
    kind: "club",
    id: "atlas",
    view: "classess",
  });
  assert.deepEqual(publicDetailTarget("/services/detail?id=class-123"), {
    kind: "class",
    id: "class-123",
  });
  for (const href of [
    "/checkout",
    "/profile/delete",
    "/auth/otp",
    "/discovery/clubs/atlas/delete",
    "/discovery/classes/undefined/extra",
    "/discovery/clubs/%2e%2e",
  ])
    assert.equal(publicDetailTarget(href), null);
});

test("club prefetch deduplicates calls and warms slug, internal ID and main branch keys", async () => {
  const requests: string[] = [];
  const api = createApiClient({
    application: "application",
    locale: "fa",
    baseUrl: "https://example.test/api",
    fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      requests.push(path);
      return Response.json(
        path.endsWith("/branches/main")
          ? { id: "main" }
          : {
              id: "club-id",
              slug: "atlas",
              branches: [
                { id: "side", isMain: false },
                { id: "main", isMain: true },
              ],
            },
      );
    },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  try {
    await Promise.all([
      prefetchPublicDetail(api, client, { kind: "club", id: "atlas" }),
      prefetchPublicDetail(api, client, { kind: "club", id: "atlas" }),
    ]);
    assert.equal(requests.length, 2);
    const keys = catalogKeys(api.scope);
    assert.deepEqual(
      client.getQueryData(keys.club("atlas")),
      client.getQueryData(keys.club("club-id")),
    );
    assert.deepEqual(client.getQueryData(keys.branch("club-id", "main")), {
      id: "main",
    });
    await prefetchPublicDetail(api, client, { kind: "club", id: "atlas" });
    assert.equal(requests.length, 2);
  } finally {
    client.clear();
  }
});

test("service and coach prefetch use the exact consuming keys; preview coaches make no request", async () => {
  const requests: string[] = [];
  const api = createApiClient({
    application: "application",
    locale: "en",
    baseUrl: "https://example.test/api",
    fetch: async (input) => {
      requests.push(String(input));
      return Response.json({ title: "Ready" });
    },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  try {
    await prefetchPublicDetail(api, client, {
      kind: "coach",
      id: "atlas-strength",
    });
    assert.equal(requests.length, 0);
    await prefetchPublicDetail(api, client, { kind: "class", id: "class-123" });
    assert.deepEqual(
      client.getQueryData([
        ...api.scope,
        "sports",
        "sports/services/class-123",
        {},
      ]),
      { title: "Ready" },
    );
    const coach = `coach-${"a".repeat(32)}`;
    await prefetchPublicDetail(api, client, { kind: "coach", id: coach });
    assert.deepEqual(
      client.getQueryData([
        ...api.scope,
        "coaching",
        `coaching/directory/${coach}`,
        {},
      ]),
      { title: "Ready" },
    );
    assert.equal(
      client.getQueryData([
        ...api.scope.slice(0, -1),
        1,
        "sports",
        "sports/services/class-123",
        {},
      ]),
      undefined,
    );
  } finally {
    client.clear();
  }
});

test("denied prefetches do not fabricate content or retry the endpoint", async () => {
  let calls = 0;
  const api = createApiClient({
    application: "application",
    locale: "fa",
    baseUrl: "https://example.test/api",
    fetch: async () => {
      calls++;
      return Response.json({ code: "Hidden" }, { status: 404 });
    },
  });
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  try {
    await assert.rejects(
      prefetchPublicDetail(api, client, { kind: "club", id: "hidden" }),
      ApiError,
    );
    assert.equal(calls, 1);
    assert.equal(
      client.getQueryData(catalogKeys(api.scope).club("hidden")),
      undefined,
    );
  } finally {
    client.clear();
  }
});
