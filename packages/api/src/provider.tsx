"use client";
import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
} from "./transport";
import { createQueryClient } from "./query-client";
import { clearTrainingLocal } from "./profile/training-offline";
import { connectSessionSync } from "./session-sync";

type ApiContextValue = { api: ApiClient; resetSession: () => Promise<void> };
const ApiContext = createContext<ApiContextValue | null>(null);
/** Native background overrides focus; resume restores the browser visibility check. */
export function setNativeApiForeground(active: boolean) {
  focusManager.setFocused(active ? undefined : false);
}
const subscribeForeground = (listener: () => void) =>
  focusManager.subscribe(listener);
export function useApiForeground() {
  return useSyncExternalStore(
    subscribeForeground,
    () => focusManager.isFocused(),
    () => false,
  );
}

export function ApiProvider({
  children,
  ...options
}: Omit<ApiClientOptions, "session"> & { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [session, setSession] = useState(0);
  const sync = useRef<ReturnType<typeof connectSessionSync> | null>(null);
  const resetLocalSession = useCallback(async () => {
    await queryClient.cancelQueries();
    await clearTrainingLocal().catch(() => undefined);
    queryClient.clear();
    setSession((value) => value + 1);
  }, [queryClient]);
  useEffect(() => {
    const connection = connectSessionSync(
      options.application,
      options.baseUrl ?? "/api/v1",
      () => {
        void resetLocalSession();
      },
    );
    sync.current = connection;
    return () => {
      sync.current = null;
      connection.close();
    };
  }, [options.application, options.baseUrl, resetLocalSession]);
  const api = useMemo(
    () => createApiClient({ ...options, session }),
    [
      options.application,
      options.locale,
      options.baseUrl,
      options.timeoutMs,
      options.fetch,
      session,
    ],
  );
  const value = useMemo<ApiContextValue>(
    () => ({
      api,
      async resetSession() {
        await resetLocalSession();
        sync.current?.publish();
      },
    }),
    [api, resetLocalSession],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ApiContext.Provider value={value}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}

export function useApiContext() {
  const context = useContext(ApiContext);
  if (!context) throw new Error("Errors.apiProviderMissing");
  return context;
}
