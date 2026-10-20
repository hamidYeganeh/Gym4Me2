/** Source associations only. No static result grants PH0 runtime acceptance. */
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "../apps/application/node_modules/typescript/lib/typescript.js";

const root = fileURLToPath(new URL("..", import.meta.url));
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

/** Resolve candidate HTTP requests without executing hooks or importing application code. */
export function traceApiRequests(file, symbol, argumentsText = []) {
  file = resolve(root, file);
  const requests = [],
    unresolved = [],
    active = new Set();
  const argsFile = ts.createSourceFile(
    "arguments.ts",
    `call(${argumentsText.join(",")})`,
    ts.ScriptTarget.Latest,
    true,
  );
  const args = argsFile.statements[0]?.expression?.arguments ?? [];
  const unwrap = (node) => {
    while (
      node &&
      (ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isNonNullExpression(node) ||
        ts.isSatisfiesExpression(node))
    )
      node = node.expression;
    return node;
  };
  function bound(node, env, seen = new Set()) {
    node = unwrap(node);
    if (
      node &&
      ts.isIdentifier(node) &&
      env.has(node.text) &&
      !seen.has(node.text)
    ) {
      seen.add(node.text);
      return bound(env.get(node.text), env, seen);
    }
    return node;
  }
  const textOf = (node) => node?.getText(node.getSourceFile()) ?? "unknown";
  function definition(source, name) {
    const info = moduleInfo(source),
      own = info.nodes.get(name);
    if (own) return { file: source, name, node: own };
    const imported = info.imports.get(name),
      next = imported && resolveImport(source, imported.specifier);
    const target =
      (next && findExport(next, imported.imported)) || findExport(source, name);
    return target?.file
      ? { ...target, node: moduleInfo(target.file).nodes.get(target.name) }
      : null;
  }
  function receivers(source, node, env, conditions = [], depth = 0) {
    if (depth > 12) return [];
    node = bound(node, env);
    if (!node) return [];
    if (ts.isConditionalExpression(node))
      return [
        ...receivers(
          source,
          node.whenTrue,
          env,
          [...conditions, textOf(node.condition)],
          depth + 1,
        ),
        ...receivers(
          source,
          node.whenFalse,
          env,
          [...conditions, `!(${textOf(node.condition)})`],
          depth + 1,
        ),
      ];
    if (ts.isIdentifier(node)) {
      const d = definition(source, node.text);
      if (d?.node && ts.isVariableDeclaration(d.node))
        return receivers(
          d.file,
          d.node.initializer,
          env,
          conditions,
          depth + 1,
        );
    }
    return ts.isObjectLiteralExpression(node)
      ? [{ file: source, node, conditions }]
      : [];
  }
  function targets(source, expression, env) {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression)) {
      const d = definition(source, expression.text);
      return d?.node ? [{ ...d, conditions: [] }] : [];
    }
    if (!ts.isPropertyAccessExpression(expression)) return [];
    return receivers(source, expression.expression, env).flatMap((receiver) => {
      const member = receiver.node.properties.find(
        (property) =>
          property.name &&
          (ts.isIdentifier(property.name) ||
            ts.isStringLiteral(property.name)) &&
          property.name.text === expression.name.text,
      );
      return member && ts.isPropertyAssignment(member)
        ? [
            {
              file: receiver.file,
              name: textOf(expression),
              node: member.initializer,
              conditions: receiver.conditions,
            },
          ]
        : [];
    });
  }
  function environment(target, callArgs, callerEnv) {
    const node = ts.isVariableDeclaration(target.node)
      ? target.node.initializer
      : target.node;
    const env = new Map();
    node?.parameters?.forEach((parameter, index) => {
      if (ts.isIdentifier(parameter.name))
        env.set(
          parameter.name.text,
          bound(callArgs[index], callerEnv) ?? parameter.initializer,
        );
    });
    return { node: unwrap(node), env };
  }
  function values(node, env, conditions = []) {
    node = bound(node, env);
    if (node && ts.isConditionalExpression(node))
      return [
        ...values(node.whenTrue, env, [...conditions, textOf(node.condition)]),
        ...values(node.whenFalse, env, [
          ...conditions,
          `!(${textOf(node.condition)})`,
        ]),
      ];
    if (node && ts.isStringLiteralLike(node))
      return [{ value: node.text, expression: textOf(node), conditions }];
    return [{ value: null, expression: textOf(node), conditions }];
  }
  function request(source, expression, env, conditions, via, depth) {
    if (depth > 20) {
      unresolved.push({
        source: local(source),
        reason: "request recursion limit",
      });
      return;
    }
    expression = bound(expression, env);
    if (!expression) return;
    if (ts.isConditionalExpression(expression)) {
      request(
        source,
        expression.whenTrue,
        env,
        [...conditions, textOf(expression.condition)],
        via,
        depth + 1,
      );
      request(
        source,
        expression.whenFalse,
        env,
        [...conditions, `!(${textOf(expression.condition)})`],
        via,
        depth + 1,
      );
      return;
    }
    if (ts.isObjectLiteralExpression(expression)) {
      const field = (name) => {
        const property = expression.properties.find(
          (p) =>
            p.name &&
            (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
            p.name.text === name,
        );
        return (
          property &&
          (ts.isPropertyAssignment(property)
            ? property.initializer
            : ts.isShorthandPropertyAssignment(property)
              ? property.name
              : undefined)
        );
      };
      for (const method of values(field("method"), env))
        for (const path of values(field("path"), env))
          requests.push({
            ...(expression.getSourceFile() === moduleInfo(source).sf
              ? position(moduleInfo(source).sf, expression)
              : { source: null, line: null, sourceKind: "caller expression" }),
            method: method.value,
            path: path.value,
            pathExpression: path.expression,
            conditions: [
              ...conditions,
              ...method.conditions,
              ...path.conditions,
            ],
            via,
          });
      return;
    }
    if (ts.isCallExpression(expression)) {
      const found = targets(source, expression.expression, env);
      for (const target of found) {
        const next = environment(target, expression.arguments, env);
        const inspect = (node) => {
          if (ts.isReturnStatement(node) && node.expression)
            request(
              target.file,
              node.expression,
              next.env,
              [...conditions, ...target.conditions],
              [...via, target.name],
              depth + 1,
            );
          else ts.forEachChild(node, inspect);
        };
        if (next.node?.body && !ts.isBlock(next.node.body))
          request(
            target.file,
            next.node.body,
            next.env,
            [...conditions, ...target.conditions],
            [...via, target.name],
            depth + 1,
          );
        else if (next.node?.body) inspect(next.node.body);
      }
      if (found.length) return;
    }
    unresolved.push({
      source: local(source),
      expression: textOf(expression),
      reason: "request expression requires manual resolution",
    });
  }
  function invoke(target, callArgs, callerEnv, conditions, via, depth) {
    if (depth > 20 || !local(target.file).startsWith("packages/api/src/"))
      return;
    const key = `${target.file}#${target.name}`;
    if (active.has(key)) return;
    active.add(key);
    const context = environment(target, callArgs, callerEnv);
    function maskBinding(name, env) {
      if (ts.isIdentifier(name)) env.set(name.text, name);
      else if (
        ts.isObjectBindingPattern(name) ||
        ts.isArrayBindingPattern(name)
      )
        for (const element of name.elements)
          if (ts.isBindingElement(element)) maskBinding(element.name, env);
    }
    function walk(node, env, branch) {
      // Callback arguments belong to the callback, not the enclosing hook call.
      if (
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node) ||
        ts.isFunctionDeclaration(node)
      ) {
        const nested = new Map(env);
        for (const parameter of node.parameters)
          maskBinding(parameter.name, nested);
        if (node.body) walk(node.body, nested, branch);
        return;
      }
      if (ts.isBlock(node)) {
        const scoped = new Map(env);
        for (const statement of node.statements)
          if (ts.isVariableStatement(statement))
            for (const declaration of statement.declarationList.declarations)
              maskBinding(declaration.name, scoped);
        for (const statement of node.statements)
          walk(statement, scoped, branch);
        return;
      }
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer
      )
        env.set(node.name.text, node.initializer);
      if (ts.isConditionalExpression(node)) {
        walk(node.condition, env, branch);
        walk(node.whenTrue, new Map(env), [...branch, textOf(node.condition)]);
        walk(node.whenFalse, new Map(env), [
          ...branch,
          `!(${textOf(node.condition)})`,
        ]);
        return;
      }
      if (ts.isCallExpression(node)) {
        if (
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "request"
        ) {
          request(target.file, node.arguments[0], env, branch, via, depth + 1);
          return;
        }
        if (!(
          ts.isIdentifier(node.expression) &&
          ["useApiQuery", "useApiMutation", "useApiContext"].includes(
            node.expression.text,
          )
        )) {
          const found = targets(target.file, node.expression, env);
          for (const next of found)
            invoke(
              next,
              node.arguments,
              env,
              [...branch, ...next.conditions],
              [...via, next.name],
              depth + 1,
            );
          if (!found.length && ts.isElementAccessExpression(node.expression))
            unresolved.push({
              ...position(moduleInfo(target.file).sf, node),
              expression: textOf(node.expression),
              reason: "computed call target is unresolved",
            });
        }
      }
      ts.forEachChild(node, (child) => walk(child, env, branch));
    }
    if (context.node?.body) walk(context.node.body, context.env, conditions);
    active.delete(key);
  }
  const selected = ts.createSourceFile(
    "target.ts",
    symbol,
    ts.ScriptTarget.Latest,
    true,
  ).statements[0]?.expression;
  const first = selected ? targets(file, selected, new Map()) : [];
  if (first.length)
    for (const target of first)
      invoke(target, args, new Map(), target.conditions, [symbol], 0);
  else
    unresolved.push({
      source: local(file),
      symbol,
      reason: "hook definition missing",
    });
  const unique = (items) => [
    ...new Map(items.map((item) => [JSON.stringify(item), item])).values(),
  ];
  return { requests: unique(requests), unresolved: unique(unresolved) };
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
      if (
        ts.isCallExpression(child) &&
        (ts.isIdentifier(child.expression) ||
          (ts.isPropertyAccessExpression(child.expression) &&
            ts.isIdentifier(child.expression.expression)))
      ) {
        const receiver = ts.isIdentifier(child.expression)
          ? child.expression
          : child.expression.expression;
        const imported = info.imports.get(receiver.text);
        if (imported?.specifier.startsWith("@repo/api")) {
          const selected =
            imported.imported +
            (ts.isPropertyAccessExpression(child.expression)
              ? `.${child.expression.name.text}`
              : "");
          const apiFile = resolveImport(file, imported.specifier);
          const target = apiFile && findExport(apiFile, imported.imported);
          const definition =
            target?.file && moduleInfo(target.file).nodes.get(target.name);
          apiCalls.push({
            ...position(info.sf, child),
            hook: selected,
            module: imported.specifier,
            expression: compact(child, info.sf),
            requestDefinitions: target?.file
              ? traceApiRequests(
                  target.file,
                  target.name +
                    (ts.isPropertyAccessExpression(child.expression)
                      ? `.${child.expression.name.text}`
                      : ""),
                  child.arguments.map((argument) => argument.getText(info.sf)),
                )
              : {
                  requests: [],
                  unresolved: [{ reason: "API definition unavailable" }],
                },
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

/** Bind dated, manually attributed browser receipts; never infer runtime coverage from source. */
export function bindRuntimeEvidence(routes, evidence, directory = root) {
  const read = (path) => readFileSync(resolve(directory, path));
  const hash = (path) => createHash("sha256").update(read(path)).digest("hex");
  const json = (path) => JSON.parse(read(path).toString());
  const requireEvidence = (condition, message) => {
    if (!condition) throw new Error(`Runtime evidence: ${message}`);
  };
  for (const session of evidence.sessions) {
    const route = routes.find(
      (route) =>
        route.surface === session.surface && route.route === session.route,
    );
    requireEvidence(route, `unknown route ${session.surface}:${session.route}`);
    for (const path of [
      session.http,
      session.buildInputs,
      session.report,
      ...session.states.map((state) => state.receipt),
    ])
      requireEvidence(
        session.artifactSha256[path],
        `receipt hash missing: ${path}`,
      );
    requireEvidence(
      Object.keys(session.referencedSourceSha256).length > 0,
      "source scope is empty",
    );
    for (const [path, expected] of Object.entries(session.artifactSha256))
      requireEvidence(hash(path) === expected, `receipt changed: ${path}`);
    for (const [path, expected] of Object.entries(
      session.referencedSourceSha256,
    ))
      requireEvidence(
        hash(path) === expected,
        `referenced source changed: ${path}`,
      );
    const http = json(session.http);
    const states = session.states.map((state) => {
      const calls = route.apiCalls.filter(
        (call) => call.source === state.callSource && call.hook === state.hook,
      );
      const candidate = calls
        .flatMap((call) => call.requestDefinitions.requests)
        .find(
          (request) =>
            request.method === state.method && request.path === state.path,
        );
      requireEvidence(candidate, `source candidate missing: ${state.id}`);
      requireEvidence(
        session.referencedSourceSha256[state.callSource] &&
          session.referencedSourceSha256[candidate.source],
        `candidate source hash missing: ${state.id}`,
      );
      requireEvidence(
        http.requests.some(
          (request) =>
            request.method === state.method &&
            request.path === `/api/v1/${state.path}` &&
            request.status === state.status,
        ),
        `HTTP observation missing: ${state.id}`,
      );
      const proof = json(state.receipt);
      requireEvidence(
        Object.keys(state.equals).length > 0,
        `UI assertions missing: ${state.id}`,
      );
      requireEvidence(
        Object.entries(state.equals).every(
          ([key, value]) =>
            JSON.stringify(proof[key]) === JSON.stringify(value),
        ),
        `UI assertion failed: ${state.id}`,
      );
      return {
        ...state,
        candidateSource: candidate.source,
        candidateLine: candidate.line,
      };
    });
    const buildInputs = json(session.buildInputs);
    const changedBuildInputs = Object.entries(buildInputs)
      .filter(
        ([path, expected]) =>
          !existsSync(resolve(directory, path)) || hash(path) !== expected,
      )
      .map(([path]) => path);
    route.runtimeEvidence ??= [];
    route.runtimeEvidence.push({
      id: session.id,
      buildId: session.buildId,
      report: session.report,
      scope:
        "Dated browser session, manually attributed by its report. Matching HTTP and UI receipts do not establish event ordering or exhaustive coverage.",
      sourceScope: Object.keys(session.referencedSourceSha256),
      referencedSourcesMatch: true,
      buildInputsMatchCurrent: changedBuildInputs.length === 0,
      changedBuildInputs,
      httpCaptureTruncated: http.truncated,
      states,
    });
  }
}

export function generateRouteContracts({
  inventoryFile,
  outputFile,
  evidenceFile,
} = {}) {
  if (!inventoryFile || !outputFile)
    throw new Error(
      "Explicit inventory and output paths are required; historical evidence must not be overwritten by default.",
    );
  cache.clear();
  const inventory = JSON.parse(
    readFileSync(resolve(root, inventoryFile), "utf8"),
  );
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
      "requestDefinitions follow selected client/endpoint members. They are conditional source candidates, not executed requests; symbolic paths, unresolved expressions and runtime receipts require separate review.",
      "State branches are selected conditionals and logical expressions; they omit behavior inside API hooks. They are inspection anchors, not an exhaustive state list.",
      "Direct test imports establish association only; test assertions and freshness must be inspected separately.",
      "Parent layouts are listed separately; provider and layout dependency trees are not included in page-specific API counts.",
      "Imported API client member calls (including SSR) are candidates. Namespace/computed calls, dynamic imports and all possible request flows are not exhaustively resolved.",
      "runtimeEvidence, when present, binds only dated receipts and explicitly lists changed build inputs. It does not accept the page or PH0 as a whole.",
    ],
    routes,
    sourceSha256: Object.fromEntries(
      [...cache]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file, info]) => [local(file), info.sha256]),
    ),
  };
  if (evidenceFile)
    bindRuntimeEvidence(
      routes,
      JSON.parse(readFileSync(resolve(root, evidenceFile), "utf8")),
    );
  writeFileSync(
    resolve(root, outputFile),
    JSON.stringify(output, null, 2) + "\n",
  );
  return {
    routes: routes.length,
    withApiCalls: routes.filter((route) => route.apiCalls.length).length,
    unresolved: routes.filter((route) => route.unresolved.length).length,
    parsedFiles: cache.size,
    mappedApiCalls: routes
      .flatMap((route) => route.apiCalls)
      .filter((call) => call.requestDefinitions.requests.length).length,
    distinctRequestDefinitions: new Set(
      routes.flatMap((route) =>
        route.apiCalls.flatMap((call) =>
          call.requestDefinitions.requests.map(
            (request) =>
              `${request.method} ${request.path ?? request.pathExpression} ${request.source}:${request.line}`,
          ),
        ),
      ),
    ).size,
    unresolvedRequests: routes.flatMap((route) =>
      route.apiCalls.flatMap((call) => call.requestDefinitions.unresolved),
    ).length,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    JSON.stringify(
      generateRouteContracts({
        inventoryFile: process.argv[2],
        outputFile: process.argv[3],
        evidenceFile: process.argv[4],
      }),
    ),
  );
}
