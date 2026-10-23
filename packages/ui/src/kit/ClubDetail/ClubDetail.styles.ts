import { cva } from "class-variance-authority";

export const clubDetailStyles = {
  root: cva("mx-auto w-full max-w-xl bg-background"),
  hero: cva(
    "relative isolate flex h-[38svh] min-h-64 max-h-96 flex-col overflow-hidden bg-image-surface text-image-foreground sm:rounded-t-3xl",
  ),
  image: cva("object-cover"),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-b from-image-surface/25 to-transparent to-50%",
  ),
  nav: cva(
    "fixed inset-x-0 z-40 isolate mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-[calc(1rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] pb-6 [&>a]:relative [&>a]:z-10 [&>button]:relative [&>button]:z-10",
    {
      variants: { scrolled: { true: "top-0", false: "top-0" } },
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
    "relative isolate flex flex-col items-start gap-3 pt-1 pb-3 text-foreground",
  ),
  headingGradient: cva(
    "pointer-events-none absolute inset-0 z-0 bg-linear-to-t from-background from-10% via-background/80 via-45% to-transparent",
  ),
  headingContent: cva("relative z-10"),
  category: cva("mb-2 text-sm text-foreground/75"),
  title: cva(
    "text-[1.7rem] leading-relaxed font-semibold tracking-tight sm:text-3xl",
  ),
  price: cva(
    "relative z-10 shrink-0 text-start text-xl font-semibold text-foreground sm:text-2xl",
  ),
  period: cva("mt-1 block text-xs font-normal text-foreground/70"),
  panel: cva(
    "relative -mt-5 flex flex-col gap-6 rounded-t-3xl bg-background px-5 pt-5 text-foreground sm:p-7",
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
    "col-span-6 flex min-h-16 flex-row items-center gap-3 border-b border-border py-3 text-start",
  ),
  statIcon: cva(
    "flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xl text-foreground",
  ),
  statValue: cva("text-sm font-medium tabular-nums leading-relaxed"),
  caption: cva("text-xs text-muted-foreground leading-relaxed"),
  section: cva("flex flex-col gap-3"),
  sectionTitle: cva("text-base font-semibold tracking-tight"),
  description: cva("text-sm leading-8 text-muted-foreground sm:text-base"),
  amenities: cva(
    "flex min-w-0 scroll-fade-x snap-x snap-proximity scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3 outline-none   [--scroll-fade-size:24px] [&>li]:shrink-0 [&>li]:snap-start",
  ),
  footer: cva(
    "sticky bottom-0 z-30 isolate flex items-center gap-3 border-t border-border bg-background [&>button]:relative [&>button]:z-10 pt-3 pb-[calc(1rem+var(--app-safe-bottom,env(safe-area-inset-bottom,0px)))]",
  ),
};
