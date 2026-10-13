import assert from "node:assert/strict";
import test from "node:test";
import {
  createNativeFetch,
  type NativeSession,
  type SessionVault,
} from "../lib/native-fetch";
import { ApiError } from "@repo/api";
const base = "https://api.gym4me.test/api/v1";
const token = "a".repeat(43);
const next: NativeSession = {
  token,
  sessionId: "test-session",
  expiresAt: new Date(Date.now() + 60000).toISOString(),
};
function vault() {
  let current: NativeSession | null = null;
  return {
    get: async () => current,
    set: async (value: NativeSession) => {
      current = value;
    },
    clear: async () => {
      current = null;
    },
  };
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
test("native login saves its bearer only in the vault and strips it from the UI response", async () => {
  const store = vault();
  const fetcher = createNativeFetch(base, store, async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("x-gym-platform"), "native");
    assert.equal(init?.credentials, "omit");
    return json({ ...next, user: { id: "athlete" } }, 201);
  });
  const response = await fetcher(`${base}/auth/otp/verify`, { method: "POST" });
  assert.equal((await store.get())?.token, token);
  assert.deepEqual(await response.json(), {
    user: { id: "athlete" },
    expiresAt: next.expiresAt,
  });
});
test("protected calls carry a valid bearer and a revoked session clears secure storage", async () => {
  const store = vault();
  await store.set(next);
  const fetcher = createNativeFetch(base, store, async (_url, init) => {
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      `Bearer ${token}`,
    );
    return json({ code: "Backend.signInFirst" }, 401);
  });
  await fetcher(`${base}/profile/account`);
  assert.equal(await store.get(), null);
});
test("expired credentials are removed before a request and never leave the device", async () => {
  const store = vault();
  await store.set({ ...next, expiresAt: new Date(0).toISOString() });
  const fetcher = createNativeFetch(base, store, async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    return json({});
  });
  await fetcher(`${base}/profile/account`);
  assert.equal(await store.get(), null);
});
test("saved catalog is authenticated while public catalog never receives a bearer", async () => {
  const store = vault();
  await store.set(next);
  const fetcher = createNativeFetch(base, store, async (url, init) => {
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      String(url).includes("/saved") ? `Bearer ${token}` : null,
    );
    return json([]);
  });
  await fetcher(`${base}/catalog/clubs`);
  await fetcher(`${base}/system/policy`);
  await fetcher(`${base}/catalog/clubs/saved?page=2`);
});
test("a failed vault write revokes the new server session and reports the storage failure", async () => {
  const store: SessionVault = {
    get: async () => null,
    set: async () => {
      throw new Error("storage failed");
    },
    clear: async () => undefined,
  };
  const paths: string[] = [];
  const fetcher = createNativeFetch(base, store, async (url, init) => {
    paths.push(String(url));
    if (String(url).endsWith("logout"))
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${token}`,
      );
    return json({ ...next, user: {} }, 201);
  });
  await assert.rejects(
    fetcher(`${base}/auth/otp/verify`, { method: "POST" }),
    (error) =>
      error instanceof ApiError &&
      error.code === "Errors.secureStorageUnavailable",
  );
  assert.equal(paths[1], `${base}/auth/sessions/logout`);
});
test("credentials cannot be sent to another host, path or an insecure API", async () => {
  const store = vault();
  await store.set(next);
  let called = false;
  const request = async () => {
    called = true;
    return json({});
  };
  for (const url of [
    "https://other.test/api/v1/profile/account",
    "https://api.gym4me.test/outside",
  ])
    await assert.rejects(createNativeFetch(base, store, request)(url));
  await assert.rejects(
    createNativeFetch(
      "http://api.gym4me.test/api/v1",
      store,
      request,
    )(`${base}/profile/account`),
  );
  assert.equal(called, false);
});
test("cancellation and redirects cannot silently keep or transfer native credentials", async () => {
  const store = vault();
  await store.set(next);
  const signal = new AbortController().signal;
  await createNativeFetch(base, store, async (_url, init) => {
    assert.equal(init?.signal, signal);
    assert.equal(init?.redirect, "error");
    return json({});
  })(`${base}/profile/account`, { signal });
});

test("password login stores the token securely and password reset removes the old credential", async () => {
  const store = vault();
  await store.set(next);
  const login = createNativeFetch(base, store, async (_url, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    return json({ ...next, user: { id: "athlete" } }, 201);
  });
  const response = await login(`${base}/auth/password/login`, {
    method: "POST",
  });
  assert.equal((await store.get())?.token, token);
  assert.equal("token" in (await response.json()), false);
  const reset = createNativeFetch(base, store, async (_url, init) => {
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      `Bearer ${token}`,
    );
    return json({ success: true }, 201);
  });
  await reset(`${base}/auth/password`, { method: "POST" });
  assert.equal(await store.get(), null);
});
