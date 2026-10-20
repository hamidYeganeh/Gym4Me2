import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { ApiError, ApiScope } from "./transport";
import { isSessionEndedError } from "./session-errors";

export async function handleMutationError(
  queryClient: QueryClient,
  scope: ApiScope,
  error: ApiError,
  invalidate: readonly QueryKey[],
  resetSession: () => Promise<void>,
) {
  if (isSessionEndedError(error)) {
    await resetSession();
    return;
  }
  if (error.status === 409)
    await Promise.all(
      invalidate.map((key) =>
        queryClient.invalidateQueries({ queryKey: [...scope, ...key] }),
      ),
    );
}
