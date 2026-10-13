import assert from "node:assert/strict";
import test from "node:test";
import { validCatalogPrices } from "../src/catalog/catalog.dto";
test("price filters accept zero and inclusive bounds but reject malformed or reversed ranges", () => {
  for (const value of [
    {},
    { minPrice: 0 },
    { maxPrice: 1_000_000_000 },
    { minPrice: 500, maxPrice: 500 },
  ])
    assert.equal(validCatalogPrices(value), true);
  for (const value of [
    { minPrice: -1 },
    { minPrice: NaN },
    { maxPrice: Infinity },
    { maxPrice: 1.5 },
    { maxPrice: 1_000_000_001 },
    { minPrice: 500, maxPrice: 100 },
  ])
    assert.equal(validCatalogPrices(value), false);
});
