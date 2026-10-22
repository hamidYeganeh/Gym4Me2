import { cva } from "class-variance-authority";

export const clubDetailStyles = {
  root: cva("mx-auto w-full max-w-xl bg-background sm:pt-8"),
  hero: cva(
    "relative isolate flex h-[46svh] min-h-80 max-h-112 flex-col overflow-hidden bg-image-surface text-image-foreground sm:rounded-t-4xl",
  ),
  image: cva("object-cover"),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-b from-image-surface/25 to-transparent to-50%",
  ),
  nav: cva(
    "fixed inset-x-0 z-40 isolate mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-[calc(1rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] pb-6 [&>a]:relative [&>a]:z-10 [&>button]:relative [&>button]:z-10",
    {
      variants: { scrolled: { true: "top-0", false: "top-0 sm:top-8" } },
      defaultVariants: { scrolled: false },
    },
  ),
  navTitle: cva(
    "relative z-10 min-w-0 flex-1 truncate px-3 text-center text-lg font-semibold text-foreground sm:text-xl",
  ),
  navGradient: cva(
    "pointer-events-none absolute inset-x-0 top-0 -bottom-6 z-0 bg-linear-to-b from-background from-0% via-background/75 via-45% to-transparent",
  ),
  heading: cva(
    "relative isolate mt-auto flex flex-col items-start justify-end gap-4 px-6 pt-20 pb-14 text-foreground sm:px-8",
  ),
  headingGradient: cva(
    "pointer-events-none absolute inset-0 z-0 bg-linear-to-t from-background from-10% via-background/80 via-45% to-transparent",
  ),
  headingContent: cva("relative z-10"),
  category: cva("mb-2 text-sm text-foreground/75"),
  title: cva("text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"),
  price: cva(
    "relative z-10 shrink-0 text-start text-xl font-semibold text-foreground sm:text-2xl",
  ),
  period: cva("mt-1 block text-xs font-normal text-foreground/70"),
  panel: cva(
    "relative -mt-9 flex flex-col gap-6 rounded-t-4xl bg-background px-5 pt-5 text-foreground sm:rounded-4xl sm:p-8",
  ),
  gallery: cva("grid grid-cols-3 gap-3"),
  thumbnail: cva(
    "relative aspect-[1.4] overflow-hidden rounded-2xl bg-muted outline-none ring-offset-4 ring-offset-background transition-opacity  ",
    {
      variants: {
        selected: {
          true: "ring-2 ring-primary",
          false: "opacity-65 hover:opacity-100",
        },
      },
    },
  ),
  stats: cva("grid grid-cols-6 gap-2 sm:gap-3"),
  stat: cva(
    "col-span-2 flex min-h-24 flex-col items-start justify-start gap-2 rounded-2xl bg-muted p-3 text-start first:col-span-6 first:min-h-0 first:flex-row first:items-center first:gap-3",
  ),
  statIcon: cva(
    "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl text-primary",
  ),
  statValue: cva("text-sm font-medium tabular-nums leading-relaxed"),
  caption: cva("text-xs text-muted-foreground leading-relaxed"),
  section: cva("flex flex-col gap-3"),
  sectionTitle: cva("text-lg font-semibold tracking-tight"),
  description: cva("text-sm leading-8 text-muted-foreground sm:text-base"),
  amenities: cva(
    "flex min-w-0 scroll-fade-x snap-x snap-proximity scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3 outline-none   [--scroll-fade-size:24px] [&>li]:shrink-0 [&>li]:snap-start",
  ),
  footer: cva(
    "sticky bottom-0 z-30 isolate flex items-center gap-3 border-t border-border bg-background [&>button]:relative [&>button]:z-10 pt-3 pb-[calc(1rem+var(--app-safe-bottom,env(safe-area-inset-bottom,0px)))]",
  ),
};
