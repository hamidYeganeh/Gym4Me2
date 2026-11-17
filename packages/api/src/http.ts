import axios from "axios";

import type { AxiosRequestConfig } from "axios";

export class ApiError extends Error {
  constructor(
    readonly status?: number,
    readonly retryAfter?: number,
  ) {
    super(status ? `API request failed (${status}).` : "The API could not be reached.");
    this.name = "ApiError";
  }
}

export function createHttp(baseURL: string) {
  const client = axios.create({ baseURL, timeout: 15000, allowAbsoluteUrls: false });

  return async function request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const { data } = await client.request<T>(config);
      return data;
    } catch (error) {
      if (!axios.isAxiosError(error) || axios.isCancel(error)) throw error;
      const seconds = Number(error.response?.headers["retry-after"]);
      throw new ApiError(
        error.response?.status,
        Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined,
      );
    }
  };
}
