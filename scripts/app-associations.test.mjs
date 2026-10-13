import assert from "node:assert/strict";
import test from "node:test";
import { associations } from "./app-associations.mjs";
const digest = Array(32).fill("AB").join(":");
test("only explicit signing identities generate domain associations", () => {
  assert.throws(() => associations("", undefined));
  assert.throws(() => associations("placeholder", undefined));
  assert.throws(() => associations(digest, "WRONG.app"));
  const result = associations(digest, "ABCDEFGHIJ.com.gym4me.app");
  assert.equal(result.android[0].target.package_name, "com.gym4me.app");
  assert.deepEqual(result.apple.applinks.details[0].components, [
    { "/": "/discovery/clubs/*" },
  ]);
  assert.equal(associations(digest).apple, undefined);
});
