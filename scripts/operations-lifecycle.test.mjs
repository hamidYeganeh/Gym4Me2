import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createRequire } from "node:module";
import { spawnManaged } from "./managed-child.mjs";
import { runRestic } from "./staging-backup.mjs";
import { waitForReady } from "./staging-service.mjs";
import { createOperationsScheduler } from "./operations-worker.mjs";
import { capture } from "./backup-capture.mjs";

test(
  "cancellation waits for nested child cleanup before its owner exits",
  { timeout: 5000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "gym4me-child-cleanup-"));
    const script = join(directory, "owner.mjs");
    const helper = new URL("managed-child.mjs", import.meta.url).href;
    const childSource = `import {writeFile,rm} from 'node:fs/promises';
    process.on('SIGTERM', async()=>{await new Promise(r=>setTimeout(r,30));await rm(process.argv[1],{recursive:true,force:true});process.exit(0)});
    await writeFile(process.argv[1]+'/ready','ready');setInterval(()=>{},1000);`;
    let task;
    try {
      const capture = join(directory, "capture");
      const { mkdir } = await import("node:fs/promises");
      await mkdir(capture);
      await writeFile(
        script,
        `import {spawnManaged} from ${JSON.stringify(helper)};
      import {writeFile} from 'node:fs/promises';
      const controller=new AbortController();process.on('SIGTERM',()=>controller.abort());
      const task=spawnManaged(process.execPath,['--input-type=module','-e',${JSON.stringify(childSource)},${JSON.stringify(capture)}],{stdio:'ignore'},{signal:controller.signal,graceMs:300});
      await task.completed.catch(()=>{});await writeFile(${JSON.stringify(join(directory, "owner-cleaned"))},'yes');`,
      );
      task = spawnManaged(
        process.execPath,
        [script],
        { stdio: "ignore" },
        { graceMs: 1000 },
      );
      await waitForReady(async () => existsSync(join(capture, "ready")), {
        timeoutMs: 2000,
        intervalMs: 10,
      });
      await assert.rejects(task.stop(), /cancelled/);
      assert.equal(existsSync(capture), false);
      assert.equal(
        await readFile(join(directory, "owner-cleaned"), "utf8"),
        "yes",
      );
    } finally {
      if (task) await task.stop().catch(() => {});
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  "a child ignoring termination is killed after the bounded grace period",
  { timeout: 4000 },
  async () => {
    const controller = new AbortController();
    const task = spawnManaged(
      process.execPath,
      [
        "-e",
        "process.on('SIGTERM',()=>{});console.log('ready');setInterval(()=>{},1000)",
      ],
      { stdio: ["ignore", "pipe", "ignore"] },
      { signal: controller.signal, graceMs: 60 },
    );
    try {
      await once(task.child.stdout, "data");
      controller.abort();
      await assert.rejects(task.completed);
      assert.equal(task.child.signalCode, "SIGKILL");
      assert.throws(() => process.kill(task.child.pid, 0), { code: "ESRCH" });
    } finally {
      await task.stop().catch(() => {});
    }
  },
);

test(
  "cancellation kills a surviving same-group grandchild after its leader closes",
  { timeout: 5000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "gym4me-orphan-cancel-"));
    const marker = join(directory, "grandchild.pid");
    const source = `process.on('SIGTERM',()=>{});require('node:fs').writeFileSync(process.argv[1],String(process.pid));setInterval(()=>{},1000)`;
    const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(source)},process.argv[1]],{stdio:'ignore'});setInterval(()=>{},1000)`;
    const task = spawnManaged(
      process.execPath,
      ["-e", parent, marker],
      { stdio: "ignore" },
      { graceMs: 80 },
    );
    let pid;
    try {
      await waitForReady(async () => existsSync(marker), {
        timeoutMs: 2000,
        intervalMs: 10,
      });
      pid = Number(await readFile(marker, "utf8"));
      await assert.rejects(task.stop(), /cancelled/);
      assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    } finally {
      await task.stop().catch(() => {});
      if (pid) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test(
  "a successful normal exit does not terminate a deliberately detached child",
  { timeout: 5000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "gym4me-child-normal-"));
    const marker = join(directory, "grandchild.pid");
    const source =
      "require('node:fs').writeFileSync(process.argv[1],String(process.pid));setInterval(()=>{},1000)";
    const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(source)},process.argv[1]],{stdio:'ignore'}).unref();const timer=setInterval(()=>{if(require('node:fs').existsSync(process.argv[1])){clearInterval(timer);process.exit(0)}},5)`;
    const task = spawnManaged(
      process.execPath,
      ["-e", parent, marker],
      { stdio: "ignore" },
      { graceMs: 50 },
    );
    let pid;
    try {
      assert.equal((await task.completed).code, 0);
      pid = Number(await readFile(marker, "utf8"));
      assert.equal(process.kill(pid, 0), true);
      await task.stop();
      assert.equal(process.kill(pid, 0), true);
    } finally {
      if (pid) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {}
      }
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("an already cancelled operation cannot spawn another process", () => {
  assert.throws(
    () =>
      spawnManaged(
        process.execPath,
        ["-e", "process.exit(0)"],
        {},
        { signal: AbortSignal.abort() },
      ),
    { name: "AbortError" },
  );
});

test(
  "Restic adapter cancellation awaits an executable fixture's cleanup",
  { timeout: 5000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "gym4me-restic-cancel-"));
    const controller = new AbortController();
    let operation;
    try {
      const executable = join(directory, "fake-restic");
      const fixture = join(directory, "fixture.mjs");
      await writeFile(
        executable,
        '#!/bin/sh\nexec "$FIXTURE_NODE" "$FIXTURE_SCRIPT" "$@"\n',
        { mode: 0o700 },
      );
      await writeFile(
        fixture,
        `import {writeFile} from 'node:fs/promises';
      process.on('SIGTERM',async()=>{await writeFile(process.env.FIXTURE_DONE,'clean');process.exit(0)});
      await writeFile(process.env.FIXTURE_READY,'ready');setInterval(()=>{},1000);`,
      );
      const ready = join(directory, "ready"),
        done = join(directory, "done");
      operation = runRestic(
        ["backup"],
        {
          ...process.env,
          RESTIC_BIN: executable,
          FIXTURE_NODE: process.execPath,
          FIXTURE_SCRIPT: fixture,
          FIXTURE_READY: ready,
          FIXTURE_DONE: done,
        },
        directory,
        { signal: controller.signal },
      );
      void operation.catch(() => {});
      await waitForReady(async () => existsSync(ready), {
        timeoutMs: 2000,
        intervalMs: 10,
      });
      controller.abort();
      await assert.rejects(operation);
      assert.equal(await readFile(done, "utf8"), "clean");
    } finally {
      controller.abort();
      await operation?.catch(() => {});
      await rm(directory, { recursive: true, force: true });
    }
  },
);

test("stopping the scheduler aborts both job lanes and discards late receipts", async () => {
  const signals = [],
    finishes = [];
  const state = {};
  let publications = 0;
  const scheduler = createOperationsScheduler({
    state,
    run(_job, signal) {
      signals.push(signal);
      return new Promise((done) => finishes.push(done));
    },
    persist() {
      publications++;
    },
  });
  scheduler.tick();
  scheduler.stop();
  for (const signal of signals) assert.equal(signal.aborted, true);
  for (const finish of finishes)
    finish({ ok: true, capturedAt: new Date().toISOString() });
  await scheduler.drain();
  assert.equal(publications, 0);
  assert.deepEqual(state, {});
  assert.deepEqual(scheduler.tick(), []);
});

test(
  "capture cancellation closes its transaction and terminates only its tagged dump",
  { timeout: 5000 },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "gym4me-capture-cancel-"));
    const require = createRequire(
      new URL("../apps/api/package.json", import.meta.url),
    );
    const { Pool } = require("pg");
    const originalConnect = Pool.prototype.connect,
      originalQuery = Pool.prototype.query;
    const keys = ["PATH", "FIXTURE_NODE", "FIXTURE_SCRIPT", "FIXTURE_READY"];
    const originalEnvironment = Object.fromEntries(
      keys.map((key) => [key, process.env[key]]),
    );
    const queries = [],
      releases = [];
    const controller = new AbortController();
    let operation;
    try {
      const executable = join(directory, "docker"),
        fixture = join(directory, "docker-fixture.mjs");
      const ready = join(directory, "ready");
      await writeFile(
        executable,
        '#!/bin/sh\nexec "$FIXTURE_NODE" "$FIXTURE_SCRIPT" "$@"\n',
        { mode: 0o700 },
      );
      await writeFile(
        fixture,
        `import {writeFile} from 'node:fs/promises';
      process.on('SIGTERM',()=>process.exit(0));
      await writeFile(process.env.FIXTURE_READY,process.env.PGAPPNAME);setInterval(()=>{},1000);`,
      );
      Object.assign(process.env, {
        PATH: `${directory}:${process.env.PATH}`,
        FIXTURE_NODE: process.execPath,
        FIXTURE_SCRIPT: fixture,
        FIXTURE_READY: ready,
      });
      Pool.prototype.connect = async function () {
        return {
          query: async (sql) => {
            if (sql.includes("pg_export_snapshot"))
              return { rows: [{ id: "fixture-snapshot", at: new Date() }] };
            return { rows: [] };
          },
          release: (destroy) => releases.push(destroy),
        };
      };
      Pool.prototype.query = async function (query) {
        queries.push(query);
        return { rows: [] };
      };
      operation = capture(
        join(directory, "capture"),
        {
          MIGRATION_DATABASE_URL:
            "postgresql://gym4me_migrator:fixture@127.0.0.1:55434/gym4me_stage",
          S3_ENDPOINT: "http://127.0.0.1:8334",
          S3_ACCESS_KEY_ID: "fixture",
          S3_SECRET_ACCESS_KEY: "fixture",
          S3_BUCKET: "fixture",
        },
        false,
        { signal: controller.signal },
      );
      void operation.catch(() => {});
      await waitForReady(async () => existsSync(ready), {
        timeoutMs: 2000,
        intervalMs: 10,
      });
      const name = await readFile(ready, "utf8");
      controller.abort();
      await assert.rejects(operation);
      assert.deepEqual(releases, [true]);
      assert.equal(queries.length, 2);
      assert.match(
        queries[0].text,
        /usename=current_user AND application_name=\$1/,
      );
      assert.match(name, /^gym4me_capture_[a-f0-9]{32}$/);
      for (const query of queries) assert.deepEqual(query.values, [name]);
    } finally {
      controller.abort();
      await operation?.catch(() => {});
      Pool.prototype.connect = originalConnect;
      Pool.prototype.query = originalQuery;
      for (const key of keys) {
        if (originalEnvironment[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnvironment[key];
      }
      await rm(directory, { recursive: true, force: true });
    }
  },
);
