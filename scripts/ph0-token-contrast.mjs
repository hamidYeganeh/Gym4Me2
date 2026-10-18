import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// CSS Color 4 matrices: https://raw.githubusercontent.com/w3c/csswg-drafts/main/css-color-4/conversions.js
const multiply = (matrix, values) =>
  matrix.map((row) =>
    row.reduce((sum, value, i) => sum + value * values[i], 0),
  );
const linear = (value) =>
  value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
export function luminance(color) {
  let rgb;
  const values = color.match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)?.map(Number);
  if (!values || values.length !== 3)
    throw new Error(`Unsupported opaque color: ${color}`);
  if (color.startsWith("rgb("))
    rgb = values.map((value) => linear(value / 255));
  else if (color.startsWith("oklch(") || color.startsWith("oklab(")) {
    const [light, chroma, hue] = values;
    const radians = (hue * Math.PI) / 180;
    const lab = color.startsWith("oklab(")
      ? values
      : [light, chroma * Math.cos(radians), chroma * Math.sin(radians)];
    const lms = multiply(
      [
        [1, 0.3963377773761749, 0.2158037573099136],
        [1, -0.1055613458156586, -0.0638541728258133],
        [1, -0.0894841775298119, -1.2914855480194092],
      ],
      lab,
    ).map((v) => v ** 3);
    const xyz = multiply(
      [
        [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
        [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
        [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
      ],
      lms,
    );
    rgb = multiply(
      [
        [12831 / 3959, -329 / 214, -1974 / 3959],
        [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
        [705 / 12673, -2585 / 12673, 705 / 667],
      ],
      xyz,
    );
  } else throw new Error(`Unsupported color space: ${color}`);
  const clamped = rgb.map((v) => Math.max(0, Math.min(1, v)));
  return 0.2126 * clamped[0] + 0.7152 * clamped[1] + 0.0722 * clamped[2];
}
export function contrast(foreground, background) {
  const first = luminance(foreground),
    second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  assert.equal(contrast("rgb(0, 0, 0)", "rgb(255, 255, 255)"), 21);
  assert.ok(Math.abs(contrast("oklch(0.5 0 0)", "oklch(0.5 0 0)") - 1) < 1e-9);
  const source = process.argv[2]
    ? pathToFileURL(process.argv[2])
    : new URL(
        "../docs/qa/ph0-cards-reference-2026-10-18.json",
        import.meta.url,
      );
  const references = JSON.parse(await readFile(source, "utf8"));
  const cases = references.cases.map((sample) => ({
    locale: sample.lang,
    theme: sample.dark ? "dark" : "light",
    width: sample.viewport[0],
    pairs: sample.tokens.map(({ id, fg, bg }) => ({
      id,
      fg,
      bg,
      ratio: contrast(fg, bg),
      textAA: contrast(fg, bg) >= 4.5,
    })),
  }));
  const report = {
    source: source.pathname,
    method:
      "CSS Color 4 to linear sRGB, channel clipping for out-of-gamut values, WCAG luminance; opaque token pairs only, not photographic pixels or a full accessibility audit",
    cases,
  };
  await writeFile(
    new URL("../docs/qa/ph0-token-contrast-2026-10-18.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      pairs: cases.reduce((sum, sample) => sum + sample.pairs.length, 0),
      insufficient: cases.flatMap((sample) =>
        sample.pairs
          .filter((pair) => !pair.textAA)
          .map((pair) => ({
            theme: sample.theme,
            token: pair.id,
            ratio: pair.ratio,
          })),
      ),
    }),
  );
}
