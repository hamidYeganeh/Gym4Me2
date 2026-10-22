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

import { nativeVault } from "../lib/native-vault";
import { createNativeFetch, type NativeSession } from "../lib/native-fetch";

function storageFixture() {
  let current: NativeSession | null = null;
  const store = {
    setKeyPrefix: async () => undefined,
    setSynchronize: async () => undefined,
    setDefaultKeychainAccess: async () => undefined,
    get: async () => current,
    set: async (_key: string, value: NativeSession) => {
      current = value;
    },
    remove: async () => {
      current = null;
    },
  } as unknown as Awaited<
    ReturnType<NonNullable<Parameters<typeof nativeVault>[1]>>
  >["store"];
  return store;
}
test("native initialization is reused while every read observes fresh secure storage", async () => {
  const store = storageFixture();
  let initializations = 0;
  const vault = nativeVault("https://api.example/api/v1", async () => {
    initializations++;
    return { store };
  });
  const first = {
    token: "a".repeat(43),
    sessionId: "first",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const second = { ...first, token: "b".repeat(43), sessionId: "second" };
  await vault.set(first);
  assert.deepEqual(await vault.get(), first);
  // Simulate a native store update outside the vault: no cached token survives.
  await store.set("unused-fixture-key", second, false, false);
  assert.deepEqual(await vault.get(), second);
  await vault.clear(first);
  assert.deepEqual(await vault.get(), second);
  await vault.clear(second);
  assert.equal(await vault.get(), null);
  assert.equal(initializations, 1);
});

test("a failed native initialization can retry on the next operation", async () => {
  const store = storageFixture();
  let initializations = 0;
  const vault = nativeVault("https://api.example/api/v1", async () => {
    if (++initializations === 1) throw new Error("temporarily locked");
    return { store };
  });
  await assert.rejects(vault.get(), /Errors.secureStorageUnavailable/);
  assert.equal(await vault.get(), null);
  assert.equal(initializations, 2);
});

test("a late failure from an old native session cannot delete a newer login", async () => {
  const store = storageFixture();
  const vault = nativeVault("https://api.example/api/v1", async () => ({
    store,
  }));
  const first = {
    token: "a".repeat(43),
    sessionId: "first",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const second = { ...first, token: "b".repeat(43), sessionId: "second" };
  await vault.set(first);
  await vault.set(second);
  await vault.clear(first);
  assert.deepEqual(await vault.get(), second);
  await vault.clear(second);
  assert.equal(await vault.get(), null);
});
test("native compare/remove and writes serialize without losing a concurrent newer session", async () => {
  const store = storageFixture();
  const vault = nativeVault("https://api.example/api/v1", async () => ({
    store,
  }));
  const first = {
    token: "a".repeat(43),
    sessionId: "first",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const second = { ...first, token: "b".repeat(43), sessionId: "second" };
  await vault.set(first);
  await Promise.all([vault.clear(first), vault.set(second)]);
  assert.deepEqual(await vault.get(), second);
  await Promise.all([vault.set(first), vault.clear(second)]);
  assert.deepEqual(await vault.get(), first);
});

test("the fetch adapter passes the failed session to the vault when an older response arrives after login", async () => {
  const store = storageFixture();
  const vault = nativeVault("https://api.example/api/v1", async () => ({
    store,
  }));
  const first = {
    token: "a".repeat(43),
    sessionId: "first",
    expiresAt: new Date(Date.now() + 60000).toISOString(),
  };
  const second = { ...first, token: "b".repeat(43), sessionId: "second" };
  await vault.set(first);
  let release!: () => void;
  let started!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const request = createNativeFetch(
    "https://api.example/api/v1",
    vault,
    async (_url, init) => {
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${first.token}`,
      );
      started();
      await gate;
      return new Response(
        JSON.stringify({ code: "Backend.theSessionHasEndedSignInAgain" }),
        { status: 401 },
      );
    },
  );
  const pending = request("https://api.example/api/v1/profile/account");
  await ready;
  await vault.set(second);
  release();
  await pending;
  assert.deepEqual(await vault.get(), second);
});
