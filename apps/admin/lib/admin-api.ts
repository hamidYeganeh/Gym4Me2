"use client";

import { useMutation } from "@tanstack/react-query";

export function useApiRequest() {
  return useMutation({
    mutationFn: ([url, init]: [string, RequestInit]) => fetch(url, init),
  }).mutateAsync;
}

export async function readApi<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
