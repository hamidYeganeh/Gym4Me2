export type Client = "application" | "business" | "admin";
export type Account = {
  id: string;
  phone: string;
  displayName: string | null;
  status: string;
};
export type Organization = {
  id: string;
  name: string;
  status: string;
  role: string;
  reviewReason: string | null;
};
export type Invitation = {
  id: string;
  organizationName: string;
  role: string;
  expiresAt: string;
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  client: Client,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method,
      credentials: "same-origin",
      referrerPolicy: "strict-origin",
      cache: "no-store",
      headers: {
        "x-gym-client": client,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new ApiError(
      0,
      "ارتباط برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.",
    );
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "درخواست انجام نشد. دوباره تلاش کنید.";
    throw new ApiError(response.status, message);
  }
  return data as T;
}
