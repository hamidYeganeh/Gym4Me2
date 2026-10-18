import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const sharp = require("sharp");
const directory = new URL(
  "../docs/qa/baselines/ph0-cards-2026-10-18/",
  import.meta.url,
);
const before = JSON.parse(
  await readFile(
    new URL("../docs/qa/ph0-cards-reference-2026-10-18.json", import.meta.url),
    "utf8",
  ),
);
const after = JSON.parse(
  await readFile(
    new URL("../docs/qa/ph0-cards-after-2026-10-18.json", import.meta.url),
    "utf8",
  ),
);
const cases = [];
for (const reference of before.cases) {
  const current = after.cases.find(
    (sample) =>
      sample.lang === reference.lang &&
      sample.dark === reference.dark &&
      sample.viewport[0] === reference.viewport[0],
  );
  if (!current) throw new Error("Missing final reference");
  const first = await readFile(new URL(reference.file, directory)),
    second = await readFile(new URL(current.file, directory));
  const firstMetadata = await sharp(first).metadata(),
    secondMetadata = await sharp(second).metadata();
  const a = await sharp(first)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const b = await sharp(second)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cards = [];
  for (const old of reference.cardBounds) {
    const fresh = current.cardBounds.find((card) => card.id === old.id);
    if (
      !fresh ||
      Math.round(fresh.width) !== Math.round(old.width) ||
      Math.round(fresh.height) !== Math.round(old.height)
    )
      throw new Error(`Geometry changed: ${old.id}`);
    const width = Math.round(old.width),
      height = Math.round(old.height);
    let differentPixels = 0,
      maxChannelDelta = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i =
          ((Math.round(old.y) + y) * a.info.width + Math.round(old.x) + x) * 4;
        const j =
          ((Math.round(fresh.y) + y) * b.info.width + Math.round(fresh.x) + x) *
          4;
        let different = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(a.data[i + channel] - b.data[j + channel]);
          if (!Number.isFinite(delta))
            throw new Error("Crop outside screenshot");
          if (delta) different = true;
          maxChannelDelta = Math.max(maxChannelDelta, delta);
        }
        if (different) differentPixels++;
      }
    cards.push({
      id: old.id,
      width,
      height,
      geometryDelta: {
        width: fresh.width - old.width,
        height: fresh.height - old.height,
      },
      differentPixels,
      maxChannelDelta,
    });
  }
  cases.push({
    locale: reference.lang,
    theme: reference.dark ? "dark" : "light",
    width: reference.viewport[0],
    before: reference.file,
    after: current.file,
    formats: [firstMetadata.format, secondMetadata.format],
    exactComparisonEligible:
      firstMetadata.format === "png" && secondMetadata.format === "png",
    beforeSha256: createHash("sha256").update(first).digest("hex"),
    afterSha256: createHash("sha256").update(second).digest("hex"),
    cards,
  });
}
const report = {
  scope:
    "84 synthetic article rectangles, translated by recorded DOM coordinates and rounded to CSS pixels; no tolerance, excludes exterior shadows and surrounding page chrome. Not map, complete detail, or full PH0 acceptance.",
  beforeBuild: before.build,
  afterBuild: after.build,
  acceptance:
    "Unverified. Original captures are lossy JPEG; raw differences cannot establish pixel preservation or a product regression. Keep references and repeat with lossless, stable framing.",
  cases,
};
await writeFile(
  new URL(
    "../docs/qa/ph0-card-pixel-comparison-2026-10-18.json",
    import.meta.url,
  ),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    cases: cases.length,
    cards: cases.flatMap((sample) => sample.cards).length,
    changed: cases
      .flatMap((sample) => sample.cards)
      .filter((card) => card.differentPixels).length,
    exactComparisonEligible: cases.every(
      (sample) => sample.exactComparisonEligible,
    ),
  }),
);
