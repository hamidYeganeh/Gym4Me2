import assert from "node:assert/strict";
import test from "node:test";

import { normalizeDigits, normalizeIranianMobile } from "./phone.ts";

test("Iranian local, national and international forms share one canonical value", () => {
  for (const input of [
    "09123456789",
    "9123456789",
    "989123456789",
    "+989123456789",
    "۰۹۱۲۳۴۵۶۷۸۹",
    "٠٩١٢٣٤٥٦٧٨٩",
    " +۹۸۹۱۲۳۴۵۶۷۸۹ ",
  ])
    assert.equal(normalizeIranianMobile(input), "+989123456789");
});
test("invalid mobile numbers are rejected", () => {
  for (const input of [
    "",
    "test@example.com",
    "02112345678",
    "+14155551212",
    "0912345678",
    "091234567890",
    "0912x456789",
    "00989123456789",
  ])
    assert.equal(normalizeIranianMobile(input), null);
});
test("OTP and recovery codes normalize Persian and Arabic digits", () => {
  assert.equal(normalizeDigits("۱۲۳٤٥٦"), "123456");
});
