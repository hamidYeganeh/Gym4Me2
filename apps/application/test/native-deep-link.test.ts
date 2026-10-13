import assert from "node:assert/strict";
import test from "node:test";
import { nativeClubLink } from "../lib/native-deep-link";
const id = "11111111-1111-4111-8111-111111111111";
const branch = "22222222-2222-4222-8222-222222222222";
test("public custom and trusted HTTPS club links map to bundled routes", () => {
  assert.equal(
    nativeClubLink(`gym4me://club/${id}`),
    `/discovery/club?id=${id}`,
  );
  assert.equal(
    nativeClubLink(
      `https://gym.example/discovery/clubs/${id}/reviews?branch=${branch}`,
      "https://gym.example",
    ),
    `/discovery/club?id=${id}&view=reviews&branch=${branch}`,
  );
});
test("external origins, credentials, arbitrary routes and malformed IDs are rejected", () => {
  for (const url of [
    `https://evil.example/discovery/clubs/${id}`,
    `http://gym.example/discovery/clubs/${id}`,
    `https://user:password@gym.example/discovery/clubs/${id}`,
    `gym4me://club:9000/${id}`,
    "gym4me://club/not-a-uuid",
    "gym4me://login/account",
    "javascript:alert(1)",
    "https://gym.example/profile",
    `https://gym.example/discovery/clubs/${id}/../../profile`,
  ])
    assert.equal(nativeClubLink(url, "https://gym.example"), null, url);
  assert.equal(
    nativeClubLink(`https://gym.example/discovery/clubs/${id}`),
    null,
  );
});
test("untrusted query parameters never enter the app route", () => {
  assert.equal(
    nativeClubLink(
      `gym4me://club/${id}?token=secret&returnTo=https://evil.example&branch=invalid`,
    ),
    `/discovery/club?id=${id}`,
  );
});
