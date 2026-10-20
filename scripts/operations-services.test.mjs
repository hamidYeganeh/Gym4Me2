import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  operationsServices,
  generateOperationsServices,
} from "./operations-services.mjs";
import {
  stagingApiEnvironment,
  waitForReady,
  runStagingService,
} from "./staging-service.mjs";

test("generation covers every staging service without reading secrets or starting processes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-supervisors-"));
  try {
    const output = join(directory, "definitions");
    const names = generateOperationsServices(directory, output);
    assert.deepEqual(names, [
      "infrastructure",
      "api",
      "application",
      "admin",
      "business",
      "proxy",
      "backup",
      "monitor",
    ]);
    for (const name of names) {
      const file = join(output, `ir.gym4me.${name}.plist`);
      const content = await readFile(file, "utf8");
      assert.equal((await stat(file)).mode & 0o777, 0o600);
      assert.match(content, /<key>Umask<\/key><integer>63<\/integer>/);
      assert.match(content, /<key>ExitTimeOut<\/key><integer>25<\/integer>/);
      assert.doesNotMatch(
        content,
        /AUTH_SECRET|DATABASE_URL|RESTIC_PASSWORD|launchctl/,
      );
      if (name === "infrastructure")
        assert.match(content, /<key>SuccessfulExit<\/key><false\/>/);
      else assert.match(content, /<key>KeepAlive<\/key><true\/>/);
    }
    const escaped = operationsServices('/tmp/a&b<"c', "/tmp/node&binary")[0]
      .content;
    assert.match(escaped, /a&amp;b&lt;&quot;c/);
    assert.match(escaped, /node&amp;binary/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("API supervision uses only isolated runtime configuration and strips migration credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "gym4me-supervisor-env-"));
  const file = join(directory, ".env.staging");
  const text =
    "DATABASE_URL=postgresql://gym4me_runtime:fixture@127.0.0.1:55434/gym4me_stage\nS3_ENDPOINT=http://127.0.0.1:8334\nMIGRATION_DATABASE_URL=private-migration\nSTAGE_ADMIN_PASSWORD=private-admin\n";
  try {
    await writeFile(file, text, { mode: 0o600 });
    const env = stagingApiEnvironment(directory, {
      PATH: "/bin",
      STAGE_RUNTIME_PASSWORD: "fixture",
    });
    assert.equal(env.API_HOST, "127.0.0.1");
    assert.equal(env.PORT, "7188");
    assert.equal(env.MIGRATION_DATABASE_URL, undefined);
    assert.equal(env.STAGE_ADMIN_PASSWORD, undefined);
    assert.equal(env.STAGE_RUNTIME_PASSWORD, undefined);
    assert.equal(await readFile(file, "utf8"), text);
    await writeFile(file, text.replace(":55434/", ":55432/"));
    assert.throws(() => stagingApiEnvironment(directory), /isolated loopback/);
    await writeFile(file, text.replace("gym4me_runtime:", "gym4me_migrator:"));
    assert.throws(() => stagingApiEnvironment(directory), /isolated loopback/);
    await assert.rejects(
      runStagingService("unknown", { directory }),
      /Unknown staging/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("readiness retries until healthy; cancellation and deadlines prevent startup", async () => {
  let calls = 0;
  await waitForReady(async () => ++calls === 3, {
    intervalMs: 1,
    timeoutMs: 1000,
  });
  assert.equal(calls, 3);
  const controller = new AbortController();
  await assert.rejects(
    waitForReady(
      async () => {
        controller.abort();
        return false;
      },
      { signal: controller.signal, intervalMs: 1 },
    ),
    { name: "AbortError" },
  );
  let expired = false;
  await assert
    .rejects(waitForReady(async () => false, { intervalMs: 1, timeoutMs: 15 }))
    .then(() => {
      expired = true;
    });
  assert.equal(expired, true);
  let started = false;
  await assert.rejects(
    waitForReady(
      async () => {
        started = true;
        return true;
      },
      { signal: AbortSignal.abort() },
    ),
  );
  assert.equal(started, false);
});
