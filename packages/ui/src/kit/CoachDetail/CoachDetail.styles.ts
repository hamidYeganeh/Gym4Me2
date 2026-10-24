import { cva } from "class-variance-authority";
export const coachDetailStyles = {
  root: cva(
    "mx-auto flex w-full max-w-xl flex-col gap-6 bg-background pb-[calc(1.5rem+var(--app-safe-bottom))] ",
  ),
  hero: cva(
    "relative isolate mx-5 mt-5 flex aspect-square min-h-80 flex-col overflow-hidden rounded-[1.25rem] bg-image-surface text-image-foreground",
  ),
  image: cva("object-cover"),
  nav: cva(
    "relative flex items-center justify-between px-4 pt-[calc(1rem+var(--app-safe-top,0px))]",
  ),
  gallery: cva("absolute end-5 bottom-6 flex flex-col gap-3"),
  thumbnail: cva(
    "relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-image-foreground/70 p-0 data-[state=on]:border-primary data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-image-surface",
  ),
  heading: cva("relative isolate mt-auto flex flex-col gap-2 py-6 pe-24 ps-5"),
  gradient: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-t from-image-surface via-image-surface/70 to-transparent",
  ),
  content: cva("relative z-10 flex flex-col gap-2"),
  title: cva("text-2xl font-semibold leading-tight"),
  location: cva("flex items-center gap-2 text-sm text-image-foreground/80"),
  panel: cva("flex flex-col gap-6 px-6"),
  stats: cva("grid grid-cols-1 gap-0 rounded-2xl bg-muted px-4"),
  stat: cva(
    "flex min-h-16 items-center gap-3 border-b border-border py-3 last:border-0",
  ),
  icon: cva(
    "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary",
  ),
};
