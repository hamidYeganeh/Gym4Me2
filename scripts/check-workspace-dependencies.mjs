import { isBuiltin, createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Use the same declared TypeScript parser as application builds, without loading apps.
const require = createRequire(
  new URL("../apps/application/package.json", import.meta.url),
);
const ts = require("typescript");
const generated = new Set([
  "node_modules",
  "dist",
  "out",
  "build",
  "coverage",
  "android",
  "ios",
  "public",
]);

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      !generated.has(entry.name)
    )
      yield* sourceFiles(path);
    else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) yield path;
  }
}

function importedPackages(file, source) {
  const parsed = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const imports = [];
  const record = (node, typeOnly = false) => {
    if (node && ts.isStringLiteralLike(node))
      imports.push({
        specifier: node.text,
        typeOnly,
        line:
          parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1,
      });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      record(
        node.moduleSpecifier,
        Boolean(
          clause?.isTypeOnly ||
          (!clause?.name &&
            bindings &&
            ts.isNamedImports(bindings) &&
            bindings.elements.length &&
            bindings.elements.every((item) => item.isTypeOnly)),
        ),
      );
    } else if (ts.isExportDeclaration(node))
      record(
        node.moduleSpecifier,
        node.isTypeOnly ||
          Boolean(
            node.exportClause &&
            ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.length &&
            node.exportClause.elements.every((item) => item.isTypeOnly),
          ),
      );
    else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    )
      record(node.moduleReference.expression, node.isTypeOnly);
    else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
      record(node.argument.literal, true);
    else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    )
      record(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return imports;
}

/** Detect undeclared direct imports that a developer's hoisted modules can conceal. */
export function scanWorkspaceDependencies(root) {
  const result = { workspaces: 0, files: 0, missing: [] };
  for (const group of ["apps", "packages"]) {
    const parent = join(root, group);
    if (!existsSync(parent)) continue;
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const workspace = join(parent, entry.name),
        manifest = join(workspace, "package.json");
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, "utf8"));
      const declared = new Set([
        pkg.name,
        ...[
          "dependencies",
          "devDependencies",
          "peerDependencies",
          "optionalDependencies",
        ].flatMap((key) => Object.keys(pkg[key] ?? {})),
      ]);
      result.workspaces++;
      for (const file of sourceFiles(workspace)) {
        result.files++;
        for (const item of importedPackages(file, readFileSync(file, "utf8"))) {
          const name = item.specifier;
          // @/ is the existing Next tsconfig alias, never an npm package.
          if (
            name.startsWith(".") ||
            name.startsWith("/") ||
            name.startsWith("@/") ||
            name.startsWith("#") ||
            isBuiltin(name)
          )
            continue;
          const dependency = name.startsWith("@")
            ? name.split("/").slice(0, 2).join("/")
            : name.split("/")[0];
          const types = `@types/${dependency.startsWith("@") ? dependency.slice(1).replace("/", "__") : dependency}`;
          if (
            !declared.has(dependency) &&
            !(item.typeOnly && declared.has(types))
          )
            result.missing.push({
              workspace: relative(root, workspace),
              source: relative(root, file),
              ...item,
              dependency,
            });
        }
      }
    }
  }
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = scanWorkspaceDependencies(
    fileURLToPath(new URL("..", import.meta.url)),
  );
  for (const item of result.missing)
    console.error(
      `${item.source}:${item.line}: declare ${item.dependency} in ${item.workspace}/package.json (imports ${item.specifier})`,
    );
  if (result.missing.length) process.exitCode = 1;
  else
    console.log(
      `${result.workspaces} workspace manifests cover direct imports in ${result.files} source files.`,
    );
}
