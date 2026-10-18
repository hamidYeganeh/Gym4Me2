import { readFile, writeFile } from "node:fs/promises";
const report = JSON.parse(
  await readFile("docs/qa/ph0-auth-denied-2026-10-18.json", "utf8"),
);
const activations = [
  "double-click",
  "keyboard",
  "leave-focus",
  "otp-double-click",
];
const expected = ["application", "business", "admin"].flatMap((surface) =>
  activations.map((activation) => `${surface}/${activation}`),
);
const key = (sample) => `${sample.surface}/${sample.activation}`;
const checks = report.cases.map((sample) => {
  const keyboard = ["keyboard", "leave-focus"].includes(sample.activation);
  const extent = sample.focusVisible
    ? parseFloat(sample.outlineWidth) +
      Math.max(0, parseFloat(sample.outlineOffset))
    : 0;
  const r = sample.rect;
  return {
    case: key(sample),
    singleRequest: sample.posts === 1,
    denied: sample.statuses.length === 1 && sample.statuses[0] === 405,
    observed: !sample.truncated,
    active: sample.active,
    keyboardIndicator: !keyboard || sample.focusVisible,
    correctFocus:
      sample.activation === "keyboard"
        ? sample.tag === "INPUT" && sample.field === "password"
        : sample.activation === "leave-focus"
          ? sample.tag === "A" && sample.href?.startsWith("/privacy")
          : sample.tag === "BUTTON" && sample.type === "submit",
    extent,
    focusInViewport: sample.focusVisible
      ? extent > 0 &&
        r.x >= extent &&
        r.y >= extent &&
        r.x + r.width <= sample.viewport[0] - extent &&
        r.y + r.height <= sample.viewport[1] - extent
      : sample.inViewport,
  };
});
const keys = report.cases.map(key),
  missing = expected.filter((key) => !keys.includes(key));
const failing = checks.filter((sample) =>
  Object.entries(sample).some(
    ([key, value]) => !["case", "extent"].includes(key) && !value,
  ),
);
const complete =
  keys.length === expected.length &&
  new Set(keys).size === expected.length &&
  !missing.length;
const result = {
  scope:
    "12 synthetic local405 cases in fa/360 with default system appearance only. Keyboard cases require focus-visible and the full indicator in the viewport; pointer cases require retained active focus/control visibility, and an indicated ring is also checked when the UA chooses to show it. No cross-theme, successful auth/OTP/session, full reader or complete rapid-input acceptance.",
  source: "https://www.w3.org/TR/selectors-4/#the-focus-visible-pseudo",
  complete,
  missing,
  failing,
  checks,
};
await writeFile(
  "docs/qa/ph0-auth-denied-checks-2026-10-18.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log({ cases: keys.length, complete, failing: failing.length });
process.exitCode = complete && !failing.length ? 0 : 1;
