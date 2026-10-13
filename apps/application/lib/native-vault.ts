import { ApiError } from "@repo/api";
import type {
  SecureStoragePlugin,
  KeychainAccess,
} from "@aparajita/capacitor-secure-storage";
import type { NativeSession, SessionVault } from "./native-fetch";
async function secureStorage() {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform())
    throw new ApiError(0, "Errors.secureStorageUnavailable");
  const { SecureStorage, KeychainAccess } =
    await import("@aparajita/capacitor-secure-storage");
  return prepareNativeStorage(
    SecureStorage,
    KeychainAccess.whenUnlockedThisDeviceOnly,
  );
}

type Storage = Pick<
  SecureStoragePlugin,
  | "setKeyPrefix"
  | "setSynchronize"
  | "setDefaultKeychainAccess"
  | "get"
  | "set"
  | "remove"
>;
export async function prepareNativeStorage(
  store: Storage,
  access: KeychainAccess,
) {
  await store.setKeyPrefix("gym4me.session.");
  await store.setSynchronize(false);
  await store.setDefaultKeychainAccess(access);
  // A Capacitor plugin is a Proxy: returning it directly from an async function
  // triggers Promise assimilation and a nonexistent native `then()` call.
  return { store };
}

export function nativeVault(baseUrl: string | undefined): SessionVault {
  const key = encodeURIComponent(baseUrl ?? "unconfigured");
  return {
    async get() {
      try {
        const { store } = await secureStorage();
        const value = await store.get(key, false, false);
        if (!value) return null;
        if (
          typeof value !== "object" ||
          !("token" in value) ||
          !("expiresAt" in value) ||
          !("sessionId" in value) ||
          typeof value.token !== "string" ||
          !/^[A-Za-z0-9_-]{43}$/.test(value.token) ||
          typeof value.expiresAt !== "string" ||
          !Number.isFinite(Date.parse(value.expiresAt)) ||
          typeof value.sessionId !== "string"
        ) {
          await store.remove(key, false);
          return null;
        }
        return value as NativeSession;
      } catch {
        throw new ApiError(0, "Errors.secureStorageUnavailable");
      }
    },
    async set(session) {
      try {
        const { store } = await secureStorage();
        await store.set(key, session, false, false);
      } catch {
        throw new ApiError(0, "Errors.secureStorageUnavailable");
      }
    },
    async clear() {
      try {
        const { store } = await secureStorage();
        await store.remove(key, false);
      } catch {
        throw new ApiError(0, "Errors.secureStorageUnavailable");
      }
    },
  };
}
