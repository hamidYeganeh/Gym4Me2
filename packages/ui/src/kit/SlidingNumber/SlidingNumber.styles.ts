import { cva } from "class-variance-authority";

export const slidingNumberStyles = {
  root: cva("inline-flex items-center tabular-nums"),
  digit: cva(
    "relative inline-block w-[1ch] overflow-x-visible overflow-y-clip leading-none",
  ),
  number: cva("absolute inset-0 flex items-center justify-center"),
};
// Match Animate UI's digit roller, rather than its slower whole-number counter.
export const slidingNumberTransition = {
  stiffness: 200,
  damping: 20,
  mass: 0.4,
};
