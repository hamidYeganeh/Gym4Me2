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

export function nativeVault(
  baseUrl: string | undefined,
  loadStorage: () => Promise<{ store: Storage }> = secureStorage,
): SessionVault {
  const key = encodeURIComponent(baseUrl ?? "unconfigured");
  // Native plugin configuration is process-local and immutable. Reuse only the
  // initialized adapter; session values are still read from secure storage for
  // every operation, including compare/remove after a late response.
  let storage: ReturnType<typeof loadStorage> | undefined;
  const initializedStorage = () => {
    if (!storage)
      storage = loadStorage().catch((error: unknown) => {
        storage = undefined;
        throw error;
      });
    return storage;
  };
  // Compare/remove and writes share one queue, so a late failure cannot erase a newer login.
  let tail: Promise<unknown> = Promise.resolve();
  const serialized = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };
  return {
    get() {
      return serialized(async () => {
        try {
          const { store } = await initializedStorage();
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
      });
    },
    set(session) {
      return serialized(async () => {
        try {
          const { store } = await initializedStorage();
          await store.set(key, session, false, false);
        } catch {
          throw new ApiError(0, "Errors.secureStorageUnavailable");
        }
      });
    },
    clear(expected) {
      return serialized(async () => {
        try {
          const { store } = await initializedStorage();
          if (expected) {
            const current = await store.get(key, false, false);
            if (
              !current ||
              typeof current !== "object" ||
              !("token" in current) ||
              !("sessionId" in current) ||
              current.token !== expected.token ||
              current.sessionId !== expected.sessionId
            )
              return;
          }
          await store.remove(key, false);
        } catch {
          throw new ApiError(0, "Errors.secureStorageUnavailable");
        }
      });
    },
  };
}
