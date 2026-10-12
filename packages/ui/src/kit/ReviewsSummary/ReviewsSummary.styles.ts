import { cva } from "class-variance-authority";
export const reviewsSummaryStyles = {
  root: cva(
    "flex items-center gap-5 rounded-[32px] bg-card p-5 text-card-foreground",
  ),
  average: cva("flex shrink-0 flex-col gap-1"),
  value: cva("text-4xl font-bold tabular-nums sm:text-5xl"),
  bars: cva("flex min-w-0 flex-1 flex-col gap-3"),
  row: cva("flex items-center gap-2 text-xs tabular-nums"),
  track: cva("h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"),
  fill: cva("h-full rounded-full bg-foreground"),
};
