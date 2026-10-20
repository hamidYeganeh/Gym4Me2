import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogDate,
  catalogInterval,
  catalogMinute,
} from "../lib/catalog-hours";
import { detailView } from "../lib/catalog-view";
import { protectedCatalogFixtures } from "./fixtures/protected-catalog";

test("catalog hours localize zero-padded time and mark midnight and overnight ends", () => {
  assert.equal(catalogMinute(485, "fa"), "۰۸:۰۵");
  assert.equal(catalogMinute(485, "en"), "08:05");
  assert.equal(
    catalogInterval({ startMinute: 1320, endMinute: 1440 }, "fa"),
    "۲۲:۰۰–۰۰:۰۰ روز بعد",
  );
  assert.equal(
    catalogInterval({ startMinute: 1380, endMinute: 1500 }, "en"),
    "23:00–01:00 next day",
  );
  assert.equal(
    catalogInterval({ startMinute: 480, endMinute: 1320 }, "en"),
    "08:00–22:00",
  );
});

test("the detail summary preserves the audience of each opening interval", () => {
  const fixture = protectedCatalogFixtures();
  const branch = fixture.branches[0]!;
  branch.openingHours.weekly = [
    { dayOfWeek: 0, audience: "women", startMinute: 480, endMinute: 720 },
    { dayOfWeek: 0, audience: "men", startMinute: 1320, endMinute: 1440 },
  ];
  const hours = detailView(fixture.clubs[0]!, branch, "fa").hours;
  assert.match(hours, /شنبه · بانوان · ۰۸:۰۰–۱۲:۰۰/);
  assert.match(hours, /شنبه · آقایان · ۲۲:۰۰–۰۰:۰۰ روز بعد/);
  assert.doesNotMatch(hours, /08:00/);
});

test("a date-only exception preserves its calendar day without a branch-zone shift", () => {
  assert.equal(catalogDate("2026-10-20", "en"), "Oct 20, 2026");
  assert.equal(catalogDate("2026-10-20", "fa"), "۲۸ مهر ۱۴۰۵");
});
