import assert from "node:assert/strict";
import test from "node:test";
import { associations } from "./app-associations.mjs";
import { associationResponse } from "../apps/application/lib/domain-associations.mjs";
const digest = Array(32).fill("AB").join(":");
const expectedPaths = [
  "/discovery/clubs/*",
  "/services/*",
  "/calendars/*",
  "/bookings/*",
  "/orders/*",
  "/messages/*",
  "/memberships/*",
].map((path) => ({ "/": path }));
test("only explicit signing identities generate domain associations", () => {
  assert.throws(() => associations("", undefined));
  assert.throws(() => associations("placeholder", undefined));
  assert.throws(() => associations(digest, "WRONG.app"));
  const result = associations(digest, "ABCDEFGHIJ.com.gym4me.app");
  assert.equal(result.android[0].target.package_name, "com.gym4me.app");
  assert.deepEqual(result.apple.applinks.details[0].components, expectedPaths);
  assert.equal(associations(digest).apple, undefined);
});

test("web associations are independent, public JSON and restricted to the configured app", async () => {
  const android = associationResponse("android", {
    ANDROID_RELEASE_SHA256: `${digest.toLowerCase()}, ${digest}`,
  });
  assert.equal(android.status, 200);
  assert.match(android.headers.get("content-type"), /^application\/json/);
  assert.equal(android.headers.get("location"), null);
  assert.equal(android.headers.get("set-cookie"), null);
  assert.equal(android.headers.get("cache-control"), "public, max-age=300");
  const body = await android.json();
  assert.deepEqual(body[0].target.sha256_cert_fingerprints, [digest]);
  const apple = associationResponse("apple", {
    APPLE_APP_ID: "ABCDEFGHIJ.com.gym4me.app",
  });
  assert.equal(apple.status, 200);
  assert.deepEqual((await apple.json()).applinks.details, [
    {
      appIDs: ["ABCDEFGHIJ.com.gym4me.app"],
      components: expectedPaths,
    },
  ]);
});

test("unconfigured or invalid signing identities never publish a successful association", async () => {
  for (const platform of ["android", "apple"])
    for (const environment of [
      {},
      {
        ANDROID_RELEASE_SHA256: "sample",
        APPLE_APP_ID: "WRONG.com.gym4me.app",
      },
    ]) {
      const response = associationResponse(platform, environment);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      assert.deepEqual(await response.json(), {
        error: "Domain association is not configured.",
      });
    }
});
