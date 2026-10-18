import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const sharp = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
)("sharp");
const reportPath = "docs/qa/ph0-backed-focus-2026-10-18.json";
const report = JSON.parse(await readFile(reportPath, "utf8"));
const directory = "docs/qa/baselines/ph0-backed-focus-2026-10-18/";
for (const width of [360, 390, 430]) {
  const layers = [];
  const cases = report.cases.filter((sample) => sample.viewport[0] === width);
  if (cases.length !== 20) throw new Error(`Incomplete width ${width}`);
  for (const [index, sample] of cases.entries()) {
    const bytes = await readFile(directory + sample.file);
    if (createHash("sha256").update(bytes).digest("hex") !== sample.sha256)
      throw new Error(`Changed raster: ${sample.file}`);
    const { data, info } = await sharp(bytes)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const r = sample.rect;
    const scale = sample.dpr;
    const crop = await sharp(bytes)
      .extract({
        left: Math.floor((r.x - 8) * scale),
        top: Math.floor((r.y - 8) * scale),
        width: Math.ceil((r.width + 16) * scale),
        height: Math.ceil((r.height + 16) * scale),
      })
      .resize(210, 300, {
        fit: "contain",
        background: sample.theme === "dark" ? "#0a0a0a" : "#fff",
      })
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg width="220" height="30"><rect width="220" height="30" fill="white"/><text x="5" y="18" font-family="sans-serif" font-size="12">${sample.locale}/${sample.theme}/${sample.id}</text></svg>`,
    );
    const left = (index % 5) * 220;
    const top = Math.floor(index / 5) * 335;
    layers.push({ input: label, left, top });
    layers.push({ input: crop, left: left + 5, top: top + 30 });
    const column = [];
    const y = Math.round((r.y + r.height / 2) * scale);
    for (let dx = 0; dx < 9 * scale; dx++) {
      const x = Math.round(r.x * scale) + dx;
      const offset = (y * info.width + x) * info.channels;
      column.push([...data.subarray(offset, offset + 3)]);
    }
    sample.visualProbe = {
      scope:
        "Left edge at half height; only this short horizontal pixel sample",
      column,
      min: Math.min(...column.flat()),
      max: Math.max(...column.flat()),
    };
    sample.pngVerified =
      info.width === sample.png.width && info.height === sample.png.height;
    sample.stableFrames =
      sample.captureHashes?.length >= 2 &&
      sample.captureHashes.at(-1) === sample.captureHashes.at(-2);
  }
  await sharp({
    create: { width: 1100, height: 1340, channels: 3, background: "white" },
  })
    .composite(layers)
    .png()
    .toFile(directory + `contact-${width}.png`);
}
report.captureSummary = {
  cases: report.cases.length,
  dimensionsVerified: report.cases.every((sample) => sample.pngVerified),
  stableFrames: report.cases.every((sample) => sample.stableFrames),
  captureCountRange: [
    Math.min(...report.cases.map((sample) => sample.captureHashes.length)),
    Math.max(...report.cases.map((sample) => sample.captureHashes.length)),
  ],
  scope:
    "60 current focused synthetic card cases; visual aids, not before/after acceptance",
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(report.captureSummary);
if (
  !report.captureSummary.dimensionsVerified ||
  !report.captureSummary.stableFrames
)
  process.exitCode = 1;
