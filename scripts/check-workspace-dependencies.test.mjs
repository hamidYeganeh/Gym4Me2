import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { scanWorkspaceDependencies } from "./check-workspace-dependencies.mjs";

test("a clean workspace reports a hoisted-only runtime, re-export and type dependency", () => {
  const root = mkdtempSync(join(tmpdir(), "gym4me-dependencies-"));
  try {
    const workspace = join(root, "apps", "application");
    mkdirSync(workspace, { recursive: true });
    writeFileSync(
      join(workspace, "package.json"),
      JSON.stringify({
        name: "app",
        dependencies: { react: "1", "@scope/direct": "1" },
        devDependencies: { typescript: "1", "@types/express": "1" },
        peerDependencies: { peer: "1" },
      }),
    );
    writeFileSync(
      join(workspace, "source.tsx"),
      `
import { Camera } from 'lucide-react';
export { item } from '@missing/reexport/subpath';
type Data = import('missing-types').Data;
import type { Component } from 'react';
import type { Request } from 'express';
import { type Response } from 'express';
import { readFile } from 'node:fs/promises';
import direct from '@scope/direct/subpath';
import local from '@/components/local';
import sibling from './local';
import self from 'app/subpath';
const peer = import('peer');
const ts = require('typescript');
// import fake from 'a-comment-is-not-an-import';
const example = "import fake from 'a-string-is-not-an-import'";
`,
    );
    // Generated/native/vendor code must not invent workspace requirements.
    for (const dir of ["node_modules", ".next-qa", "android", "public"]) {
      mkdirSync(join(workspace, dir));
      writeFileSync(
        join(workspace, dir, "vendor.js"),
        "require('unrelated-vendor')",
      );
    }
    const result = scanWorkspaceDependencies(root);
    assert.deepEqual(
      result.missing.map((x) => x.dependency),
      ["lucide-react", "@missing/reexport", "missing-types"],
    );
    assert.equal(result.files, 1);
    const manifest = JSON.parse(
      readFileSync(join(workspace, "package.json"), "utf8"),
    );
    for (const item of result.missing)
      manifest.dependencies[item.dependency] = "1";
    writeFileSync(join(workspace, "package.json"), JSON.stringify(manifest));
    assert.deepEqual(scanWorkspaceDependencies(root).missing, []);
    writeFileSync(
      join(workspace, "runtime.ts"),
      "import express from 'express';",
    );
    assert.deepEqual(
      scanWorkspaceDependencies(root).missing.map((item) => item.dependency),
      ["express"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
