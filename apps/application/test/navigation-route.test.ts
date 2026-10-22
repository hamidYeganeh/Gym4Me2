import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationRouteLayout,
  navigationRoute,
} from "../lib/navigation-route";
test("native club identity tracks the club and view, excluding filters", () => {
  assert.equal(
    navigationRoute("/discovery/club", "id=abc&view=gallery&branch=one"),
    "/discovery/clubs/abc/gallery",
  );
  assert.notEqual(
    navigationRoute("/discovery/club", "id=abc"),
    navigationRoute("/discovery/club", "id=def"),
  );
  assert.equal(
    navigationRoute("/discovery/club", "id=abc&branch=one"),
    navigationRoute("/discovery/club", "id=abc&branch=two"),
  );
});
test("every exported ID shell changes identity for IDs and ignores filters", () => {
  const shells = [
    "services/detail",
    "bookings/detail",
    "memberships/detail",
    "orders/detail",
    "calendars/detail",
    "messages/conversation",
    "messages/details",
    "support/detail",
    "tickets/view",
  ];
  for (const shell of shells) {
    assert.notEqual(
      navigationRoute(`/${shell}`, "id=first"),
      navigationRoute(`/${shell}`, "id=second"),
      shell,
    );
    assert.equal(
      navigationRoute(
        `/${shell}/`,
        "id=first&date=today&branch=north&view=archived",
      ),
      navigationRoute(`/${shell}`, "id=first&date=tomorrow&branch=south"),
      shell,
    );
  }
  for (const shell of ["/checkout/status", "/checkout/mock-gateway"]) {
    assert.notEqual(
      navigationRoute(shell, "order=first"),
      navigationRoute(shell, "order=second"),
    );
    assert.equal(
      navigationRoute(shell, "order=first&retry=2"),
      navigationRoute(shell, "order=first"),
    );
  }
});
test("web and native club detail, gallery, reviews and slots share identity and chrome", () => {
  for (const view of ["", "gallery", "reviews", "slots"]) {
    const web = applicationRouteLayout(
      `/discovery/clubs/abc${view ? `/${view}` : ""}`,
      "branch=north",
    );
    const native = applicationRouteLayout(
      "/discovery/club/",
      `id=abc&view=${view}&branch=south`,
    );
    assert.deepEqual(native, web, view);
    assert.equal(
      native.navigationVisible,
      view === "reviews" || view === "slots",
    );
  }
  assert.equal(
    applicationRouteLayout("/discovery/club", "id=abc&view=unknown")
      .protectedPage,
    true,
  );
  assert.equal(
    applicationRouteLayout("/discovery/map", "").navigationVisible,
    false,
  );
});
test("static commerce shells distinguish identifiers without remounting filters", () => {
  assert.equal(
    navigationRoute("/bookings/detail", "id=one&date=today"),
    "/bookings/one",
  );
  assert.equal(navigationRoute("/discovery", "q=fitness"), "/discovery");
  assert.equal(
    navigationRoute("/messages/conversation", "id=one"),
    "/messages/one",
  );
});

test("checkout reserves its bottom edge for payment actions on web and native", () => {
  assert.equal(
    applicationRouteLayout("/checkout", "?service=example").navigationVisible,
    false,
  );
  assert.equal(
    applicationRouteLayout("/checkout/", "?service=example").navigationVisible,
    false,
  );
  assert.equal(applicationRouteLayout("/bookings", "").navigationVisible, true);
});
