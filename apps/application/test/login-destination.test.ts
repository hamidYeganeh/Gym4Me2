import assert from "node:assert/strict";
import test from "node:test";
import { loginDestination } from "../../../packages/ui/src/account/login-destination";

const returnTo = "/checkout?service=class&occurrence=morning&coupon=تمرین";
const base = {
  client: "application" as const,
  returnTo,
  recovery: false,
  displayName: "Athlete",
};
const destination = (url: string) =>
  new URL(url, "https://gym.example").searchParams.get("returnTo");

test("returning athletes keep the complete destination after either sign-in method", () => {
  assert.equal(loginDestination(base), returnTo);
});
test("new athletes complete their profile before returning to their action", () => {
  const result = loginDestination({ ...base, displayName: null });
  assert.equal(result.split("?")[0], "/profile/complete");
  assert.equal(destination(result), returnTo);
  assert.equal(
    loginDestination({ ...base, displayName: null, returnTo: result }),
    result,
  );
});
test("password recovery keeps the destination through credential setup", () => {
  const result = loginDestination({ ...base, recovery: true });
  assert.equal(result.split("?")[0], "/set-password");
  assert.equal(destination(result), returnTo);
});
test("workspace sign-in does not enter athlete profile setup", () => {
  for (const client of ["business", "admin"] as const)
    assert.equal(
      loginDestination({ ...base, client, displayName: null }),
      returnTo,
    );
});
test("unsafe return destinations cannot redirect outside the app", () => {
  for (const returnTo of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nevil.example",
  ])
    assert.equal(loginDestination({ ...base, returnTo }), "/");
});
