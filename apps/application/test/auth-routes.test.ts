import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationAuthHref,
  applicationAuthBackPath,
  legacyAuthDestination,
} from "../../../packages/ui/src/lib/auth-routes";
import { applicationRouteLayout } from "../lib/navigation-route";

const destination = "/checkout?service=one&occurrence=morning&coupon=تمرین";
test("both auth routes retain the complete destination without a method query", () => {
  for (const [method, path] of [
    ["otp", "/auth/otp"],
    ["password", "/auth/login"],
  ] as const) {
    const url = new URL(
      applicationAuthHref(method, destination),
      "https://gym.example",
    );
    assert.equal(url.pathname, path);
    assert.equal(url.searchParams.get("returnTo"), destination);
    assert.equal(url.searchParams.has("method"), false);
    assert.equal(applicationAuthBackPath(url.search), destination);
  }
});
test("bookmarked method links resolve to their canonical sign-in page", () => {
  assert.equal(
    legacyAuthDestination("?method=password&returnTo=%2Fmessages"),
    "/auth/login?returnTo=%2Fmessages",
  );
  assert.equal(
    legacyAuthDestination("?returnTo=%2Forders"),
    "/auth/otp?returnTo=%2Forders",
  );
});
test("auth entry and Back reject external destinations and auth loops", () => {
  for (const target of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
  ]) {
    assert.equal(
      new URL(
        applicationAuthHref("otp", target),
        "https://gym.example",
      ).searchParams.get("returnTo"),
      "/",
    );
    assert.equal(
      applicationAuthBackPath(
        new URLSearchParams({ returnTo: target }).toString(),
      ),
      "/profile",
    );
  }
  for (const target of [
    "/auth/otp",
    "/auth/login?returnTo=%2Fauth%2Fotp",
    "/login?method=password",
  ])
    assert.equal(
      applicationAuthBackPath(
        new URLSearchParams({ returnTo: target }).toString(),
      ),
      "/profile",
    );
});
test("both auth pages suppress bottom navigation on web and native trailing-slash URLs", () => {
  for (const route of [
    "/auth/otp",
    "/auth/login",
    "/auth/otp/",
    "/auth/login/",
  ])
    assert.equal(
      applicationRouteLayout(route, "returnTo=%2Fmessages").navigationVisible,
      false,
    );
});
