import { cva } from "class-variance-authority";
export const locationCardStyles = {
  root: cva(
    "group/location relative isolate flex aspect-[129/153] w-56 min-w-0 shrink-0 flex-col justify-end overflow-hidden rounded-3xl bg-image-surface text-image-foreground [container-type:inline-size]",
  ),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/5 to-black/10",
  ),
  content: cva(
    "pointer-events-none relative z-20 flex min-w-0 flex-col gap-1.5 p-[8%] pt-[28%]",
  ),
  pill: cva(
    "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/15 bg-white/15 px-[5cqw] py-[2.5cqw] text-[clamp(0.625rem,4cqw,0.8125rem)] font-medium backdrop-blur-md",
  ),
  action: cva(
    "absolute inset-0 z-10 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-not-allowed",
  ),
};
