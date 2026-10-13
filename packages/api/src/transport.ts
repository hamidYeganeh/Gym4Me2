export type ApiApplication = "application" | "business" | "admin";
export type ApiLocale = "fa" | "en";
export type ApiScope = readonly [
  "api",
  string,
  ApiApplication,
  ApiLocale,
  number,
];
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;
export type ApiRequest = {
  path: string;
  method: "GET" | "POST" | "PATCH";
  body?: unknown;
  query?: QueryParams;
};
export type RequestOptions = { signal?: AbortSignal };
export type ApiClientOptions = {
  application: ApiApplication;
  locale: ApiLocale;
  baseUrl?: string;
  session?: number;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};
export type ApiClient = {
  scope: ApiScope;
  request: <T>(endpoint: ApiRequest, options?: RequestOptions) => Promise<T>;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

/** One transport for web rewrites and explicitly configured remote/native hosts. */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const baseUrl = (options.baseUrl ?? "/api/v1").replace(/\/$/, "");
  const fetcher = options.fetch ?? globalThis.fetch;
  const scope = [
    "api",
    baseUrl,
    options.application,
    options.locale,
    options.session ?? 0,
  ] as const;
  return {
    scope,
    async request<T>(
      endpoint: ApiRequest,
      requestOptions: RequestOptions = {},
    ): Promise<T> {
      const query = new URLSearchParams();
      for (const [key, value] of Object.entries(endpoint.query ?? {})) {
        if (value !== undefined && value !== null && value !== "")
          query.set(key, String(value));
      }
      const timeout = AbortSignal.timeout(options.timeoutMs ?? 20_000);
      const signal = requestOptions.signal
        ? AbortSignal.any([requestOptions.signal, timeout])
        : timeout;
      let response: Response;
      const multipart = typeof FormData !== "undefined" && endpoint.body instanceof FormData;
      try {
        response = await fetcher(
          `${baseUrl}/${endpoint.path}${query.size ? `?${query}` : ""}`,
          {
            method: endpoint.method,
            credentials: "include",
            referrerPolicy: "strict-origin",
            cache: "no-store",
            headers: {
              "x-gym-client": options.application,
              "Accept-Language": options.locale,
              Accept: "application/json",
              ...(endpoint.body === undefined || multipart
                ? {}
                : { "Content-Type": "application/json" }),
            },
            ...(endpoint.body === undefined
              ? {}
              : { body: multipart ? endpoint.body as FormData : JSON.stringify(endpoint.body) }),
            signal,
          },
        );
      } catch (error) {
        if (error instanceof ApiError) throw error;
        // Keep TanStack's cancellation distinct from failed requests.
        if (requestOptions.signal?.aborted) throw error;
        throw new ApiError(
          0,
          timeout.aborted ? "Errors.timeout" : "Errors.network",
        );
      }
      const data: unknown = await response.json().catch((error: unknown) => {
        if (requestOptions.signal?.aborted) throw error;
        if (timeout.aborted) throw new ApiError(0, "Errors.timeout");
        return undefined;
      });
      if (!response.ok) {
        const code =
          data &&
          typeof data === "object" &&
          "code" in data &&
          typeof data.code === "string"
            ? data.code
            : data &&
                typeof data === "object" &&
                "message" in data &&
                typeof data.message === "string" &&
                data.message.startsWith("Backend.")
              ? data.message
              : "Errors.requestFailed";
        throw new ApiError(response.status, code, data);
      }
      if (data === undefined) throw new ApiError(502, "Errors.invalidResponse");
      return data as T;
    },
  };
}

export const resourceId = (id: string) => encodeURIComponent(id);
