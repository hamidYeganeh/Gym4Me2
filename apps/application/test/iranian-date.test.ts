import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseLocalDate,
  displayLocalDate,
} from "../../../packages/ui/src/lib/iranian-date";
test("Persian and Arabic digits refer to the same Gregorian storage date", () => {
  assert.equal(parseLocalDate("۱۴۰۵/۰۸/۰۳"), "2026-10-25");
  assert.equal(parseLocalDate("١٤٠٥/٨/٣"), "2026-10-25");
  assert.equal(displayLocalDate("2026-10-25"), "۱۴۰۵/۰۸/۰۳");
});
test("Jalali leap days and invalid dates are validated, not silently normalized", () => {
  assert.equal(parseLocalDate("1403/12/30"), "2025-03-20");
  assert.equal(parseLocalDate("1404/12/30"), "");
  assert.equal(parseLocalDate("1405/07/31"), "");
  assert.equal(parseLocalDate("1405/13/01"), "");
  assert.equal(parseLocalDate("2026/10/25"), "");
  assert.equal(parseLocalDate("2026-02-30", "en"), "");
});
