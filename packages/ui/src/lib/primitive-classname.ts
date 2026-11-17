import { cn } from "./utils";

/** Preserve Base UI's state-aware className while merging semantic overrides. */
export const primitiveClassName =
  <State>(base: string, className?: string | ((state: State) => string | undefined)) =>
  (state: State) =>
    cn(base, typeof className === "function" ? className(state) : className);
