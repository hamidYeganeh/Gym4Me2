import assert from "node:assert/strict";
import test from "node:test";
import {
  clearExpiredNativeExports,
  exportNativeAccount,
  exportNativePdf,
  type ExportPlatform,
} from "../lib/native-export";
const id = "11111111-1111-4111-8111-111111111111";
function fixture() {
  const removed: string[] = [];
  const writes: unknown[] = [];
  const shared: unknown[] = [];
  const adapter: ExportPlatform = {
    native: () => true,
    available: () => true,
    now: () => 7200000,
    id: () => id,
    files: {
      mkdir: async () => {},
      readdir: async () => ({ files: [] }),
      deleteFile: async ({ path }) => {
        removed.push(path);
      },
      writeFile: async (input) => {
        writes.push(input);
        return { uri: "cache://account.json" };
      },
    },
    share: {
      canShare: async () => ({ value: true }),
      share: async (input) => {
        shared.push(input);
        return {};
      },
    },
  };
  return { adapter, removed, writes, shared };
}
test("successful share retains the private file for its recipient", async () => {
  const f = fixture();
  await exportNativeAccount({ name: "آزمون" }, f.adapter);
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.shared, [{ files: ["cache://account.json"] }]);
  assert.deepEqual(f.removed, []);
});
test("unavailable platform or plugin never writes account data", async () => {
  for (const setting of ["native", "available"] as const) {
    const f = fixture();
    f.adapter[setting] = () => false;
    await assert.rejects(
      exportNativeAccount({}, f.adapter),
      /Privacy.exportUnavailable/,
    );
    assert.deepEqual(f.writes, []);
  }
});
test("failed write and cancelled or failed sharing remove this export", async () => {
  for (const step of ["write", "share"]) {
    const f = fixture();
    if (step === "write")
      f.adapter.files.writeFile = async () => {
        throw new Error("disk full");
      };
    else
      f.adapter.share.share = async () => {
        throw new Error("cancelled");
      };
    await assert.rejects(
      exportNativeAccount({}, f.adapter),
      /Privacy.exportUnavailable/,
    );
    assert.deepEqual(f.removed, [`gym4me-exports/account-${id}.json`]);
  }
});
test("cleanup only removes expired account exports", async () => {
  const f = fixture();
  f.adapter.files.readdir = async () => ({
    files: [
      {
        name: `account-${id}.json`,
        mtime: 0,
        type: "file",
        size: 1,
        uri: "cache://old",
      },
      {
        name: "account-22222222-2222-4222-8222-222222222222.json",
        mtime: 7100000,
        type: "file",
        size: 1,
        uri: "cache://new",
      },
      {
        name: "other.json",
        mtime: 0,
        type: "file",
        size: 1,
        uri: "cache://other",
      },
    ],
  });
  await clearExpiredNativeExports(f.adapter);
  assert.deepEqual(f.removed, [`gym4me-exports/account-${id}.json`]);
});

test("plan PDF sharing preserves binary bytes in the private cache", async () => {
  const f = fixture(),
    bytes = Uint8Array.from([37, 80, 68, 70, 45, 49, 46, 51, 0, 255, 128]);
  await exportNativePdf(bytes, f.adapter);
  const file = f.writes[0] as {
    path: string;
    data: string;
    directory: string;
    encoding?: unknown;
  };
  assert.equal(file.path, `gym4me-exports/plan-${id}.pdf`);
  assert.equal(file.directory, "CACHE");
  assert.equal(file.encoding, undefined);
  assert.deepEqual(Uint8Array.from(Buffer.from(file.data, "base64")), bytes);
  assert.equal(f.shared.length, 1);
});
test("PDF export rejects unsupported platforms and oversized files before writing", async () => {
  for (const variant of ["web", "missing-plugin", "oversized"]) {
    const f = fixture();
    if (variant === "web") f.adapter.native = () => false;
    if (variant === "missing-plugin") f.adapter.available = () => false;
    await assert.rejects(
      exportNativePdf(
        new Uint8Array(variant === "oversized" ? 8 * 1024 * 1024 + 1 : 10),
        f.adapter,
      ),
      /Training.pdfUnavailable/,
    );
    assert.equal(f.writes.length, 0);
    assert.equal(f.shared.length, 0);
  }
});
test("cancelled PDF sharing removes its own cache file", async () => {
  const f = fixture();
  f.adapter.share.share = async () => {
    throw new Error("cancelled");
  };
  await assert.rejects(
    exportNativePdf(new Uint8Array([37, 80, 68, 70]), f.adapter),
    /Training.pdfUnavailable/,
  );
  assert.deepEqual(f.removed, [`gym4me-exports/plan-${id}.pdf`]);
});
