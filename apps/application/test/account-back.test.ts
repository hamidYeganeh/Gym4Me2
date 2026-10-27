import assert from "node:assert/strict";
import test from "node:test";
import { accountBackPath } from "../lib/account-back";

test("direct account links have a finite path back to discovery", () => {
  for (const initial of [
    "/profile/edit",
    "/profile/settings/privacy/",
    "/sessions",
    "/invitations",
    "/privacy",
    "/login",
    "/auth/otp",
    "/auth/login",
  ]) {
    let route: string | null = initial;
    const visited = new Set<string>();
    while (route && route !== "/discovery") {
      assert.ok(!visited.has(route), `back navigation cycle at ${route}`);
      visited.add(route);
      route = accountBackPath(route);
    }
    assert.equal(route, "/discovery");
  }
});
test("public policy returns to login only for its explicit entry point", () => {
  assert.equal(
    accountBackPath("/reset-password", "?returnTo=%2Fcheckout%3Fservice%3Done"),
    "/auth/login?returnTo=%2Fcheckout%3Fservice%3Done",
  );
  assert.equal(
    accountBackPath(
      "/privacy",
      "?from=login&method=password&returnTo=%2Fmessages",
    ),
    "/auth/login?returnTo=%2Fmessages",
  );
  assert.equal(
    accountBackPath("/privacy", "?from=login"),
    "/auth/otp?returnTo=%2Fprofile",
  );
  assert.equal(
    accountBackPath("/privacy", "?from=https://example.org"),
    "/profile/settings",
  );
  assert.equal(
    accountBackPath("/privacy", "?from=login&returnTo=%2Fsessions"),
    "/auth/otp?returnTo=%2Fsessions",
  );
  assert.equal(accountBackPath("/discovery"), null);
  assert.equal(accountBackPath("/"), null);
});

test("cold catalog links return through details while preserving branch", () => {
  assert.equal(
    accountBackPath(
      "/discovery/club",
      "?id=abc&view=gallery&branch=def&token=secret",
    ),
    "/discovery/club?id=abc&branch=def",
  );
  assert.equal(
    accountBackPath("/discovery/club", "?id=abc&branch=def"),
    "/discovery",
  );
  assert.equal(
    accountBackPath("/discovery/clubs/abc/reviews", "?branch=def"),
    "/discovery/clubs/abc?branch=def",
  );
  assert.equal(accountBackPath("/discovery/map"), "/discovery");
  assert.equal(accountBackPath("/programs/detail"), "/programs");
});
