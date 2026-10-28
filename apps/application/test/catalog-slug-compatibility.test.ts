import assert from "node:assert/strict";
import test from "node:test";
import { catalogClients } from "../../../packages/api/src/catalog/catalog.clients";
import { ApiError, type ApiClient } from "../../../packages/api/src/transport";

test("legacy slug resolves across pages without changing the public route", async () => {
  const paths: string[] = [];
  const api = {
    request: async ({
      path,
      query,
    }: {
      path: string;
      query?: { page?: number };
    }) => {
      paths.push(path);
      if (path.endsWith("madar"))
        throw new ApiError(400, "Backend.invalidClubInformation");
      if (path === "catalog/clubs")
        return query?.page === 1
          ? [{ id: "other", slug: "other" }]
          : [{ id: "internal-id", slug: "madar" }];
      return { id: "internal-id", slug: "madar" };
    },
  } as unknown as ApiClient;
  assert.equal((await catalogClients.club(api, "madar")).slug, "madar");
  assert.equal(paths.at(-1), "catalog/clubs/internal-id");
});
test("missing slug becomes not found and repeated pages stop", async () => {
  let calls = 0;
  const api = {
    request: async ({ path }: { path: string }) => {
      calls++;
      if (path !== "catalog/clubs")
        throw new ApiError(400, "Backend.invalidClubInformation");
      return [{ id: "other", slug: "other" }];
    },
  } as unknown as ApiClient;
  await assert.rejects(
    catalogClients.club(api, "missing"),
    (error: unknown) => error instanceof ApiError && error.status === 404,
  );
  assert.equal(calls, 3);
});
test("authorization failures never fall back", async () => {
  let calls = 0;
  const api = {
    request: async () => {
      calls++;
      throw new ApiError(403, "forbidden");
    },
  } as unknown as ApiClient;
  await assert.rejects(
    catalogClients.club(api, "madar"),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
  assert.equal(calls, 1);
});
