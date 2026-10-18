import { readFile, writeFile } from "node:fs/promises";

const path = "docs/qa/ph0-auth-observations-2026-10-18.json";
const report = JSON.parse(await readFile(path, "utf8"));
const key = (sample) =>
  [
    sample.surface,
    sample.locale,
    sample.theme,
    sample.viewport[0],
    sample.mode,
  ].join("/");
const expected = ["application", "business", "admin"].flatMap((surface) =>
  ["fa", "en"].flatMap((locale) =>
    ["dark", "light"].flatMap((theme) =>
      [360, 390, 430, 1024].flatMap((width) =>
        ["otp", "password"].map((mode) =>
          [surface, locale, theme, width, mode].join("/"),
        ),
      ),
    ),
  ),
);
const observed = report.cases.map(key);
const checks = report.cases.map((sample) => ({
  case: key(sample),
  heading: sample.headings.length === 1 && !!sample.headings[0],
  direction: sample.direction === (sample.locale === "fa" ? "rtl" : "ltr"),
  targets:
    sample.controls.length > 0 &&
    sample.controls.every(
      (control) => control.width >= 44 && control.height >= 44,
    ),
  inputs:
    sample.inputs.length > 0 &&
    sample.inputs.every(
      (input) =>
        input.height >= 44 &&
        parseFloat(input.fontSize) >= 16 &&
        input.labelled,
    ),
  password:
    sample.inputs.some((input) => input.type === "password") ===
    (sample.mode === "password"),
  phoneFocus: !!sample.focusedId && sample.focusedId === sample.inputs[0]?.id,
  blankGuard:
    sample.surface === "application"
      ? sample.validation.submitDisabled && !sample.validation.clickedSubmit
      : !sample.validation.submitDisabled &&
        sample.validation.clickedSubmit &&
        sample.invalidInputCount > 0,
  noOverflow: sample.documentWidth <= sample.viewport[0],
}));
const missing = expected.filter((key) => !observed.includes(key));
const complete =
  observed.length === expected.length &&
  new Set(observed).size === expected.length &&
  !missing.length;
const failing = checks.filter((sample) =>
  Object.entries(sample).some(([key, value]) => key !== "case" && !value),
);
const result = {
  scope:
    "Observed initial OTP/password login layouts and blank native validation only; no OTP delivery, credentials, real authentication, reader, browser zoom or full PH0 acceptance",
  expected: expected.length,
  observed: observed.length,
  complete,
  missing,
  failing,
  checks,
};
await writeFile(
  "docs/qa/ph0-auth-checks-2026-10-18.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log({
  expected: result.expected,
  observed: result.observed,
  complete,
  failing: failing.length,
});
process.exitCode = complete && !failing.length ? 0 : 1;
