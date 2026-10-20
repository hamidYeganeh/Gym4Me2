import assert from "node:assert/strict";
import test from "node:test";
import { QueryObserver } from "@tanstack/react-query";
import { createQueryClient } from "../src/query-client";
import { createApiClient, ApiError } from "../src/transport";
import { profileKeys } from "../src/profile/profile.keys";
import { handleMutationError } from "../src/mutation-effects";
import { isSessionEndedError } from "../src/session-errors";

test("a mutation rejected by the session guard clears account caches and preserves the original error", async () => {
  for (const code of [
    "Backend.signInFirst",
    "Backend.theSessionHasEndedSignInAgain",
  ]) {
    const query = createQueryClient();
    const { scope } = createApiClient({
      application: "application",
      locale: "fa",
    });
    const key = profileKeys(scope).account();
    query.setQueryData(key, {
      id: "previous-account",
      phone: "private-test-phone",
    });
    let resets = 0;
    const failure = new ApiError(401, code);
    const mutation = query.getMutationCache().build(query, {
      mutationFn: async () => {
        throw failure;
      },
      onError: (error: ApiError) =>
        handleMutationError(query, scope, error, [["profile"]], async () => {
          resets++;
          await query.cancelQueries();
          query.clear();
        }),
    });
    await assert.rejects(
      mutation.execute(undefined),
      (error) => error === failure,
    );
    assert.equal(resets, 1);
    assert.equal(query.getQueryData(key), undefined);
    query.clear();
  }
});
test("wrong OTP/password and unrelated errors preserve the signed-in account and avoid session reset", async () => {
  const query = createQueryClient();
  const { scope } = createApiClient({ application: "business", locale: "fa" });
  const key = profileKeys(scope).account();
  const account = { id: "still-valid" };
  query.setQueryData(key, account);
  let resets = 0;
  for (const failure of [
    new ApiError(401, "Backend.theCodeIsIncorrectOrExpired"),
    new ApiError(401, "Backend.invalidCredentials"),
    new ApiError(403, "Backend.signInFirst"),
    new ApiError(503, "Errors.requestFailed"),
  ]) {
    await handleMutationError(query, scope, failure, [], async () => {
      resets++;
    });
    assert.equal(query.getQueryData(key), account);
    assert.equal(isSessionEndedError(failure), false);
  }
  assert.equal(resets, 0);
  query.clear();
});
test("conflict refresh still reloads only the affected resources in the same API scope", async () => {
  const query = createQueryClient();
  const { scope } = createApiClient({ application: "business", locale: "fa" });
  const foreign = createApiClient({ application: "admin", locale: "fa" }).scope;
  const observer = new QueryObserver(query, {
    queryKey: [...scope, "business", "team"],
    initialData: "before",
    staleTime: Infinity,
    queryFn: async () => "after",
  });
  const stop = observer.subscribe(() => undefined);
  query.setQueryData([...foreign, "business", "team"], "other-scope");
  try {
    await handleMutationError(
      query,
      scope,
      new ApiError(409, "Backend.thisPersonIsAlreadyOnTheTeam"),
      [["business"]],
      async () => {
        throw new Error("Conflict must not reset the session");
      },
    );
    assert.equal(observer.getCurrentResult().data, "after");
    assert.equal(
      query.getQueryData([...foreign, "business", "team"]),
      "other-scope",
    );
  } finally {
    stop();
    query.clear();
  }
});
