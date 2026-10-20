import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import {
  bindRuntimeEvidence,
  generateRouteContracts,
  traceApiRequests,
} from "./ph0-route-contracts.mjs";

test("a re-exported privacy hook resolves only its selected client and endpoint member", () => {
  const result = traceApiRequests(
    "packages/api/src/profile/index.ts",
    "usePrivacy",
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(
    result.requests.map(({ method, path }) => [method, path]),
    [["GET", "profile/account/privacy"]],
  );
  assert.equal(
    result.requests[0].source,
    "packages/api/src/profile/profile.endpoints.ts",
  );
  assert.ok(result.requests[0].via.includes("profileClients.privacy"));
});

test("conditional saved/guest catalog requests preserve candidates and inline contracts without sibling endpoints", () => {
  const result = traceApiRequests(
    "packages/api/src/catalog/catalog.hooks.ts",
    "useClubs",
    ["{}", "true", "guestIds"],
  );
  assert.deepEqual(result.unresolved, []);
  assert.deepEqual(
    result.requests.map(({ method, path }) => [method, path]).sort(),
    [
      ["GET", "catalog/clubs"],
      ["GET", "catalog/clubs/saved"],
      ["POST", "catalog/clubs/guest-saved"],
    ],
  );
  assert.ok(result.requests.every((request) => request.conditions.length));
});

test("generic sports wrappers bind the page argument without executing their transport", () => {
  for (const [hook, path, method] of [
    ["useSportsQuery", "sports/services", "GET"],
    ["useSportsCommand", "sports/account/example", "POST"],
  ]) {
    const result = traceApiRequests("packages/api/src/sports/index.ts", hook, [
      JSON.stringify(path),
    ]);
    assert.deepEqual(result.unresolved, []);
    assert.deepEqual(
      result.requests.map(({ method, path }) => [method, path]),
      [[method, path]],
    );
  }
});

test("a resource path remains symbolic and a missing hook stays unresolved", () => {
  const result = traceApiRequests(
    "packages/api/src/catalog/catalog.hooks.ts",
    "useClub",
    ["clubId"],
  );
  assert.equal(result.requests.length, 1);
  assert.equal(result.requests[0].method, "GET");
  assert.equal(result.requests[0].path, null);
  assert.match(result.requests[0].pathExpression, /resourceId/);
  assert.ok(
    traceApiRequests("packages/api/src/catalog/catalog.hooks.ts", "missingHook")
      .unresolved.length,
  );
});

test("callback parameters and sibling locals cannot borrow a hook argument", () => {
  const directory = mkdtempSync(
    fileURLToPath(new URL("../packages/api/src/.ph0-trace-", import.meta.url)),
  );
  const file = join(directory, "fixture.ts");
  try {
    writeFileSync(
      file,
      `
export function useShadow(path) {
  return useApiMutation((api, path) => api.request({method:'POST', path}), []);
}
export function useSiblings(path) {
  first((api) => { const path = 'first-only'; return api.request({method:'GET', path}); });
  return second((api) => api.request({method:'GET', path}));
}
`,
    );
    const shadow = traceApiRequests(file, "useShadow", ['"outer/path"']);
    assert.equal(shadow.requests.length, 1);
    assert.equal(shadow.requests[0].path, null);
    assert.equal(shadow.requests[0].pathExpression, "path");
    assert.deepEqual(
      traceApiRequests(file, "useSiblings", ['"outer/path"']).requests.map(
        (r) => r.path,
      ),
      ["first-only", "outer/path"],
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the page graph includes the actual selected SSR catalog client call", () => {
  const directory = mkdtempSync(join(tmpdir(), "ph0-contracts-"));
  try {
    const inventoryFile = join(directory, "inventory.json");
    const outputFile = join(directory, "contracts.json");
    writeFileSync(
      inventoryFile,
      JSON.stringify({
        routes: [
          {
            surface: "application",
            route: "/discovery/clubs/[clubId]",
            source: "apps/application/app/discovery/clubs/[clubId]/page.tsx",
            qaOnly: false,
          },
        ],
      }),
    );
    generateRouteContracts({ inventoryFile, outputFile });
    const graph = JSON.parse(readFileSync(outputFile, "utf8"));
    assert.ok(
      Object.keys(graph.sourceSha256).every(
        (path) => !path.includes(".ph0-trace-"),
      ),
      "deleted fixtures must not contaminate the generated source snapshot",
    );
    const call = graph.routes[0].apiCalls.find(
      (call) =>
        call.source === "apps/application/lib/public-catalog.ts" &&
        call.hook === "catalogClients.club",
    );
    assert.ok(
      call,
      "SSR client member call must appear alongside the client hooks",
    );
    assert.equal(call.requestDefinitions.requests.length, 1);
    assert.equal(call.requestDefinitions.requests[0].method, "GET");
    assert.equal(call.requestDefinitions.requests[0].path, null);
    assert.match(
      call.requestDefinitions.requests[0].pathExpression,
      /catalog\/clubs/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generation requires explicit paths to preserve historical baselines", () => {
  assert.throws(
    () => generateRouteContracts(),
    /Explicit inventory and output paths/,
  );
});

test("regeneration reads source edits instead of retaining a previous AST or hash", () => {
  const directory = mkdtempSync(
    fileURLToPath(
      new URL("../apps/application/app/.ph0-graph-", import.meta.url),
    ),
  );
  const source = `apps/application/app/${basename(directory)}/page.tsx`;
  try {
    const inventoryFile = join(directory, "inventory.json");
    const outputFile = join(directory, "contracts.json");
    writeFileSync(
      inventoryFile,
      JSON.stringify({
        routes: [{ surface: "application", route: "/temporary", source }],
      }),
    );
    writeFileSync(
      join(directory, "page.tsx"),
      "export default function Before(){return null}",
    );
    generateRouteContracts({ inventoryFile, outputFile });
    const first = JSON.parse(readFileSync(outputFile, "utf8"));
    writeFileSync(
      join(directory, "page.tsx"),
      "export default function After(){return null}",
    );
    generateRouteContracts({ inventoryFile, outputFile });
    const next = JSON.parse(readFileSync(outputFile, "utf8"));
    assert.notEqual(first.sourceSha256[source], next.sourceSha256[source]);
    assert.equal(next.routes[0].symbols[0].symbol, "After");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("dated evidence binds matching HTTP/UI/source while exposing a changed build input", () => {
  const directory = mkdtempSync(join(tmpdir(), "ph0-evidence-"));
  try {
    const files = {
      "http.json": JSON.stringify({
        truncated: true,
        requests: [{ method: "POST", path: "/api/v1/privacy", status: 201 }],
      }),
      "ui.json": JSON.stringify({ focus: "save", checked: false }),
      "source.ts": "original source",
      "endpoint.ts": "original endpoint",
      "report.md": "Manually attributed dated observation",
      "package.json": "changed dependency",
    };
    const hash = (text) => createHash("sha256").update(text).digest("hex");
    files["inputs.json"] = JSON.stringify({
      "source.ts": hash(files["source.ts"]),
      "package.json": hash("old dependency"),
    });
    for (const [file, text] of Object.entries(files))
      writeFileSync(join(directory, file), text);
    const routes = () => [
      {
        surface: "application",
        route: "/privacy",
        apiCalls: [
          {
            source: "source.ts",
            hook: "usePrivacy",
            requestDefinitions: {
              requests: [
                {
                  method: "POST",
                  path: "privacy",
                  source: "endpoint.ts",
                  line: 1,
                },
              ],
            },
          },
        ],
      },
    ];
    const evidence = {
      sessions: [
        {
          id: "dated",
          surface: "application",
          route: "/privacy",
          buildId: "previous-build",
          report: "report.md",
          http: "http.json",
          buildInputs: "inputs.json",
          artifactSha256: Object.fromEntries(
            ["http.json", "ui.json", "inputs.json", "report.md"].map((p) => [
              p,
              hash(files[p]),
            ]),
          ),
          referencedSourceSha256: Object.fromEntries(
            ["source.ts", "endpoint.ts"].map((p) => [p, hash(files[p])]),
          ),
          states: [
            {
              id: "saved",
              callSource: "source.ts",
              hook: "usePrivacy",
              method: "POST",
              path: "privacy",
              status: 201,
              receipt: "ui.json",
              equals: { focus: "save", checked: false },
            },
          ],
        },
      ],
    };
    const graph = routes();
    bindRuntimeEvidence(graph, evidence, directory);
    assert.deepEqual(graph[0].runtimeEvidence[0].changedBuildInputs, [
      "package.json",
    ]);
    assert.equal(graph[0].runtimeEvidence[0].buildInputsMatchCurrent, false);
    assert.equal(graph[0].runtimeEvidence[0].httpCaptureTruncated, true);
    assert.equal(
      graph[0].runtimeEvidence[0].states[0].candidateSource,
      "endpoint.ts",
    );
    const missing = structuredClone(evidence);
    missing.sessions[0].states[0].status = 409;
    assert.throws(
      () => bindRuntimeEvidence(routes(), missing, directory),
      /HTTP observation missing/,
    );
    const wrongState = structuredClone(evidence);
    wrongState.sessions[0].states[0].equals.checked = true;
    assert.throws(
      () => bindRuntimeEvidence(routes(), wrongState, directory),
      /UI assertion failed/,
    );
    writeFileSync(join(directory, "ui.json"), "{}");
    assert.throws(
      () => bindRuntimeEvidence(routes(), evidence, directory),
      /receipt changed/,
    );
    writeFileSync(join(directory, "ui.json"), files["ui.json"]);
    writeFileSync(join(directory, "source.ts"), "new source");
    assert.throws(
      () => bindRuntimeEvidence(routes(), evidence, directory),
      /referenced source changed/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
