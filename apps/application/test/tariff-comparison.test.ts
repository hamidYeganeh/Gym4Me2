import assert from "node:assert/strict";
import test from "node:test";
import type { TariffDto } from "@repo/api/catalog";
import {
  tariffDefinition,
  tariffComparisonRows,
} from "../lib/tariff-comparison";

const plan = (patch: Partial<TariffDto> = {}): TariffDto => ({
  id: "plan",
  clubId: "club",
  branchId: null,
  name: "عضویت",
  serviceType: "membership",
  unit: "month",
  currency: "IRT",
  priceToman: 100000,
  durationDays: 30,
  sessionCount: 8,
  includedServices: ["سالن", "رختکن"],
  conditions: "تا ۸ جلسه؛ کارت قابل انتقال نیست.",
  isActive: true,
  version: 1,
  versionId: "version",
  effectiveFrom: "2026-01-01T00:00:00Z",
  createdAt: "2026-01-01T00:00:00Z",
  ...patch,
});
test("one month with different validity, allowances, inclusions, conditions or branch scope never shares a price row", () => {
  const variations: Partial<TariffDto>[] = [
    {},
    { durationDays: 10 },
    { sessionCount: 12 },
    { includedServices: ["سالن"] },
    { conditions: "کارت قابل انتقال است." },
    { branchId: "branch" },
    { durationDays: null },
    { sessionCount: null },
  ];
  const clubs = variations.map((patch, index) => ({
    id: `club-${index}`,
    tariffs: [
      plan({ ...patch, id: `plan-${index}`, priceToman: index * 10000 }),
    ],
  }));
  const rows = tariffComparisonRows(clubs, "membership", "month");
  assert.equal(rows.length, variations.length);
  assert.ok(rows.every((row) => row.offers.size === 1));
});
test("same announced entitlements compare despite plan names, price, version, inclusion order and Persian typography", () => {
  const first = plan();
  const second = plan({
    name: "طرح دیگر",
    priceToman: 0,
    version: 7,
    versionId: "new-version",
    includedServices: ["رختكن", "سالن", "سالن"],
    conditions: "  تا ٨ جلسه؛  کارت قابل انتقال نیست. ",
  });
  assert.equal(tariffDefinition(first), tariffDefinition(second));
  const rows = tariffComparisonRows(
    [
      { id: "A", tariffs: [first] },
      { id: "B", tariffs: [second] },
    ],
    "membership",
    "month",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.offers.size, 2);
  assert.equal(rows[0]?.offers.get("B")?.[0]?.priceToman, 0);
});
test("each comparable cell retains all matching alternatives rather than picking the cheapest unrelated plan", () => {
  const tariffs = [
    plan({ priceToman: 200, versionId: "b" }),
    plan({ priceToman: 100, versionId: "a" }),
    plan({ priceToman: 0, durationDays: 1, versionId: "different" }),
  ];
  const rows = tariffComparisonRows(
    [{ id: "A", tariffs }],
    "membership",
    "month",
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows[0]?.offers.get("A")?.map((offer) => offer.versionId),
    ["a", "b"],
  );
  assert.deepEqual(
    tariffs.map((offer) => offer.versionId),
    ["b", "a", "different"],
  );
});
test("inactive tariffs, other services and other units are excluded; no data remains empty", () => {
  assert.deepEqual(tariffComparisonRows([], "visit", "visit"), []);
  assert.deepEqual(
    tariffComparisonRows(
      [
        {
          id: "A",
          tariffs: [
            plan({ isActive: false }),
            plan({ serviceType: "court" }),
            plan({ unit: "session" }),
          ],
        },
      ],
      "membership",
      "month",
    ),
    [],
  );
});
test("branch identities differ across clubs but all-branch access never matches a single branch", () => {
  const rows = tariffComparisonRows(
    [
      { id: "A", tariffs: [plan({ branchId: "A-branch" })] },
      { id: "B", tariffs: [plan({ branchId: "B-branch" })] },
      { id: "C", tariffs: [plan()] },
    ],
    "membership",
    "month",
  );
  assert.equal(rows.length, 2);
  assert.deepEqual([...rows[0]!.offers.keys()], ["A", "B"]);
});
