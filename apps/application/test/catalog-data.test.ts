import assert from "node:assert/strict";
import test from "node:test";
import { availableCatalogData } from "../lib/catalog-data";

test("a cached club or branch is retired after authoritative unpublication or denial", () => {
  const cached = { id: "club", branches: ["private-branch"] };
  for (const status of [403, 404])
    assert.equal(availableCatalogData(cached, { status }), undefined);
  assert.equal(availableCatalogData(cached, null), cached);
});
test("an outage preserves the cached snapshot without changing it", () => {
  const cached = Object.freeze({ id: "club" });
  for (const status of [0, 500, 502, 503])
    assert.equal(availableCatalogData(cached, { status }), cached);
  assert.equal(availableCatalogData(undefined, { status: 503 }), undefined);
});
