import assert from "node:assert/strict";
import test from "node:test";
import { applicationRouteRequiresAccount } from "../lib/route-access";
import {
  applicationAuthHref,
  applicationAuthCancelHref,
} from "../../../packages/ui/src/lib/auth-routes";

test("first launch, discovery and booking information are public on web and native shells", () => {
  for (const path of [
    "/",
    "/discovery",
    "/discovery/",
    "/discovery/map",
    "/discovery/club",
    "/discovery/clubs/club-id/slots",
    "/discovery/clubs/club-id/reviews",
    "/discovery/compare",
    "/explore",
    "/services",
    "/services/detail",
    "/coaches/detail",
    "/calendars",
    "/calendars/detail",
    "/games/detail",
  ])
    assert.equal(
      applicationRouteRequiresAccount(path, "id=public-id"),
      false,
      path,
    );
});

test("reservations and all account destinations require sign-in", () => {
  for (const path of [
    "/checkout",
    "/checkout/",
    "/checkout/status",
    "/bookings",
    "/bookings/detail",
    "/profile",
    "/profile/edit",
    "/profile/complete",
    "/profile/settings/privacy",
    "/saved",
    "/saved/clubs",
    "/saved/coaches",
    "/messages",
    "/training",
    "/notifications",
    "/games/new",
    "/new-private-feature",
  ])
    assert.equal(applicationRouteRequiresAccount(path), true, path);
  assert.equal(
    applicationRouteRequiresAccount("/calendars", "view=following"),
    true,
  );
});

test("sign-in and policy remain public so a guest can enter and leave login", () => {
  for (const path of [
    "/login",
    "/auth/otp",
    "/auth/login",
    "/reset-password",
    "/privacy",
  ])
    assert.equal(applicationRouteRequiresAccount(path), false, path);
});

test("a booking intent keeps its service, occurrence and coupon through sign-in", () => {
  const destination = "/checkout?service=one&occurrence=morning&coupon=تمرین";
  const login = new URL(
    applicationAuthHref("otp", destination),
    "https://gym.example",
  );
  assert.equal(login.pathname, "/auth/otp");
  assert.equal(login.searchParams.get("returnTo"), destination);
  assert.equal(
    applicationRouteRequiresAccount(login.pathname, login.search),
    false,
  );
});

test("cancelling sign-in returns to public content without an authentication loop", () => {
  for (const target of [
    "/profile/edit",
    "/messages",
    "/calendars?view=following",
    "/auth/otp",
    "//evil.example",
  ])
    assert.equal(applicationAuthCancelHref(target), "/discovery");
  assert.equal(
    applicationAuthCancelHref("/checkout?service=one&occurrence=morning"),
    "/services/detail?id=one",
  );
  assert.equal(
    applicationAuthCancelHref("/discovery/club?id=one&view=reviews"),
    "/discovery/club?id=one&view=reviews",
  );
});
