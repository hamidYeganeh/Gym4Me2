import { cva } from "class-variance-authority";
export const reviewCardVariants = cva(
  "flex w-full flex-col gap-4 rounded-[32px] bg-card p-6 text-card-foreground",
);
export const reviewCardStyles = {
  header: cva("flex items-center justify-between gap-3"),
  date: cva("text-sm text-muted-foreground"),
  title: cva("text-lg leading-snug font-bold"),
  body: cva("text-base leading-7 text-muted-foreground"),
  rating: cva("flex items-center gap-3 tabular-nums"),
  stars: cva("inline-flex gap-1 text-rating"),
  star: cva("relative inline-flex size-5 [&>:is(svg,.sandow-icon)]:size-full"),
  fill: cva(
    "absolute inset-y-0 left-0 overflow-hidden [&>:is(svg,.sandow-icon)]:size-5 [&>:is(svg,.sandow-icon)]:max-w-none",
  ),
  verified: cva(
    "flex items-center gap-2 font-medium text-primary [&_.sandow-icon]:text-xl",
  ),
  actions: cva("flex flex-wrap items-center gap-2"),
};
