import assert from "node:assert/strict";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createApiClient, ApiError } from "../src/transport";
import { createQueryClient } from "../src/query-client";
import { businessClients } from "../src/business/business.clients";
import { businessKeys } from "../src/business/business.keys";
import { adminKeys } from "../src/admin/admin.keys";

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
test("business writes use one credentialed, locale-aware transport", async () => {
  let captured: { url: string; init?: RequestInit } | undefined;
  const api = createApiClient({
    application: "business",
    locale: "en",
    baseUrl: "https://example.test/api/v1/",
    fetch: async (url, init) => {
      captured = { url: String(url), init };
      return json({ id: "club" });
    },
  });
  await businessClients.updateClub(api, "club/with space", {
    name: "Test club",
  });
  assert.equal(
    captured?.url,
    "https://example.test/api/v1/business/clubs/club%2Fwith%20space",
  );
  assert.equal(captured?.init?.method, "PATCH");
  assert.equal(captured?.init?.credentials, "include");
  assert.equal(captured?.init?.cache, "no-store");
  assert.deepEqual(captured?.init?.headers, {
    "x-gym-client": "business",
    "Accept-Language": "en",
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  assert.equal(captured?.init?.body, JSON.stringify({ name: "Test club" }));
});
test("query encoding keeps zero and false while omitting empty filters", async () => {
  const api = createApiClient({
    application: "admin",
    locale: "fa",
    fetch: async (url) => {
      assert.equal(
        String(url),
        "/api/v1/test?page=0&active=false&search=a%26b",
      );
      return json([]);
    },
  });
  await api.request({
    method: "GET",
    path: "test",
    query: {
      page: 0,
      active: false,
      search: "a&b",
      status: "",
      missing: undefined,
      empty: null,
    },
  });
});
test("multipart upload keeps credentials and lets the browser set its boundary", async () => {
  const file = new File([new Uint8Array([1, 2, 3])], "club.png", { type: "image/png" });
  const api = createApiClient({ application: "business", locale: "fa", fetch: async (_url, init) => {
    assert.equal(init?.credentials, "include");
    assert.equal(new Headers(init?.headers).get("Content-Type"), null);
    assert.ok(init?.body instanceof FormData);
    assert.equal((init.body.get("file") as File).name, "club.png");
    assert.equal(init.body.get("alt"), "باشگاه");
    return json({ id: "media" });
  } });
  await businessClients.uploadMedia(api, "club", { file, alt: "باشگاه" });
});
test("server error codes and field details remain available to callers", async () => {
  const details = {
    code: "Backend.invalidClubInformation",
    message: "Localized server copy",
    fields: [
      { path: "name", code: "Backend.invalidField", message: "Invalid field" },
    ],
  };
  const api = createApiClient({
    application: "business",
    locale: "en",
    fetch: async () => json(details, 400),
  });
  await assert.rejects(
    api.request({ method: "POST", path: "business/clubs", body: {} }),
    (error) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, details.code);
      assert.deepEqual(error.details, details);
      return true;
    },
  );
});
test("network failures and invalid success bodies use stable error codes", async () => {
  const offline = createApiClient({
    application: "business",
    locale: "fa",
    fetch: async () => {
      throw new TypeError("offline");
    },
  });
  await assert.rejects(offline.request({ method: "GET", path: "test" }), {
    code: "Errors.network",
    status: 0,
  });
  const invalid = createApiClient({
    application: "business",
    locale: "fa",
    fetch: async () => new Response("<html>proxy failure</html>"),
  });
  await assert.rejects(invalid.request({ method: "GET", path: "test" }), {
    code: "Errors.invalidResponse",
    status: 502,
  });
});
test("TanStack cancellation reaches fetch without becoming a network error", async () => {
  const abort = new AbortController();
  let signal: AbortSignal | null | undefined;
  const api = createApiClient({
    application: "admin",
    locale: "fa",
    fetch: async (_, options) => {
      signal = options?.signal;
      return new Promise((_, reject) =>
        signal?.addEventListener("abort", () => reject(signal?.reason), {
          once: true,
        }),
      );
    },
  });
  const pending = api.request(
    { method: "GET", path: "test" },
    { signal: abort.signal },
  );
  abort.abort();
  await assert.rejects(pending, (error) => {
    assert.ok(!(error instanceof ApiError));
    return true;
  });
  assert.equal(signal?.aborted, true);
});
test("slow requests are bounded and report a timeout", async () => {
  const api = createApiClient({
    application: "business",
    locale: "en",
    timeoutMs: 5,
    fetch: async (_, options) => {
      await delay(15);
      options?.signal?.throwIfAborted();
      return json([]);
    },
  });
  await assert.rejects(api.request({ method: "GET", path: "test" }), {
    code: "Errors.timeout",
  });
});
test("app, host, locale and session cannot reuse another scope's cached data", () => {
  const query = createQueryClient();
  const scopes = [
    createApiClient({ application: "business", locale: "fa" }),
    createApiClient({ application: "admin", locale: "fa" }),
    createApiClient({ application: "business", locale: "en" }),
    createApiClient({ application: "business", locale: "fa", session: 1 }),
    createApiClient({
      application: "business",
      locale: "fa",
      baseUrl: "https://other.test/api/v1",
    }),
  ];
  scopes.forEach((api, index) =>
    query.setQueryData(businessKeys(api.scope).club("id"), index),
  );
  scopes.forEach((api, index) =>
    assert.equal(query.getQueryData(businessKeys(api.scope).club("id")), index),
  );
  assert.notDeepEqual(
    adminKeys(scopes[0]!.scope).club("id"),
    businessKeys(scopes[0]!.scope).club("id"),
  );
  query.clear();
});
test("4xx queries and mutations never retry; transient reads retry once", async () => {
  const query = createQueryClient();
  let writes = 0,
    reads = 0;
  await assert.rejects(
    query.fetchQuery({
      queryKey: ["unauthorized"],
      retryDelay: 0,
      queryFn: async () => {
        reads++;
        throw new ApiError(401, "Backend.signInFirst");
      },
    }),
  );
  assert.equal(reads, 1);
  reads = 0;
  const result = await query.fetchQuery({
    queryKey: ["temporary"],
    retryDelay: 0,
    queryFn: async () => {
      if (reads++ === 0) throw new ApiError(503, "Errors.requestFailed");
      return "ok";
    },
  });
  assert.equal(result, "ok");
  assert.equal(reads, 2);
  const mutation = query.getMutationCache().build(query, {
    mutationFn: async () => {
      writes++;
      throw new ApiError(503, "Errors.requestFailed");
    },
  });
  await assert.rejects(mutation.execute(undefined));
  assert.equal(writes, 1);
  query.clear();
});
