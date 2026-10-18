import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const sharp = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
)("sharp");
const qa = new URL("../docs/qa/", import.meta.url);
const mode = process.argv[2] ?? "lossless";
if (!["lossless", "painted"].includes(mode))
  throw new Error("Expected lossless or painted");
const directory = new URL(`baselines/ph0-${mode}-2026-10-18/`, qa);
const load = async (name) =>
  JSON.parse(await readFile(new URL(name, qa), "utf8"));
const before = await load(`ph0-${mode}-before-2026-10-18.json`);
const after = await load(`ph0-${mode}-after-2026-10-18.json`);
const key = ({ locale, theme, width }) => `${locale}-${theme}-${width}`;
const cards = [];
for (const reference of before.cases) {
  const current = after.cases.find((sample) => key(sample) === key(reference));
  if (!current) throw new Error(`Missing case ${key(reference)}`);
  for (const old of reference.cards) {
    const fresh = current.cards.find(({ id }) => id === old.id);
    if (!fresh) throw new Error(`Missing card ${old.id}`);
    const decode = async (card) => {
      let bytes;
      if (mode === "painted") {
        const viewport = await readFile(new URL(card.viewportFile, directory));
        const metadata = await sharp(viewport).metadata();
        if (
          !card.viewportContained ||
          metadata.format !== "png" ||
          createHash("sha256").update(viewport).digest("hex") !==
            card.viewportSha256
        )
          throw new Error(`Invalid viewport capture: ${card.viewportFile}`);
        bytes = await sharp(viewport).extract(card.clip).png().toBuffer();
        await writeFile(new URL(card.file, directory), bytes);
      } else bytes = await readFile(new URL(card.file, directory));
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      if (mode === "lossless" && sha256 !== card.sha256)
        throw new Error(`Checksum changed: ${card.file}`);
      const metadata = await sharp(bytes).metadata();
      if (metadata.format !== "png")
        throw new Error(`Not lossless PNG: ${card.file}`);
      const decoded = await sharp(bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      decoded.sha256 = sha256;
      // A successful screenshot command can still return an unpainted solid layer.
      // Matching two blank captures must never count as preserved card content.
      decoded.solid = true;
      for (let offset = 4; offset < decoded.data.length; offset += 4) {
        if (
          [0, 1, 2].some(
            (channel) =>
              decoded.data[offset + channel] !== decoded.data[channel],
          )
        ) {
          decoded.solid = false;
          break;
        }
      }
      return decoded;
    };
    const a = await decode(old),
      b = await decode(fresh);
    const sameDimensions =
      a.info.width === b.info.width && a.info.height === b.info.height;
    const geometryDelta = Object.fromEntries(
      ["x", "y", "width", "height"].map((field) => [
        field,
        fresh.rect[field] - old.rect[field],
      ]),
    );
    let differentPixels = null,
      maxChannelDelta = null;
    if (sameDimensions) {
      differentPixels = 0;
      maxChannelDelta = 0;
      for (let offset = 0; offset < a.data.length; offset += 4) {
        let changed = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(
            a.data[offset + channel] - b.data[offset + channel],
          );
          if (delta) changed = true;
          maxChannelDelta = Math.max(maxChannelDelta, delta);
        }
        if (changed) differentPixels++;
      }
    }
    cards.push({
      case: key(reference),
      id: old.id,
      before: old.file,
      after: fresh.file,
      sameDimensions,
      geometryDelta,
      differentPixels,
      maxChannelDelta,
      solidCapture: { before: a.solid, after: b.solid },
      sha256: { before: a.sha256, after: b.sha256 },
      exact:
        !a.solid &&
        !b.solid &&
        sameDimensions &&
        differentPixels === 0 &&
        Object.values(geometryDelta).every((value) => value === 0),
    });
  }
}
if (
  before.cases.length !== 12 ||
  after.cases.length !== 12 ||
  cards.length !== 84
)
  throw new Error("Incomplete expected 12 × 7 matrix");
const report = {
  scope:
    "84 synthetic card PNG pairs with 16px exterior padding, fa/en, light/dark, widths 360/390/430. Zero tolerance; checksums and decoded RGBA compared. Solid captures are rejected, but non-solid alone does not establish complete painted content. Does not cover map, details, all variants/states, or complete PH0.",
  captureMode: mode,
  viewportHeights: [
    ...new Set(
      [...before.cases, ...after.cases].map(
        ({ viewportHeight }) => viewportHeight,
      ),
    ),
  ],
  beforeBuild: before.build,
  afterBuild: after.build,
  exactPairs: cards.filter(({ exact }) => exact).length,
  totalPairs: cards.length,
  accepted: cards.every(({ exact }) => exact),
  cards,
};
await writeFile(
  new URL(`ph0-${mode}-comparison-2026-10-18.json`, qa),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    exactPairs: report.exactPairs,
    totalPairs: report.totalPairs,
    accepted: report.accepted,
  }),
);
process.exitCode = report.accepted ? 0 : 1;
