import assert from "node:assert/strict";
import test from "node:test";
import {
  clearExpiredNativeExports,
  exportNativeAccount,
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
