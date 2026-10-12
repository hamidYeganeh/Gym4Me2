import { cva } from "class-variance-authority";
export const locationCardStyles = {
  root: cva(
    "relative isolate flex aspect-[4/5] w-56 shrink-0 flex-col justify-end overflow-hidden rounded-3xl bg-image-surface text-image-foreground",
  ),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-t from-image-surface via-image-surface/20 to-transparent",
  ),
  content: cva("pointer-events-none relative z-10 flex flex-col gap-2 p-4"),
};
