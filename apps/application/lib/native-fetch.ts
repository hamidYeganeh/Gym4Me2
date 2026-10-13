import { ApiError } from "@repo/api";
export type NativeSession = {
  token: string;
  expiresAt: string;
  sessionId: string;
};
export type SessionVault = {
  get: () => Promise<NativeSession | null>;
  set: (session: NativeSession) => Promise<void>;
  clear: () => Promise<void>;
};
export function createNativeFetch(
  baseUrl: string | undefined,
  vault: SessionVault,
  fetcher: typeof fetch = globalThis.fetch,
): typeof fetch {
  const base = baseUrl ? new URL(baseUrl.replace(/\/$/, "") + "/") : undefined;
  return async (input, init) => {
    if (!base || base.protocol !== "https:")
      throw new ApiError(0, "Errors.nativeApiNotConfigured");
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
      throw new ApiError(0, "Errors.invalidApiDestination");
    const path = url.pathname.slice(base.pathname.length);
    const method =
      init?.method ?? (input instanceof Request ? input.method : "GET");
    const publicRequest =
      path.startsWith("auth/otp/") ||
      path === "auth/password/login" ||
      (method === "GET" && path === "system/policy") ||
      (method === "GET" &&
        path.startsWith("catalog/") &&
        path !== "catalog/clubs/saved");
    let session = publicRequest ? null : await vault.get();
    if (session && Date.parse(session.expiresAt) <= Date.now()) {
      await vault.clear();
      session = null;
    }
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    headers.set("x-gym-platform", "native");
    if (session) headers.set("Authorization", `Bearer ${session.token}`);
    else headers.delete("Authorization");
    const response = await fetcher(input, {
      ...init,
      headers,
      credentials: "omit",
      redirect: "error",
    });
    if (
      response.ok &&
      ["auth/otp/verify", "auth/password/login"].includes(path) &&
      method === "POST"
    ) {
      const payload: unknown = await response.json();
      if (
        !payload ||
        typeof payload !== "object" ||
        !("token" in payload) ||
        !("expiresAt" in payload) ||
        !("sessionId" in payload) ||
        !("user" in payload) ||
        typeof payload.token !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(payload.token) ||
        typeof payload.expiresAt !== "string" ||
        Date.parse(payload.expiresAt) <= Date.now() ||
        typeof payload.sessionId !== "string"
      )
        throw new ApiError(502, "Errors.invalidResponse");
      if (!Number.isFinite(Date.parse(payload.expiresAt)))
        throw new ApiError(502, "Errors.invalidResponse");
      const next = {
        token: payload.token,
        expiresAt: payload.expiresAt,
        sessionId: payload.sessionId,
      };
      try {
        await vault.set(next);
      } catch {
        const revokeHeaders = new Headers(headers);
        revokeHeaders.set("Authorization", `Bearer ${next.token}`);
        await fetcher(new URL("auth/sessions/logout", base), {
          method: "POST",
          headers: revokeHeaders,
          credentials: "omit",
          redirect: "error",
        }).catch(() => undefined);
        throw new ApiError(0, "Errors.secureStorageUnavailable");
      }
      const safeHeaders = new Headers(response.headers);
      safeHeaders.delete("Content-Length");
      return new Response(
        JSON.stringify({ user: payload.user, expiresAt: payload.expiresAt }),
        { status: response.status, headers: safeHeaders },
      );
    }
    if (
      session &&
      (response.status === 401 ||
        (response.ok &&
          (path === "auth/sessions/logout" ||
            path === `auth/sessions/${session.sessionId}/revoke` ||
            path === "profile/account/phone/verify" ||
            (path === "auth/password" && method === "POST"))))
    )
      await vault.clear();
    return response;
  };
}
