import { readFile, writeFile } from "node:fs/promises";
import { contrast } from "./ph0-token-contrast.mjs";
const load = async (path) => JSON.parse(await readFile(path, "utf8"));
const report = await load(
  "docs/qa/ph0-auth-errors-observations-2026-10-18.json",
);
const messages = {
  fa: await load("packages/i18n/src/messages/fa.json"),
  en: await load("packages/i18n/src/messages/en.json"),
};
const key = (sample) =>
  [
    sample.surface,
    sample.locale,
    sample.theme,
    sample.viewport[0],
    sample.mode,
    sample.stage,
  ].join("/");
const expected = ["application", "business", "admin"].flatMap((surface) =>
  ["fa", "en"].flatMap((locale) =>
    ["dark", "light"].flatMap((theme) =>
      [360, 390, 430, 1024].flatMap((width) =>
        ["otp", "password"].flatMap((mode) =>
          (mode === "password"
            ? ["empty", "malformed", "password-missing"]
            : ["empty", "malformed"]
          ).map((stage) =>
            [surface, locale, theme, width, mode, stage].join("/"),
          ),
        ),
      ),
    ),
  ),
);
const checks = report.cases.map((sample) => {
  const expectedErrors =
    sample.surface === "application"
      ? {}
      : sample.stage === "password-missing"
        ? { password: "passwordRequired" }
        : {
            phone: sample.stage === "empty" ? "phoneRequired" : "phoneInvalid",
            ...(sample.mode === "password"
              ? { password: "passwordRequired" }
              : {}),
          };
  const errorFields = sample.validation.fields.filter((field) => field.invalid);
  const errors =
    sample.validation.errorTexts.length ===
      Object.keys(expectedErrors).length &&
    Object.entries(expectedErrors).every(([name, error]) => {
      const field = sample.validation.fields.find(
        (field) => field.field === name,
      );
      return (
        field?.invalid &&
        field.errors.length === 1 &&
        field.errors[0].text === messages[sample.locale].AuthValidation[error]
      );
    }) &&
    errorFields.length === Object.keys(expectedErrors).length;
  const linked = sample.validation.fields.every(
    (field) =>
      field.uniqueId &&
      (!field.invalid ||
        field.errors.every(
          (error) => error.uniqueId && error.inForm && error.role === "alert",
        )),
  );
  const ratios = errorFields.flatMap((field) =>
    field.errors.map((error) => contrast(error.foreground, error.background)),
  );
  return {
    case: key(sample),
    noValidate: sample.validation.noValidate,
    errors,
    linked,
    contrast: ratios.every((ratio) => ratio >= 4.5),
    ratios,
    targets: sample.controls.every(
      (control) => control.height >= 44 && control.width >= 44,
    ),
    labels: sample.inputs.every(
      (input) =>
        input.labelled &&
        input.height >= 44 &&
        input.width >= 44 &&
        parseFloat(input.fontSize) >= 16,
    ),
    focus:
      sample.surface === "application"
        ? sample.submitDisabled
        : sample.validation.focusedField ===
          (sample.stage === "password-missing" ? "password" : "phone"),
    layout: sample.documentWidth <= sample.viewport[0],
  };
});
const observed = report.cases.map(key),
  missing = expected.filter((item) => !observed.includes(item));
const networkExpected = ["application", "business", "admin"].flatMap(
  (surface) => ["fa", "en"].map((locale) => `${surface}/${locale}`),
);
const networkObserved = report.network.map(
  (sample) => `${sample.surface}/${sample.locale}`,
);
const networkComplete =
  networkObserved.length === networkExpected.length &&
  networkExpected.every((key) => networkObserved.includes(key)) &&
  report.network.every((sample) => !sample.truncated);
const failing = checks.filter((sample) =>
  Object.entries(sample).some(
    ([name, value]) => !["case", "ratios"].includes(name) && !value,
  ),
);
const result = {
  scope:
    "240 observed invalid/disabled login states only; localized links/focus/contrast/layout, not complete auth/WCAG/PH0 acceptance",
  expected: expected.length,
  observed: observed.length,
  missing,
  unique: new Set(observed).size === observed.length,
  invalidAuthPosts: report.network.reduce((sum, item) => sum + item.posts, 0),
  networkComplete,
  failing,
  checks,
};
await writeFile(
  "docs/qa/ph0-auth-errors-checks-2026-10-18.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log({
  expected: result.expected,
  observed: result.observed,
  missing: missing.length,
  failing: failing.length,
  invalidAuthPosts: result.invalidAuthPosts,
});
process.exitCode =
  !missing.length &&
  result.unique &&
  observed.length === expected.length &&
  !failing.length &&
  result.invalidAuthPosts === 0 &&
  networkComplete
    ? 0
    : 1;
