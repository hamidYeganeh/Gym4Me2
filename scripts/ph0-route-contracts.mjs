/** Source associations only. No static result grants PH0 runtime acceptance. */
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "../apps/application/node_modules/typescript/lib/typescript.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const inventory = JSON.parse(
  readFileSync(
    join(root, "docs/qa/ph0-surface-inventory-2026-10-18.json"),
    "utf8",
  ),
);
const cache = new Map();
const local = (file) => relative(root, file);
const position = (sf, node) => ({
  source: local(sf.fileName),
  line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
});
const compact = (node, sf) => node.getText(sf).replace(/\s+/g, " ");
const exported = (node, kind) =>
  node.modifiers?.some((modifier) => modifier.kind === kind);

function resolveImport(file, specifier) {
  let target;
  if (specifier.startsWith(".")) target = resolve(dirname(file), specifier);
  else if (specifier.startsWith("@/")) {
    const app = local(file).split("/").slice(0, 2).join("/");
    target = join(root, app, specifier.slice(2));
  } else if (specifier.startsWith("@repo/")) {
    const [name, ...segments] = specifier.slice(6).split("/");
    const directory = join(root, "packages", name),
      manifest = join(directory, "package.json");
    if (!existsSync(manifest)) return null;
    const exports = JSON.parse(readFileSync(manifest, "utf8")).exports ?? {};
    const key = segments.length ? `./${segments.join("/")}` : ".";
    let value = exports[key];
    if (!value)
      for (const [pattern, replacement] of Object.entries(exports)) {
        if (!pattern.includes("*") || typeof replacement !== "string") continue;
        const [before, after] = pattern.split("*");
        if (key.startsWith(before) && key.endsWith(after))
          value = replacement.replace(
            "*",
            key.slice(before.length, after.length ? -after.length : undefined),
          );
      }
    if (typeof value !== "string") return null;
    target = resolve(directory, value);
  } else return null;
  return (
    [
      target,
      `${target}.ts`,
      `${target}.tsx`,
      join(target, "index.ts"),
      join(target, "index.tsx"),
    ].find(
      (candidate) => /\.[cm]?tsx?$/.test(candidate) && existsSync(candidate),
    ) ?? null
  );
}

function moduleInfo(file) {
  if (cache.has(file)) return cache.get(file);
  const text = readFileSync(file, "utf8"),
    sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const info = {
    sf,
    nodes: new Map(),
    imports: new Map(),
    exports: new Map(),
    stars: [],
    sha256: createHash("sha256").update(text).digest("hex"),
  };
  cache.set(file, info);
  for (const statement of sf.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause &&
      !statement.importClause.isTypeOnly
    ) {
      const specifier = statement.moduleSpecifier.text,
        clause = statement.importClause;
      if (clause.name)
        info.imports.set(clause.name.text, { specifier, imported: "default" });
      if (clause.namedBindings && ts.isNamedImports(clause.namedBindings))
        for (const binding of clause.namedBindings.elements) {
          if (!binding.isTypeOnly)
            info.imports.set(binding.name.text, {
              specifier,
              imported: binding.propertyName?.text ?? binding.name.text,
            });
        }
      if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))
        info.imports.set(clause.namedBindings.name.text, {
          specifier,
          imported: "*",
        });
    }
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement)) &&
      statement.name
    ) {
      const name = statement.name.text;
      info.nodes.set(name, statement);
      if (exported(statement, ts.SyntaxKind.ExportKeyword))
        info.exports.set(
          exported(statement, ts.SyntaxKind.DefaultKeyword) ? "default" : name,
          { name },
        );
    }
    if (
      ts.isFunctionDeclaration(statement) &&
      !statement.name &&
      exported(statement, ts.SyntaxKind.DefaultKeyword)
    ) {
      info.nodes.set("default", statement);
      info.exports.set("default", { name: "default" });
    }
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        info.nodes.set(declaration.name.text, declaration);
        if (exported(statement, ts.SyntaxKind.ExportKeyword))
          info.exports.set(declaration.name.text, {
            name: declaration.name.text,
          });
      }
    if (ts.isExportAssignment(statement)) {
      info.nodes.set("default", statement.expression);
      info.exports.set("default", { name: "default" });
    }
    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const specifier = statement.moduleSpecifier?.text;
      if (!statement.exportClause && specifier) info.stars.push(specifier);
      if (statement.exportClause && ts.isNamedExports(statement.exportClause))
        for (const binding of statement.exportClause.elements) {
          if (!binding.isTypeOnly)
            info.exports.set(binding.name.text, {
              name: binding.propertyName?.text ?? binding.name.text,
              specifier,
            });
        }
    }
  }
  return info;
}

function findExport(file, name, visited = new Set()) {
  const key = `${file}#${name}`;
  if (visited.has(key)) return null;
  visited.add(key);
  const info = moduleInfo(file),
    entry = info.exports.get(name);
  if (entry) {
    if (!entry.specifier) return { file, name: entry.name };
    if (
      !entry.specifier.startsWith(".") &&
      !entry.specifier.startsWith("@repo/") &&
      !entry.specifier.startsWith("@/")
    )
      return { external: entry.specifier, name: entry.name };
    const next = resolveImport(file, entry.specifier);
    return next ? findExport(next, entry.name, visited) : null;
  }
  for (const star of info.stars) {
    const next = resolveImport(file, star),
      result = next && findExport(next, name, visited);
    if (result) return result;
  }
  return null;
}

function trace(entryFile) {
  const seen = new Set(),
    symbols = [],
    apiCalls = [],
    stateBranches = [],
    unresolved = [];
  function visitSymbol(file, name) {
    const key = `${file}#${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    const info = moduleInfo(file),
      node = info.nodes.get(name);
    if (!node) {
      const imported = info.imports.get(name);
      if (imported) visitImport(file, name, imported, info.sf);
      else unresolved.push({ source: local(file), symbol: name });
      return;
    }
    symbols.push({ ...position(info.sf, node), symbol: name });
    const references = new Set();
    function walk(child) {
      if (ts.isIdentifier(child)) references.add(child.text);
      if (ts.isCallExpression(child) && ts.isIdentifier(child.expression)) {
        const imported = info.imports.get(child.expression.text);
        if (imported?.specifier.startsWith("@repo/api")) {
          const apiFile = resolveImport(file, imported.specifier);
          const target = apiFile && findExport(apiFile, imported.imported);
          const definition =
            target?.file && moduleInfo(target.file).nodes.get(target.name);
          apiCalls.push({
            ...position(info.sf, child),
            hook: imported.imported,
            module: imported.specifier,
            expression: compact(child, info.sf),
            definition: definition
              ? {
                  ...position(moduleInfo(target.file).sf, definition),
                  symbol: target.name,
                }
              : null,
          });
        }
      }
      if (ts.isIfStatement(child) || ts.isConditionalExpression(child)) {
        const condition = ts.isIfStatement(child)
          ? child.expression
          : child.condition;
        if (
          /pending|loading|error|status|data|session|account|enabled|empty|length|hasNext|can[A-Z]|is[A-Z]/i.test(
            condition.getText(info.sf),
          )
        )
          stateBranches.push({
            ...position(info.sf, condition),
            condition: compact(condition, info.sf),
          });
      }
      if (
        ts.isBinaryExpression(child) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(child.operatorToken.kind)
      ) {
        const condition = child.left;
        if (
          /pending|loading|error|status|data|session|account|enabled|empty|length|hasNext|can[A-Z]|is[A-Z]/i.test(
            condition.getText(info.sf),
          )
        )
          stateBranches.push({
            ...position(info.sf, condition),
            condition: compact(condition, info.sf),
          });
      }
      ts.forEachChild(child, walk);
    }
    walk(node);
    for (const reference of references) {
      if (info.nodes.has(reference) && reference !== name)
        visitSymbol(file, reference);
      else if (info.imports.has(reference))
        visitImport(file, reference, info.imports.get(reference), info.sf);
    }
  }
  function visitImport(file, name, imported, sf) {
    // API hooks are boundaries: shared API/provider internals do not represent page-specific calls.
    if (imported.specifier.startsWith("@repo/api")) return;
    if (
      !imported.specifier.startsWith(".") &&
      !imported.specifier.startsWith("@repo/ui") &&
      !imported.specifier.startsWith("@/")
    )
      return;
    const next = resolveImport(file, imported.specifier);
    if (!next) return;
    const target =
      imported.imported !== "*" && findExport(next, imported.imported);
    if (target?.external) return;
    if (target?.file) visitSymbol(target.file, target.name);
    else
      unresolved.push({
        source: local(file),
        symbol: name,
        module: imported.specifier,
        reason: "namespace or unresolved export; manual review required",
      });
  }
  const entry = findExport(entryFile, "default");
  if (entry) visitSymbol(entry.file, entry.name);
  else
    unresolved.push({
      source: local(entryFile),
      symbol: "default",
      reason: "entry export could not be resolved",
    });
  const unique = (items) => [
    ...new Map(items.map((item) => [JSON.stringify(item), item])).values(),
  ];
  return {
    symbols,
    apiCalls: unique(apiCalls),
    stateBranches: unique(stateBranches),
    unresolved: unique(unresolved),
  };
}

const tests = [];
for (const directory of [
  "apps/application/test",
  "packages/api/test",
  "apps/api/test",
]) {
  for (const name of readdirSync(join(root, directory))) {
    if (!/\.(test|spec)\.tsx?$/.test(name)) continue;
    const file = join(root, directory, name),
      info = moduleInfo(file);
    tests.push({
      source: local(file),
      imports: [...info.imports.values()]
        .map(({ specifier }) => resolveImport(file, specifier))
        .filter(Boolean),
    });
  }
}
const routes = inventory.routes.map((route) => {
  const graph = trace(join(root, route.source));
  const files = new Set(
    graph.symbols.map((symbol) => join(root, symbol.source)),
  );
  const layouts = [];
  const appDirectory = join(root, "apps", route.surface, "app");
  let directory = dirname(join(root, route.source));
  while (directory.startsWith(appDirectory)) {
    const layout = join(directory, "layout.tsx");
    if (existsSync(layout)) {
      moduleInfo(layout);
      layouts.unshift(local(layout));
    }
    if (directory === appDirectory) break;
    directory = dirname(directory);
  }
  return {
    surface: route.surface,
    route: route.route,
    entry: route.source,
    qaOnly: route.qaOnly,
    parentLayouts: layouts,
    ...graph,
    directlyAssociatedTests: tests
      .filter((test) => test.imports.some((file) => files.has(file)))
      .map((test) => test.source),
    runtime:
      "unproven by this source graph; inspect dated browser reports separately",
  };
});
const output = {
  scope:
    "Potential exported-symbol dependencies, API hook call expressions and conditional UI branches for every page entry. Parent layouts/providers and dynamic section props require separate review. A source association is neither an executed test nor runtime coverage.",
  limitations: [
    "Identifier tracing is conservative, not a TypeScript type checker: shadowed local names may add edges.",
    "Dynamic props can select only a subset of a shared workspace's reported dependencies.",
    "API call expressions may delegate path construction; endpoint and response validation still require API contracts and runtime receipts.",
    "State branches are selected conditionals and logical expressions; they omit behavior inside API hooks. They are inspection anchors, not an exhaustive state list.",
    "Direct test imports establish association only; test assertions and freshness must be inspected separately.",
    "Parent layouts are listed separately; provider and layout dependency trees are not included in page-specific API counts.",
  ],
  routes,
  sourceSha256: Object.fromEntries(
    [...cache]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, info]) => [local(file), info.sha256]),
  ),
};
writeFileSync(
  join(root, "docs/qa/ph0-route-contracts-2026-10-18.json"),
  JSON.stringify(output, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    routes: routes.length,
    withApiCalls: routes.filter((route) => route.apiCalls.length).length,
    unresolved: routes.filter((route) => route.unresolved.length).length,
    parsedFiles: cache.size,
  }),
);
