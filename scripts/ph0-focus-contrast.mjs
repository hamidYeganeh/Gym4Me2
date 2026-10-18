import { readFile, writeFile } from "node:fs/promises";
import { contrast } from "./ph0-token-contrast.mjs";

const source =
  process.argv[2] ?? "docs/qa/ph0-focus-observations-2026-10-18.json";
const observations = JSON.parse(await readFile(source, "utf8"));
const cases = observations.cases.map((sample) => {
  const painted =
    sample.requestMatched &&
    sample.focusVisible &&
    sample.active &&
    sample.renderOpacity === "1" &&
    sample.outlineStyle === "solid" &&
    parseFloat(sample.outlineWidth) >= 2;
  if (sample.forcedColors)
    return {
      ...sample,
      colorCheck:
        "System colors; excluded from the opaque two-tone calculation",
      indicatorPresent: painted && sample.boxShadow === "none",
    };
  const band = sample.boxShadow.match(/(?:oklch|oklab|rgb)\([^)]*\)/)?.[0];
  let pairRatio = null;
  let colorError = null;
  try {
    if (band) pairRatio = contrast(sample.outlineColor, band);
  } catch (error) {
    colorError = error.message;
  }
  const worstUniformBackdropRatio =
    pairRatio === null ? null : Math.sqrt(pairRatio);
  const clipAware =
    sample.kind !== "card-overlay" ||
    (parseFloat(sample.outlineOffset) < 0 &&
      sample.boxShadow.includes("inset"));
  return {
    ...sample,
    band,
    colorError,
    pairRatio,
    worstUniformBackdropRatio,
    indicatorPresent: painted && clipAware && worstUniformBackdropRatio >= 3,
  };
});
const surfaces = [...new Set(cases.map(({ surface }) => surface))];
const report = {
  scope:
    "Computed styles for observed focused controls only. The two opaque tones' pair contrast and worst uniform backdrop are checked; complex photos, clipping, pixel rendering, other controls and full WCAG/PH0 acceptance require separate evidence.",
  method:
    "Opaque CSS Color4/sRGB luminance; minimum over a uniform backdrop is sqrt(pair contrast). No rounding before the 3:1 comparison. Forced-colors cases use system colors and are not a numeric WCAG pass.",
  sources: [
    "https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html",
  ],
  surfaces,
  requiredSurfacesObserved: ["application", "business", "admin"].every(
    (surface) => surfaces.includes(surface),
  ),
  allObservedIndicatorsPresent:
    cases.length > 0 && cases.every(({ indicatorPresent }) => indicatorPresent),
  cases,
};
await writeFile(
  "docs/qa/ph0-focus-contrast-2026-10-18.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    cases: cases.length,
    surfaces,
    present: report.allObservedIndicatorsPresent,
    requiredSurfacesObserved: report.requiredSurfacesObserved,
  }),
);
process.exitCode =
  report.allObservedIndicatorsPresent && report.requiredSurfacesObserved
    ? 0
    : 1;
