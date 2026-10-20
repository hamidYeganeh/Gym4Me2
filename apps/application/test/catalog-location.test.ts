import assert from "node:assert/strict";
import test from "node:test";
import { catalogLocationFilters } from "../lib/catalog-location";
import { catalogClients } from "../../../packages/api/src/catalog/catalog.clients";
import { createApiClient } from "../../../packages/api/src/transport";

test("country and province constrain discovery before a city is selected", () => {
  assert.deepEqual(catalogLocationFilters({ countryId: "country" }), {
    countryId: "country",
    provinceId: undefined,
    cityId: undefined,
    districtId: undefined,
  });
  assert.deepEqual(
    catalogLocationFilters({ countryId: "country", provinceId: "province" }),
    {
      countryId: "country",
      provinceId: "province",
      cityId: undefined,
      districtId: undefined,
    },
  );
  assert.deepEqual(
    catalogLocationFilters({
      countryId: "",
      provinceId: "",
      cityId: "",
      districtId: "",
    }),
    {
      countryId: undefined,
      provinceId: undefined,
      cityId: undefined,
      districtId: undefined,
    },
  );
});
test("all selected levels reach the shared client together; empty levels are omitted", async () => {
  const api = createApiClient({
    application: "application",
    locale: "fa",
    fetch: async (url) => {
      const query = new URL(String(url), "https://fixture.invalid")
        .searchParams;
      assert.equal(query.get("countryId"), "country");
      assert.equal(query.get("provinceId"), "province");
      assert.equal(query.get("cityId"), null);
      assert.equal(query.get("districtId"), null);
      return Response.json([]);
    },
  });
  await catalogClients.clubs(
    api,
    catalogLocationFilters({ countryId: "country", provinceId: "province" }),
  );
});
