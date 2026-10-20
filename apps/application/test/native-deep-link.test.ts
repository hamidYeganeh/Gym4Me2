import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  nativeSportsRoutes,
  nativeHttpsPathPrefixes,
} from "../lib/native-link-routes.mjs";
import { appleAssociation } from "../lib/domain-associations.mjs";
import { nativeClubLink, nativeAppLink } from "../lib/native-deep-link";
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

test("sports deep links resolve to static shells and strip untrusted parameters", () => {
  assert.equal(
    nativeAppLink(`gym4me://service/${id}?token=secret`),
    `/services/detail?id=${id}`,
  );
  assert.equal(
    nativeAppLink(`https://gym.example/messages/${id}`, "https://gym.example"),
    `/messages/conversation?id=${id}`,
  );
  assert.equal(
    nativeAppLink(`https://evil.example/services/${id}`, "https://gym.example"),
    null,
  );
  assert.equal(nativeAppLink("gym4me://service/invalid"), null);
});

test("every accepted native family is registered in Android and Apple associations", () => {
  const manifest = readFileSync(
    new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url),
    "utf8",
  );
  const filters = [
    ...manifest.matchAll(
      /<intent-filter\b([^>]*)>([\s\S]*?)<\/intent-filter>/g,
    ),
  ];
  const https = filters.filter(([, attrs]) =>
    /android:autoVerify="true"/.test(attrs),
  );
  const custom = filters.filter(([, , body]) =>
    /android:scheme="gym4me"/.test(body),
  );
  const data = (body: string) =>
    [...body.matchAll(/<data\s+([^>]+)\/>/g)].map(([, attrs]) =>
      Object.fromEntries(
        [...attrs.matchAll(/android:(\w+)="([^"]*)"/g)].map(
          ([, key, value]) => [key, value],
        ),
      ),
    );
  assert.deepEqual(
    https.flatMap(([, , body]) =>
      data(body).map((entry) => [entry.scheme, entry.host, entry.pathPrefix]),
    ),
    nativeHttpsPathPrefixes.map((prefix) => ["https", "gym4me.ir", prefix]),
  );
  assert.deepEqual(
    custom.flatMap(([, , body]) =>
      data(body).map((entry) => [entry.scheme, entry.host]),
    ),
    [
      "club",
      ...nativeSportsRoutes.flatMap(({ schemeHost, webSegment }) => [
        schemeHost,
        webSegment,
      ]),
    ].map((host) => ["gym4me", host]),
  );
  assert.deepEqual(
    appleAssociation("ABCDEFGHIJ.com.gym4me.app").applinks.details[0]
      .components,
    nativeHttpsPathPrefixes.map((prefix) => ({ "/": `${prefix}*` })),
  );
  for (const { schemeHost, webSegment, shell } of nativeSportsRoutes) {
    for (const host of [schemeHost, webSegment])
      assert.equal(
        nativeAppLink(`gym4me://${host}/${id}?token=secret`),
        `${shell}?id=${id}`,
      );
    assert.equal(
      nativeAppLink(
        `https://gym4me.ir/${webSegment}/${id}?returnTo=https://evil.test`,
        "https://gym4me.ir",
      ),
      `${shell}?id=${id}`,
    );
    assert.equal(
      nativeAppLink(
        `https://evil.test/${webSegment}/${id}`,
        "https://gym4me.ir",
      ),
      null,
    );
    assert.equal(nativeAppLink(`gym4me://${schemeHost}/invalid`), null);
    assert.equal(
      nativeAppLink(
        `https://gym4me.ir/${webSegment}/${id}/extra`,
        "https://gym4me.ir",
      ),
      null,
    );
  }
  assert.equal(nativeAppLink(`gym4me://unknown/${id}`), null);
  assert.equal(
    nativeAppLink(`https://gym4me.ir/profile/${id}`, "https://gym4me.ir"),
    null,
  );
});
