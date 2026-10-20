// Runs in a separate Node process so the shipped ESM clients use real HTTP.
import assert from "node:assert/strict";
import { createApiClient } from "../src/transport";
import { catalogClients } from "../src/catalog/catalog.clients";
import { adminClients } from "../src/admin/admin.clients";
import type { PlaceDto } from "../src/catalog/catalog.dto";

async function main() {
  const baseUrl = process.env.PH1_LOCATION_API_URL ?? "";
  assert.match(baseUrl, /^http:\/\/127\.0\.0\.1:\d+\/api\/v1$/);
  const [countryId, provinceId, cityId] = JSON.parse(
    process.env.PH1_LOCATION_PARENTS ?? "[]",
  ) as string[];
  assert.ok(countryId && provinceId && cityId);
  const cookie = process.env.PH1_LOCATION_COOKIE;
  assert.ok(cookie);
  let publicIds: string[][] | undefined;
  const counts: Record<string, number[]> = {};
  for (const surface of ["application", "admin"] as const) {
    const clients: Pick<typeof catalogClients, "locations" | "locationPage"> =
      surface === "admin" ? adminClients : catalogClients;
    const api = createApiClient({
      application: surface,
      locale: "fa",
      baseUrl,
      fetch: (url, init) => {
        const headers = new Headers(init?.headers);
        if (surface === "admin") {
          headers.set("Origin", "http://localhost:7082");
          headers.set("Cookie", cookie);
        }
        return fetch(url, { ...init, headers });
      },
    });
    const countries: PlaceDto[] = await clients.locations(api, "countries");
    const provinces: PlaceDto[] = await clients.locations(
      api,
      "provinces",
      countryId,
    );
    const cities: PlaceDto[] = await clients.locations(
      api,
      "cities",
      provinceId,
    );
    const districts: PlaceDto[] = await clients.locations(
      api,
      "districts",
      cityId,
    );
    const ids: string[][] = [countries, provinces, cities, districts].map(
      (items) => items.map((item) => item.id),
    );
    for (const items of ids) assert.equal(new Set(items).size, items.length);
    if (publicIds) assert.deepEqual(ids, publicIds);
    else publicIds = ids;
    counts[surface] = ids.map((items) => items.length);
    assert.equal(
      (
        await clients.locationPage(api, "cities", {
          parentId: provinceId,
          page: 2,
        })
      ).length,
      1,
    );
    assert.equal(
      (
        await clients.locationPage(api, "districts", {
          parentId: cityId,
          page: 3,
        })
      ).length,
      0,
    );
  }
  process.stdout.write(JSON.stringify(counts));
}
void main().catch(() => {
  process.stderr.write("Location client HTTP contract probe failed.");
  process.exitCode = 1;
});
