const test = require("node:test");
const assert = require("node:assert/strict");
const fa = require("../src/messages/fa.json");
const en = require("../src/messages/en.json");
const { resolveLocale, translate, hasMessage } = require("../src/backend.cjs");
function flatten(value, prefix = "") {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) =>
      typeof item === "string"
        ? [[prefix + key, item]]
        : Object.entries(flatten(item, prefix + key + ".")),
    ),
  );
}
test("all supported languages have the same keys and interpolation arguments", () => {
  const left = flatten(fa),
    right = flatten(en);
  assert.deepEqual(Object.keys(left).sort(), Object.keys(right).sort());
  const args = (message) =>
    [
      ...new Set(
        [...message.matchAll(/\{([a-zA-Z]\w*)(?:\}|,)/g)].map(
          (match) => match[1],
        ),
      ),
    ].sort();
  for (const key of Object.keys(left)) {
    assert.ok(left[key].trim(), key);
    assert.ok(right[key].trim(), key);
    assert.deepEqual(args(left[key]), args(right[key]), key);
  }
});
test("API language negotiation and translated error parameters are stable", () => {
  assert.equal(resolveLocale("de, en-US;q=0.7, fa;q=0.9"), "fa");
  assert.equal(resolveLocale("en-US,fa;q=0.5"), "en");
  assert.equal(resolveLocale("de,en;q=0"), "fa");
  assert.equal(hasMessage("Backend.clubNotFound"), true);
  assert.equal(hasMessage("unknown.key"), false);
  assert.notEqual(
    translate("Backend.clubNotFound", "en"),
    translate("Backend.clubNotFound", "fa"),
  );
  assert.ok(
    translate("Backend.invalidTaxonomyReference", "en", {
      kind: "sports",
    }).includes("sports"),
  );
});
