import { cva } from "class-variance-authority";

export const slidingNumberStyles = {
  root: cva("inline-flex items-center tabular-nums"),
  digit: cva(
    "relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none",
  ),
  number: cva("absolute inset-0 flex items-center justify-center"),
};
export const slidingNumberTransition = {
  type: "spring" as const,
  stiffness: 280,
  damping: 18,
  mass: 0.3,
};
