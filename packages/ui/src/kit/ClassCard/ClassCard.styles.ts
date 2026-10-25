import { cva } from "class-variance-authority";
export const classCardVariants = cva(
  "relative isolate flex aspect-[14/15] w-full max-w-sm flex-col justify-between overflow-hidden rounded-3xl bg-image-surface text-image-foreground [container-type:inline-size]",
);
export const classCardStyles = {
  hero: cva("pointer-events-none absolute inset-0"),
  image: cva("object-cover"),
  gradient: cva(
    "absolute inset-0 bg-linear-to-t from-image-surface/90 via-image-surface/10 to-image-surface/30",
  ),
  top: cva(
    "pointer-events-none relative z-20 flex items-center justify-between gap-3 p-[9cqw]",
  ),
  level: cva(
    "h-auto max-w-1/2 shrink rounded-full border-image-foreground/25 bg-image-foreground/10 px-[4cqw] py-[2.5cqw] text-[clamp(0.625rem,3.2cqw,0.875rem)] leading-normal font-normal whitespace-normal text-image-foreground backdrop-blur-md",
  ),
  duration: cva(
    "flex shrink-0 items-center gap-[2cqw] text-[clamp(0.625rem,3.2cqw,0.875rem)] text-image-foreground/90 tabular-nums [&_svg]:size-[4cqw] [&_svg]:shrink-0",
  ),
  link: cva(
    "absolute inset-0 z-10 rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-image-foreground",
  ),
  content: cva(
    "pointer-events-none relative z-20 mt-auto flex items-end justify-between gap-4 p-[9cqw] pt-[20cqw]",
  ),
  details: cva("flex min-w-0 flex-1 flex-col gap-[2cqw]"),
  title: cva(
    "text-[clamp(1.25rem,6.4cqw,1.875rem)] leading-tight font-normal tracking-tight wrap-break-word",
  ),
  coach: cva(
    "text-[clamp(0.6875rem,3.2cqw,0.875rem)] leading-relaxed text-image-foreground/80",
  ),
  metrics: cva(
    "mb-[1cqw] flex flex-wrap items-center gap-x-[4cqw] gap-y-1 text-image-foreground/85 tabular-nums",
  ),
  value: cva(
    "flex items-center gap-[1.5cqw] text-[clamp(0.625rem,3cqw,0.75rem)] [&_svg]:size-[4.5cqw] [&_svg]:shrink-0",
  ),
  actions: cva("flex shrink-0 flex-col items-center gap-3"),
  save: cva(
    "pointer-events-auto border-image-foreground/25 bg-image-foreground/10 backdrop-blur-md hover:bg-image-foreground/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-image-foreground aria-pressed:border-image-foreground/60 aria-pressed:bg-image-foreground/25 aria-pressed:text-image-foreground",
  ),
  arrow: cva(
    "flex size-[clamp(2.75rem,12.8cqw,4.25rem)] items-center justify-center rounded-full border border-image-foreground/25 bg-image-foreground/10 backdrop-blur-md [&_svg]:size-[4.5cqw]",
  ),
};
