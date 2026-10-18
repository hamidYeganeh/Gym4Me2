import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOneTimeCode } from "../../../packages/ui/src/kit/OneTimeCode/OneTimeCode.utils";

test("SMS autofill and formatted paste accept all supported numeral systems", () => {
  for (const code of [
    "12345",
    "۱۲۳۴۵",
    "١٢٣٤٥",
    "۱۲ ۳۴۵",
    "12-345",
    "Code: 12345",
  ])
    assert.equal(normalizeOneTimeCode(code, 5), "12345");
});
test("five-digit application codes never inherit the demo's four/six digit restriction", () => {
  assert.equal(normalizeOneTimeCode("۱۲۳۴۵۶", 5), "12345");
  assert.equal(normalizeOneTimeCode("۱۲۳", 5), "123");
  assert.equal(normalizeOneTimeCode("not a code", 5), "");
  assert.equal(normalizeOneTimeCode("123456", 6), "123456");
});
