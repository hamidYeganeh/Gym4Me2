import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("installable push app references real local icons with advertised dimensions", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  ) as {
    display: string;
    id: string;
    start_url: string;
    scope: string;
    icons: { src: string; sizes: string; type: string }[];
  };
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith("/icons/"));
    assert.equal(icon.type, "image/png");
    const png = await readFile(
      new URL("../public" + icon.src, import.meta.url),
    );
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  const apple = await readFile(
    new URL("../public/icons/icon-180.png", import.meta.url),
  );
  assert.equal(apple.readUInt32BE(16), 180);
  assert.equal(apple.readUInt32BE(20), 180);
});
