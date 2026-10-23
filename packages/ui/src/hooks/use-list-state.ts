"use client";
import { useSyncExternalStore, type SetStateAction } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@repo/api/profile";
import { useApiContext } from "@repo/api/provider";
import {
  readListMemory,
  writeListMemory,
  subscribeListMemory,
} from "@repo/api/list-memory";
/** A route + account + business scope is required; resetting auth also erases this store. */
export function useListState<T>(
  name: string,
  initial: T,
  validate: (value: unknown) => value is T,
  scope = "",
) {
  const { api } = useApiContext();
  const account = useAccount();
  const path = usePathname();
  const key = JSON.stringify([
    api.scope[1],
    api.scope[2],
    account.data?.id ?? "guest",
    path,
    scope,
    name,
  ]);
  const raw = useSyncExternalStore(
    subscribeListMemory,
    () => readListMemory(key),
    () => null,
  );
  function parse(value: string | null): T {
    if (value)
      try {
        const parsed: unknown = JSON.parse(value);
        if (validate(parsed)) return parsed;
      } catch {
        /* Older/corrupt preferences use defaults. */
      }
    return initial;
  }
  const value = parse(raw);
  function set(next: SetStateAction<T>) {
    const current = parse(readListMemory(key));
    writeListMemory(
      key,
      JSON.stringify(
        typeof next === "function"
          ? (next as (previous: T) => T)(current)
          : next,
      ),
    );
  }
  return [value, set] as const;
}
