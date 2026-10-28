import { cva } from "class-variance-authority";
export const clubFeaturedCardStyles = {
  root: cva(
    "relative isolate flex aspect-[16/10] w-full flex-col justify-end overflow-hidden rounded-3xl bg-image-surface text-image-foreground",
  ),
  gradient: cva(
    "pointer-events-none absolute inset-0 backdrop-blur-md bg-linear-to-t from-image-surface via-image-surface/30 to-transparent",
  ),
  logo: cva(
    "absolute start-1/2 top-1/2 size-32 -translate-y-2/3 -translate-x-1/2 overflow-hidden rounded-3xl border-4 border-image-foreground/80 bg-image-surface rtl:translate-x-1/2",
  ),
  content: cva(
    "pointer-events-none relative flex items-end justify-between gap-4 p-5",
  ),
};
