"use client";
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useApiContext } from "./provider";
import { ApiError, type ApiClient, type ApiScope } from "./transport";

export function useApiQuery<T>(
  key: (scope: ApiScope) => QueryKey,
  load: (api: ApiClient, signal: AbortSignal) => Promise<T>,
  enabled = true,
  staleTime?: number,
  manual = false,
) {
  const { api } = useApiContext();
  return useQuery<T, ApiError>({
    queryKey: key(api.scope),
    queryFn: enabled || manual ? ({ signal }) => load(api, signal) : skipToken,
    enabled,
    ...(staleTime === undefined ? {} : { staleTime }),
  });
}

export function useApiMutation<T, V>(
  save: (api: ApiClient, variables: V) => Promise<T>,
  invalidate: readonly QueryKey[],
  resetSession = false,
) {
  const context = useApiContext();
  const queryClient = useQueryClient();
  return useMutation<T, ApiError, V>({
    mutationFn: (variables) => save(context.api, variables),
    onSuccess: async () => {
      if (resetSession) await context.resetSession();
      else
        await Promise.all(
          invalidate.map((key) =>
            queryClient.invalidateQueries({
              queryKey: [...context.api.scope, ...key],
            }),
          ),
        );
    },
    onError: async (error) => {
      if (error.status === 409)
        await Promise.all(
          invalidate.map((key) =>
            queryClient.invalidateQueries({
              queryKey: [...context.api.scope, ...key],
            }),
          ),
        );
    },
  });
}
