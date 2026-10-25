import assert from "node:assert/strict";
import test from "node:test";
import { catalogClients } from "../src/catalog/catalog.clients";
import { profileClients } from "../src/profile/profile.clients";
import { catalogSelectSource } from "../src/catalog/select-options";
import { createApiClient } from "../src/transport";
import {
  preferredDiscoveryLocation,
  chooseDiscoveryLocation,
} from "../../ui/src/lib/discovery-location";

test("choosing a province or city drops stale descendants and explicit all-areas overrides the saved place", () => {
  const old = {
    countryId: "country",
    provinceId: "old-province",
    cityId: "old-city",
    districtId: "old-district",
  };
  assert.deepEqual(preferredDiscoveryLocation({}, old), old);
  assert.deepEqual(preferredDiscoveryLocation({ countryId: "" }, old), {
    countryId: "",
  });
  assert.deepEqual(
    chooseDiscoveryLocation("provinces", { id: "new-province", ...old }),
    { countryId: "country", provinceId: "new-province" },
  );
  assert.deepEqual(
    chooseDiscoveryLocation("cities", { id: "new-city", ...old }),
    { countryId: "country", provinceId: "old-province", cityId: "new-city" },
  );
  assert.deepEqual(
    chooseDiscoveryLocation("districts", { id: "new-district", ...old }),
    {
      countryId: "country",
      provinceId: "old-province",
      cityId: "old-city",
      districtId: "new-district",
    },
  );
});
test("discovery client passes hierarchy and random seed in one bounded public request", async () => {
  let calls = 0;
  const controller = new AbortController();
  const data = {
    provinces: [],
    cities: [],
    districts: [],
    location: {},
    seed: "guest-seed",
  };
  const api = createApiClient({
    application: "application",
    locale: "fa",
    fetch: async (url, init) => {
      calls++;
      const u = new URL(String(url), "https://fixture.invalid");
      assert.equal(u.pathname, "/api/v1/catalog/locations/discovery");
      assert.equal(u.searchParams.get("provinceId"), "province");
      assert.equal(u.searchParams.has("countryId"), false);
      assert.equal(u.searchParams.get("seed"), "guest-seed");
      assert.equal(u.searchParams.get("randomize"), "true");
      assert.equal(init?.signal?.aborted, false);
      return Response.json(data);
    },
  });
  assert.deepEqual(
    await catalogClients.locationDiscovery(
      api,
      {
        countryId: "",
        provinceId: "province",
        seed: "guest-seed",
        randomize: true,
      },
      { signal: controller.signal },
    ),
    data,
  );
  assert.equal(calls, 1);
});
test("location picker options preserve zero and nonzero public club counts", async () => {
  const api = createApiClient({
    application: "application",
    locale: "en",
    fetch: async () =>
      Response.json([
        { id: "one", name: "One", clubCount: 0 },
        { id: "two", name: "Two", clubCount: 45 },
      ]),
  });
  const result = await catalogSelectSource("provinces", "country").loadPage(
    api,
    { search: "", page: 1, pageSize: 25, signal: new AbortController().signal },
  );
  assert.equal(result.items[0]?.clubCount, 0);
  assert.equal(result.items[1]?.clubCount, 45);
});
test("saved-location client reads and updates only the current account endpoint", async () => {
  const input = { provinceId: "province", cityId: null, districtId: null };
  let calls = 0;
  const api = createApiClient({
    application: "application",
    locale: "en",
    fetch: async (url, init) => {
      assert.equal(
        new URL(String(url), "https://fixture.invalid").pathname,
        "/api/v1/profile/account/location",
      );
      if (calls++) {
        assert.equal(init?.method, "PATCH");
        assert.deepEqual(JSON.parse(String(init?.body)), input);
      } else assert.equal(init?.method, "GET");
      return Response.json({
        userId: "account",
        location: { provinceId: "province" },
      });
    },
  });
  await profileClients.location(api);
  await profileClients.updateLocation(api, input);
  assert.equal(calls, 2);
});
