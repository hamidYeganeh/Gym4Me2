import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./transport";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) =>
          failureCount < 1 &&
          !(
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ),
      },
      mutations: { retry: false },
    },
  });
}
