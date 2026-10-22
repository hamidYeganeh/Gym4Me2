import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("bundled map SDK retains the official Leaflet 1.9.4 integrity hashes and licence", async () => {
  const directory = new URL("../public/vendor/leaflet/", import.meta.url);
  for (const [name, expected] of [
    ["leaflet.js", "20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="],
    ["leaflet.css", "p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="],
  ]) {
    const hash = createHash("sha256")
      .update(await readFile(new URL(name!, directory)))
      .digest("base64");
    assert.equal(hash, expected);
  }
  assert.match(
    await readFile(new URL("LICENSE", directory), "utf8"),
    /Redistribution and use/,
  );
});
