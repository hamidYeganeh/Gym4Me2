/** Summarize CUA captures without treating route renders as interaction tests. */
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = `${root}.artifacts/luma-final-pass/`;
const destination = `${root}docs/qa/baselines/luma-full-screen-2026-10-24/`;
const records = [];
for (const file of (await readdir(directory)).sort()) {
  if (!/^\d{3}-.+-(fa|en)-(light|dark)-.*\.json$/.test(file)) continue;
  const record = JSON.parse(await readFile(`${directory}${file}`, "utf8"));
  const screenshot = await readFile(`${directory}${record.file}`);
  const locale = file.includes("-en-") ? "en" : "fa";
  const theme = file.includes("-dark-") ? "dark" : "light";
  if (
    record.unmapped ||
    record.loading ||
    record.busy ||
    record.logs.length ||
    record.brokenImages.length ||
    record.scrollWidth > record.width ||
    record.lang !== locale ||
    !record.theme.split(" ").includes(theme) ||
    record.captureError
  )
    throw new Error(`Unresolved capture: ${file}`);
  records.push({
    case: file.slice(0, -5),
    surface: record.surface,
    route: record.route,
    fixtureState: record.state,
    capturedAt: record.capturedAt,
    locale: record.lang,
    theme,
    viewport: [record.width, record.height],
    document: [record.scrollWidth, record.scrollHeight],
    headings: record.headings,
    alerts: record.alerts,
    screenshot: `.artifacts/luma-final-pass/${record.file}`,
    screenshotSha256: createHash("sha256").update(screenshot).digest("hex"),
    fullPage: record.fullPage,
  });
}
const base = records.filter((r) => r.case.endsWith("-filled-fa-light-390"));
if (base.length !== 112)
  throw new Error(`Expected 112 route renders, got ${base.length}`);
await mkdir(destination, { recursive: true });
await writeFile(
  `${destination}render-evidence.json`,
  JSON.stringify(
    {
      baseRevision: "821905d",
      transport: "CUA, local-only route canvas, synthetic fetch adapter",
      interpretation:
        "A route render verifies layout and runtime for that captured fixture. It does not assert every state, live role permission or successful mutation. 'filled' is the requested fixture mode; some domains naturally contain empty subviews.",
      results: {
        routeRenders: base.length,
        totalCaptures: records.length,
        runtimeErrors: 0,
        horizontalOverflow: 0,
        unresolvedLoading: 0,
        brokenImages: 0,
      },
      records,
    },
    null,
    2,
  ) + "\n",
);
console.log(`Verified ${base.length} routes and ${records.length} captures.`);
