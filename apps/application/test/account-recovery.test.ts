import assert from "node:assert/strict";
import test from "node:test";
import {
  accountEntryHref,
  accountRecovery,
  accountReadDenied,
} from "../../../packages/ui/src/lib/account-recovery";

const destination =
  "/checkout?service=a1000000-0000-4000-8000-000000000002&occurrence=slot&coupon=ورزش+بهار";
const returnTo = (href: string) =>
  new URL(href, "https://gym.example").searchParams.get("returnTo");

test("expired sessions preserve the complete purchase destination", () => {
  const result = accountRecovery(
    { status: 401, code: "Backend.theSessionHasEndedSignInAgain" },
    destination,
  );
  assert.equal(result?.kind, "signIn");
  assert.equal(returnTo(result!.href), destination);
});

test("signing in from profile completion preserves both return hops", () => {
  const completion = accountEntryHref("/profile/complete", destination);
  const login = accountEntryHref("/login", completion);
  assert.equal(returnTo(login), completion);
  assert.equal(returnTo(returnTo(login)!), destination);
});

test("only the explicit consent error offers profile recovery", () => {
  const error = { status: 409, code: "Backend.privacyConsentRequired" };
  const athlete = accountRecovery(error, destination, "/profile/complete");
  assert.equal(athlete?.kind, "consent");
  assert.equal(returnTo(athlete!.href), destination);
  assert.deepEqual(accountRecovery(error, destination), {
    kind: "consent",
    href: "/profile",
  });
  for (const error of [
    null,
    "Backend.privacyConsentRequired",
    { status: 403 },
    { status: 409, code: "Backend.capacityUnavailable" },
    { status: 503 },
  ])
    assert.equal(accountRecovery(error, destination), null);
});

test("recovery never forwards an external or malformed return destination", () => {
  for (const unsafe of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
    "javascript:alert(1)",
    "",
  ])
    assert.equal(returnTo(accountEntryHref("/login", unsafe)), "/profile");
});

test("cached identity is retired after access denial while a temporary outage preserves the edit draft", () => {
  for (const error of [
    { status: 401 },
    { status: 403 },
    { status: 428 },
    { status: 409, code: "Backend.privacyConsentRequired" },
  ])
    assert.equal(accountReadDenied(error), true);
  for (const error of [
    null,
    undefined,
    { status: 503 },
    { status: 0 },
    { status: 409, code: "Backend.capacityUnavailable" },
  ])
    assert.equal(accountReadDenied(error), false);
});

test("incorrect challenge or password is shown inline without a sign-in-again action", () => {
  for (const code of [
    "Backend.theCodeIsIncorrectOrExpired",
    "Backend.invalidCredentials",
  ])
    assert.equal(accountRecovery({ status: 401, code }, destination), null);
  assert.equal(
    accountRecovery(
      { status: 401, code: "Backend.theSessionHasEndedSignInAgain" },
      destination,
    )?.kind,
    "signIn",
  );
});
