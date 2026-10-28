import assert from "node:assert/strict";
import test from "node:test";
import { boundedCount } from "../../../packages/ui/src/lib/integer-input";

test("ticket and subscription totals stay renderable for fractional input", () => {
  for (const maximum of [12, 20]) {
    for (const input of [
      "1.5",
      "2.9",
      "0.1",
      "1e-1",
      "",
      "-3",
      "1e99",
      "NaN",
    ]) {
      const count = boundedCount(input, maximum);
      assert.doesNotThrow(() => BigInt(100000) * BigInt(count), input);
      assert.equal(Array.from({ length: count }).length, count);
      assert.ok(count >= 1 && count <= maximum);
    }
  }
});

test("integer counts preserve valid quantities and clamp to their service limit", () => {
  assert.equal(boundedCount("3", 20), 3);
  assert.equal(boundedCount("99", 4), 4);
  assert.equal(boundedCount("-2", 20), 1);
});
