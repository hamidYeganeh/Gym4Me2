import assert from "node:assert/strict";
import test from "node:test";
import { KeychainAccess } from "@aparajita/capacitor-secure-storage";
import { prepareNativeStorage } from "../lib/native-vault";

test("initialization wraps the Capacitor proxy so Promise resolution never calls native then", async () => {
  const calls: Array<[string, unknown]> = [];
  let thenReads = 0;
  const proxy = new Proxy(
    {
      setKeyPrefix: async (value: unknown) => {
        calls.push(["prefix", value]);
      },
      setSynchronize: async (value: unknown) => {
        calls.push(["sync", value]);
      },
      setDefaultKeychainAccess: async (value: unknown) => {
        calls.push(["access", value]);
      },
    },
    {
      get(target, name, receiver) {
        if (name === "then") {
          thenReads++;
          throw new Error("SecureStorage.then() is not implemented on android");
        }
        return Reflect.get(target, name, receiver);
      },
    },
  );
  const access = KeychainAccess.whenUnlockedThisDeviceOnly;
  const result = await prepareNativeStorage(
    proxy as Parameters<typeof prepareNativeStorage>[0],
    access,
  );
  assert.equal(result.store, proxy);
  assert.equal(thenReads, 0);
  assert.deepEqual(calls, [
    ["prefix", "gym4me.session."],
    ["sync", false],
    ["access", access],
  ]);
});

test("initialization failures reject rather than leave account loading pending", async () => {
  const store = {
    setKeyPrefix: async () => {
      throw new Error("storage unavailable");
    },
  } as unknown as Parameters<typeof prepareNativeStorage>[0];
  await assert.rejects(
    prepareNativeStorage(store, KeychainAccess.whenUnlockedThisDeviceOnly),
    /storage unavailable/,
  );
});
