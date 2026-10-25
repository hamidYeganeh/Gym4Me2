// Guards presentation copy; identifiers, test fixtures and protocol/style values are not copy.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const failures = [];
const inputs = [
  "apps/website/src",
  "apps/application/app",
  "apps/application/components",
  "apps/application/lib",
  "apps/business/app",
  "apps/admin/app",
  "packages/ui/src",
];
const labelProps = new Set([
  "aria-label",
  "aria-roledescription",
  "title",
  "placeholder",
  "alt",
  "label",
  "description",
  "text",
]);
function visit(file) {
  if (/\.(styles|types|test|spec)\./.test(file) || file.includes("/icons/"))
    return;
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  function fail(node, reason) {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    failures.push(`${path.relative(root, file)}:${line} ${reason}`);
  }
  function walk(node) {
    if (ts.isJsxText(node) && /\p{L}/u.test(node.getText(sf).trim()))
      fail(node, "Use a translation for JSX text.");
    if (ts.isStringLiteral(node)) {
      const parent = node.parent;
      if (
        ts.isJsxAttribute(parent) &&
        labelProps.has(parent.name.getText(sf)) &&
        /\p{L}/u.test(node.text)
      )
        fail(node, "Use a translation for a visible or accessible label.");
      if (
        /[\u0621-\u063a\u0641-\u064a\u067e\u0686\u0698\u06af\u06a9\u06cc]/.test(
          node.text,
        ) &&
        !(ts.isJsxAttribute(parent) && parent.name.getText(sf) === "pattern")
      )
        fail(node, "Move Persian copy to the message catalog.");
    }
    ts.forEachChild(node, walk);
  }
  walk(sf);
}
function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (/\.(ts|tsx)$/.test(file)) visit(file);
  }
}
inputs.forEach((input) => scan(path.join(root, input)));
const { hasMessage } = require("../src/backend.cjs");
function serverScan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) serverScan(file);
    else if (file.endsWith(".ts") && !file.endsWith(".spec.ts")) {
      const source = fs.readFileSync(file, "utf8");
      for (const code of source.matchAll(/["'](Backend\.[\w]+)["']/g))
        if (!hasMessage(code[1]))
          failures.push(`${path.relative(root, file)} unknown code ${code[1]}`);
    }
  }
}
serverScan(path.join(root, "apps/api/src"));
if (failures.length) {
  process.stderr.write(failures.join("\n") + "\n");
  process.exitCode = 1;
} else
  process.stdout.write(
    "Presentation copy and server message codes are catalog-backed.\n",
  );
