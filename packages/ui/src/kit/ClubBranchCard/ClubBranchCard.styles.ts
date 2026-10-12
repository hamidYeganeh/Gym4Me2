import { cva } from "class-variance-authority";
export const clubBranchCardStyles = {
  root: cva(
    "relative isolate h-72 w-36 shrink-0 overflow-hidden rounded-3xl bg-image-surface text-image-foreground",
  ),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-t from-image-surface/95 via-image-surface/40 to-transparent",
  ),
};
