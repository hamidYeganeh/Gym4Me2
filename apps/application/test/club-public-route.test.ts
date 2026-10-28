import assert from "node:assert/strict";
import test from "node:test";
import { clubHref } from "../lib/club-href";
import { detailView } from "../lib/catalog-view";
import { protectedCatalogFixtures } from "./fixtures/protected-catalog";

test("public club links omit branch identifiers but retain gallery selection", () => {
  assert.equal(clubHref("madar", "gallery", { branch: "private-id", photo: "2" }), "/discovery/clubs/madar/gallery?photo=2");
  assert.equal(clubHref("madar", "slots", { branch: "private-id" }), "/discovery/clubs/madar/slots");
});
test("detail links use the public slug and missing hours are compact", () => {
  const fixture = protectedCatalogFixtures();
  const club = fixture.clubs[0]!;
  const result = detailView(club, undefined, "en");
  assert.equal(result.href, `/discovery/clubs/${club.slug}`);
  assert.equal(result.hours, "-");
  assert.equal(result.id, club.id); // Internal API identity is not a navigation identifier.
});
