import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient, ApiError } from "../src/transport";
import { catalogClients } from "../src/catalog/catalog.clients";
import { adminClients } from "../src/admin/admin.clients";
import { readLocationPages } from "../src/catalog/location-pages";

const rows = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({
    id: `location-${offset + index}`,
    name: `Place ${offset + index}`,
  }));
for (const [surface, clients] of [
  ["application", catalogClients],
  ["admin", adminClients],
] as const) {
  test(`${surface} location selectors collect all pages sequentially and preserve parent scope`, async () => {
    const calls: string[] = [];
    let inFlight = 0;
    const api = createApiClient({
      application: surface,
      locale: "fa",
      fetch: async (url, init) => {
        assert.equal(++inFlight, 1);
        const parsed = new URL(String(url), "https://test.invalid");
        assert.equal(
          parsed.pathname,
          `/api/v1/${surface === "admin" ? "admin" : "catalog"}/locations/cities`,
        );
        assert.equal(parsed.searchParams.get("parentId"), "province/id");
        assert.equal(new Headers(init?.headers).get("x-gym-client"), surface);
        calls.push(parsed.searchParams.get("page")!);
        await Promise.resolve();
        inFlight--;
        return Response.json(calls.length === 1 ? rows(1000) : rows(1, 1000));
      },
    });
    const result = await clients.locations(api, "cities", "province/id");
    assert.deepEqual(calls, ["1", "2"]);
    assert.equal(result.length, 1001);
    assert.equal(result[1000]?.id, "location-1000");
  });
  test(`${surface} explicit locationPage requests only the requested page`, async () => {
    const api = createApiClient({
      application: surface,
      locale: "en",
      fetch: async (url) => {
        const parsed = new URL(String(url), "https://test.invalid");
        assert.equal(parsed.searchParams.get("page"), "3");
        assert.equal(parsed.searchParams.get("parentId"), "parent");
        return Response.json([]);
      },
    });
    assert.deepEqual(
      await clients.locationPage(api, "districts", {
        parentId: "parent",
        page: 3,
      }),
      [],
    );
  });
}
test("country page size and exact full final pages request the terminating empty page", async () => {
  const calls: number[] = [];
  const result = await readLocationPages("countries", async (page) => {
    calls.push(page);
    return page === 1 ? rows(300) : [];
  });
  assert.equal(result.length, 300);
  assert.deepEqual(calls, [1, 2]);
});
test("empty lists stop after the first page", async () => {
  let calls = 0;
  assert.deepEqual(
    await readLocationPages("cities", async () => {
      calls++;
      return [];
    }),
    [],
  );
  assert.equal(calls, 1);
});
test("a later page failure is propagated instead of returning a truncated successful list", async () => {
  const error = new ApiError(503, "Backend.storageUnavailable");
  await assert.rejects(
    readLocationPages("cities", async (page) => {
      if (page === 1) return rows(1000);
      throw error;
    }),
    (caught) => caught === error,
  );
});
test("cancellation before or between pages never launches an extra request", async () => {
  for (const preAborted of [true, false]) {
    const controller = new AbortController();
    let calls = 0;
    if (preAborted) controller.abort();
    await assert.rejects(
      readLocationPages(
        "cities",
        async () => {
          calls++;
          controller.abort();
          return rows(1000);
        },
        controller.signal,
      ),
      { name: "AbortError" },
    );
    assert.equal(calls, preAborted ? 0 : 1);
  }
});
test("repeated pages and malformed responses fail instead of looping or showing partial results", async () => {
  const invalid = [
    null,
    [{ id: "missing-name" }],
    [
      { id: "same", name: "A" },
      { id: "same", name: "B" },
    ],
    rows(1001),
  ];
  for (const response of invalid)
    await assert.rejects(
      readLocationPages("cities", async () => response as never),
      { code: "Errors.invalidResponse" },
    );
  let calls = 0;
  await assert.rejects(
    readLocationPages("cities", async () => {
      calls++;
      return rows(1000);
    }),
    { code: "Errors.invalidResponse" },
  );
  assert.equal(calls, 2);
});
