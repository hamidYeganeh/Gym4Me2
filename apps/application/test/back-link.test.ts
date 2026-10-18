import assert from "node:assert/strict";
import test from "node:test";
import { handlesBackLink } from "../lib/back-link";
const event = {
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};
const link = {
  href: "/discovery/club?id=one&branch=north",
  label: "Back",
  inHeader: true,
  target: null,
  download: false,
};
const labels = new Set(["Back", "بازگشت", "Back to clubs"]);
test("only the accessible header Back affordance uses the history adapter", () => {
  assert.equal(handlesBackLink(event, link, labels), true);
  assert.equal(
    handlesBackLink(event, { ...link, label: "بازگشت" }, labels),
    true,
  );
  for (const patch of [
    { label: "Explore club" },
    { inHeader: false },
    { target: "_blank" },
    { download: true },
    { href: "//other.test" },
    { href: "/\\other.test" },
    { href: "https://other.test" },
    { href: null },
  ])
    assert.equal(handlesBackLink(event, { ...link, ...patch }, labels), false);
});
test("modified, secondary and already-consumed clicks preserve browser behavior", () => {
  for (const patch of [
    { defaultPrevented: true },
    { button: 1 },
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
  ])
    assert.equal(handlesBackLink({ ...event, ...patch }, link, labels), false);
});
