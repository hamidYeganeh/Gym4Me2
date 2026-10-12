import { cva } from "class-variance-authority";
export const classCardVariants = cva(
  "relative isolate flex w-full max-w-sm flex-col overflow-hidden rounded-[32px] border border-border bg-card text-card-foreground",
);
export const classCardStyles = {
  hero: cva(
    "relative aspect-[2.9] min-h-32 overflow-hidden bg-image-surface text-image-foreground",
  ),
  image: cva("object-cover"),
  top: cva("relative z-20 flex items-center justify-between gap-3 p-4"),
  link: cva(
    "absolute inset-0 z-10 rounded-[inherit] outline-none   ",
  ),
  content: cva("flex flex-col gap-5 px-5 pt-12 pb-5"),
  title: cva("text-2xl leading-snug font-bold tracking-tight"),
  coach: cva("text-base font-medium text-muted-foreground"),
  metrics: cva("grid grid-cols-3 gap-3 tabular-nums"),
  value: cva(
    "flex items-center gap-2 text-xl font-bold [&_.sandow-icon]:text-2xl",
  ),
  label: cva("mt-1 text-sm"),
  energy: cva("text-primary"),
  score: cva("text-chart-4"),
};
