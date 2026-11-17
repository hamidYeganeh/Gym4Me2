import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRetryAfter } from "./use-retry-after";

describe("useRetryAfter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("releases only the throttled action at the server deadline", () => {
    const { result, rerender } = renderHook(({ action }) => useRetryAfter(action), {
      initialProps: { action: "verify" },
    });

    act(() => {
      result.current.capture(new Response(null, { status: 429, headers: { "Retry-After": "2" } }));
    });
    expect(result.current.remaining).toBe(2);
    rerender({ action: "request" });
    expect(result.current.remaining).toBe(0);
    rerender({ action: "verify" });
    expect(result.current.remaining).toBe(2);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.remaining).toBe(0);
  });

  it("uses a fallback when a 429 arrives without a usable retry header", () => {
    const { result } = renderHook(() => useRetryAfter("login"));
    act(() => {
      expect(result.current.capture(new Response(null, { status: 401 }))).toBe(false);
      expect(result.current.capture(new Response(null, { status: 429 }))).toBe(true);
    });
    expect(result.current.remaining).toBe(60);
  });
});
