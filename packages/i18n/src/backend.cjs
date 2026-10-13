// Framework-free runtime for Nest and build scripts. JSON is the single source of copy.
const fa = require("./messages/fa.json");
const en = require("./messages/en.json");
const catalogs = { fa, en };
function resolveLocale(header) {
  const languages = String(header ?? "")
    .split(",")
    .map((part, index) => {
      const [language, quality] = part.trim().split(";");
      return {
        locale: language?.toLowerCase().split("-")[0],
        weight: quality?.startsWith("q=") ? Number(quality.slice(2)) : 1,
        index,
      };
    })
    .filter((item) => ["fa", "en"].includes(item.locale) && item.weight > 0);
  languages.sort((a, b) => b.weight - a.weight || a.index - b.index);
  return languages[0]?.locale ?? "fa";
}
function lookup(catalog, code) {
  return code
    .split(".")
    .reduce(
      (value, key) =>
        value && Object.hasOwn(value, key) ? value[key] : undefined,
      catalog,
    );
}
function hasMessage(code) {
  return typeof code === "string" && typeof lookup(fa, code) === "string";
}
function translate(code, locale = "fa", parameters = {}) {
  const catalog = catalogs[locale] ?? fa;
  const message = lookup(catalog, code);
  if (typeof message !== "string")
    throw new Error(`Unknown translation key: ${code}`);
  return message.replace(/\{(\w+)\}/g, (_, key) =>
    String(parameters[key] ?? ""),
  );
}
module.exports = { resolveLocale, hasMessage, translate };
