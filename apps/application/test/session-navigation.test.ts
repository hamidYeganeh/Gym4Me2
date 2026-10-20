import assert from "node:assert/strict";
import test from "node:test";
import {
  sessionSignInHref,
  policyBackHref,
  passwordRecoveryHref,
} from "../../../packages/ui/src/lib/session-navigation";
import { loginDestination } from "../../../packages/ui/src/account/login-destination";

const target =
  "/team?organization=10000000-0000-4000-8000-000000000001&filter=دعوت+جدید";
const url = (href: string) => new URL(href, "https://gym.example");
test("session recovery retains each client, sign-in method and complete scoped destination", () => {
  for (const client of ["application", "business", "admin"] as const) {
    for (const method of ["otp", "password"] as const) {
      const entry = url(sessionSignInHref(client, target, method));
      assert.equal(
        entry.pathname,
        client === "application"
          ? method === "otp"
            ? "/auth/otp"
            : "/auth/login"
          : "/login",
      );
      assert.equal(entry.searchParams.get("returnTo"), target);
      assert.equal(
        entry.searchParams.get("method"),
        client !== "application" && method === "password" ? "password" : null,
      );
      assert.equal(
        loginDestination({
          client,
          returnTo: entry.searchParams.get("returnTo")!,
          displayName: "تست",
          recovery: false,
        }),
        target,
      );
    }
  }
});
test("policy round trips retain password mode and return hops for all three clients", () => {
  for (const client of ["application", "business", "admin"] as const) {
    for (const method of ["otp", "password"] as const) {
      const search = new URLSearchParams({
        from: "login",
        method,
        returnTo: target,
      }).toString();
      assert.equal(
        policyBackHref(client, search),
        sessionSignInHref(client, target, method),
      );
    }
    assert.equal(
      policyBackHref(client, "?from=other"),
      client === "application" ? "/profile/settings" : "/",
    );
  }
});
test("expired session recovery cannot redirect to an external destination", () => {
  for (const client of ["application", "business", "admin"] as const)
    for (const target of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\nevil.example",
    ])
      assert.equal(
        url(
          policyBackHref(
            client,
            new URLSearchParams({ from: "login", returnTo: target }).toString(),
          ),
        ).searchParams.get("returnTo"),
        "/",
      );
});

test("forgotten-password and policy return keep the recovery flow before setting a new password", () => {
  for (const client of ["application", "business", "admin"] as const) {
    const recovery = passwordRecoveryHref(target);
    assert.equal(url(recovery).pathname, "/reset-password");
    assert.equal(url(recovery).searchParams.get("returnTo"), target);
    assert.equal(
      policyBackHref(
        client,
        new URLSearchParams({
          from: "login",
          returnTo: target,
          recovery: "true",
        }).toString(),
      ),
      recovery,
    );
    assert.equal(
      url(
        loginDestination({
          client,
          recovery: true,
          returnTo: target,
          displayName: "تست",
        }),
      ).searchParams.get("returnTo"),
      target,
    );
  }
});
