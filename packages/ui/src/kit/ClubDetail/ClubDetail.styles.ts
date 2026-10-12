import { cva } from "class-variance-authority";

export const clubDetailStyles = {
  root: cva("mx-auto w-full max-w-xl bg-background sm:pt-8"),
  hero: cva(
    "relative isolate flex h-[60svh] min-h-100 max-h-152 flex-col overflow-hidden bg-image-surface text-image-foreground sm:rounded-t-4xl",
  ),
  image: cva("object-cover"),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-b from-image-surface/25 to-transparent to-50%",
  ),
  nav: cva(
    "fixed inset-x-0 z-40 isolate mx-auto flex w-full max-w-xl items-center justify-between px-6 pt-[calc(1.5rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] pb-6 [&>a]:relative [&>a]:z-10 [&>button]:relative [&>button]:z-10",
    {
      variants: { scrolled: { true: "top-0", false: "top-0 sm:top-8" } },
      defaultVariants: { scrolled: false },
    },
  ),
  navTitle: cva(
    "relative z-10 min-w-0 flex-1 truncate px-3 text-center text-lg font-semibold text-foreground sm:text-xl",
  ),
  navBlur: cva("absolute inset-x-0 top-0 -bottom-6 z-0 rounded-none"),
  navGradient: cva(
    "pointer-events-none absolute inset-x-0 top-0 -bottom-6 z-0 bg-linear-to-b from-background from-0% via-background/75 via-45% to-transparent",
  ),
  heading: cva(
    "relative isolate mt-auto flex items-end justify-between gap-4 px-6 pt-24 pb-16 text-foreground sm:px-8",
  ),
  headingBlur: cva("absolute inset-0 z-0 rounded-none"),
  headingGradient: cva(
    "pointer-events-none absolute inset-0 z-0 bg-linear-to-t from-background from-10% via-background/80 via-45% to-transparent",
  ),
  headingContent: cva("relative z-10"),
  category: cva("mb-2 text-sm text-foreground/75"),
  title: cva("text-3xl leading-tight font-semibold tracking-tight sm:text-4xl"),
  price: cva(
    "relative z-10 shrink-0 text-end text-2xl font-semibold text-primary sm:text-3xl",
  ),
  period: cva("mt-1 block text-xs font-normal text-foreground/70"),
  panel: cva(
    "relative -mt-9 flex flex-col gap-7 rounded-t-4xl bg-background px-6 pt-6 text-foreground sm:rounded-4xl sm:p-8",
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
  stats: cva("grid grid-cols-2 gap-2 sm:gap-3"),
  stat: cva(
    "flex h-[92px] items-center justify-start gap-3 rounded-3xl bg-muted px-4 text-start",
  ),
  statIcon: cva(
    "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl text-primary",
  ),
  statValue: cva("text-base font-medium tabular-nums"),
  caption: cva("mt-1 text-sm text-muted-foreground"),
  section: cva("flex flex-col gap-3"),
  sectionTitle: cva("text-2xl font-semibold tracking-tight"),
  description: cva("text-sm leading-8 text-muted-foreground sm:text-base"),
  amenities: cva(
    "flex min-w-0 scroll-fade-x snap-x snap-proximity scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3 outline-none   [--scroll-fade-size:24px] [&>li]:shrink-0 [&>li]:snap-start",
  ),
  footer: cva(
    "sticky bottom-0 isolate flex items-center gap-3 [&>button]:relative [&>button]:z-10 pt-8 pb-[calc(1.25rem+var(--app-safe-bottom,env(safe-area-inset-bottom,0px)))]",
  ),
  footerBlur: cva(
    "absolute -inset-x-6 -top-6 bottom-0 z-0 rounded-none sm:-inset-x-8",
  ),
  footerGradient: cva(
    "pointer-events-none absolute -inset-x-6 -top-6 bottom-0 z-0 bg-linear-to-t from-background from-15% via-background/80 via-55% to-transparent sm:-inset-x-8",
  ),
};
