"use client";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createApiClient,
  type ApiClient,
  type ApiClientOptions,
} from "./transport";
import { createQueryClient } from "./query-client";

type ApiContextValue = { api: ApiClient; resetSession: () => Promise<void> };
const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({
  children,
  ...options
}: Omit<ApiClientOptions, "session"> & { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [session, setSession] = useState(0);
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
        await queryClient.cancelQueries();
        queryClient.clear();
        setSession((value) => value + 1);
      },
    }),
    [api, queryClient],
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
