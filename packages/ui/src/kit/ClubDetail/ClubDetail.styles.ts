import { cva } from "class-variance-authority";

export const clubDetailStyles = {
  root: cva("mx-auto w-full max-w-xl bg-background text-foreground"),
  hero: cva(
    "relative isolate flex h-[min(72svh,620px)] min-h-[380px] flex-col overflow-hidden bg-image-surface text-white",
  ),
  image: cva("object-cover"),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-b from-black/30 via-transparent via-40% to-black/85",
  ),
  nav: cva(
    "fixed inset-x-0 z-40 isolate mx-auto flex w-full max-w-xl items-center justify-between px-5 pt-[calc(1rem+var(--app-safe-top,env(safe-area-inset-top,0px)))] pb-6 [&>a]:size-11 [&>button]:size-11 [&>a]:backdrop-blur-xl [&>button]:backdrop-blur-xl [&>button]:aria-pressed:bg-primary [&>button]:aria-pressed:text-black [&>a]:relative [&>a]:z-10 [&>button]:relative [&>button]:z-10",
    {
      variants: {
        scrolled: {
          true: "top-0 [&>a]:bg-secondary [&>button]:bg-secondary [&>a]:text-secondary-foreground [&>button]:text-secondary-foreground",
          false:
            "top-0 [&>a]:bg-white/20 [&>button]:bg-white/20 [&>a]:text-white [&>button]:text-white",
        },
      },
      defaultVariants: { scrolled: false },
    },
  ),
  navTitle: cva(
    "transition-all duration-300 motion-reduce:transition-none relative z-10 min-w-0 flex-1 truncate px-3 text-center text-lg font-semibold text-foreground sm:text-xl",
  ),
  navGradient: cva(
    "pointer-events-none absolute inset-x-0 top-0 -bottom-6 z-0 bg-linear-to-b from-background from-0% via-background/75 via-45% to-transparent",
  ),
  heading: cva(
    "relative z-10 mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3 px-5 pt-24 pb-14 text-white",
  ),
  headingGradient: cva(
    "pointer-events-none absolute inset-0 z-0 bg-linear-to-t from-background from-10% via-background/80 via-45% to-transparent",
  ),
  headingContent: cva("relative z-10 min-w-0 flex-1 basis-40"),
  category: cva("mb-2 text-sm text-white/75"),
  title: cva(
    "text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl",
  ),
  price: cva(
    "relative z-10 max-w-full text-start text-xl font-semibold text-[#d9ff00] sm:text-2xl",
  ),
  period: cva("mt-1 block text-xs font-normal text-white/70"),
  panel: cva(
    "relative z-10 -mt-7 flex flex-col gap-6 rounded-t-[2rem] bg-background px-5 pt-5 text-foreground sm:pt-6",
  ),
  gallery: cva(
    "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-none",
  ),
  thumbnail: cva(
    "relative aspect-[1.4] w-[calc((100%-1.5rem)/3)] min-w-[calc((100%-1.5rem)/3)] shrink-0 snap-start overflow-hidden rounded-2xl bg-muted outline-none ring-inset transition-opacity focus-visible:ring-2 focus-visible:ring-white",
    {
      variants: {
        selected: {
          true: "ring-2 ring-primary",
          false: "opacity-80 hover:opacity-100",
        },
      },
    },
  ),
  stats: cva("grid grid-cols-2 gap-2 sm:gap-3"),
  stat: cva(
    "flex min-w-0 min-h-16 items-center gap-2 rounded-full bg-muted px-3 py-2 text-start",
  ),
  statIcon: cva(
    "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl text-primary",
  ),
  statValue: cva(
    "line-clamp-2 break-words text-sm font-medium tabular-nums leading-relaxed",
  ),
  caption: cva("text-xs text-muted-foreground leading-relaxed"),
  section: cva("flex flex-col gap-3"),
  sectionTitle: cva("text-2xl font-semibold tracking-tight"),
  description: cva("text-sm leading-8 text-muted-foreground sm:text-base"),
  amenities: cva(
    "flex min-w-0 scroll-fade-x snap-x snap-proximity scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3 outline-none   [--scroll-fade-size:24px] [&>li]:shrink-0 [&>li]:snap-start",
  ),
  footer: cva(
    "sticky bottom-0 z-30 isolate -mx-5 flex items-center gap-3 px-5 pt-10 pb-[calc(1rem+var(--app-safe-bottom,env(safe-area-inset-bottom,0px)))] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-linear-to-t before:from-background before:from-20% before:to-transparent after:pointer-events-none after:absolute after:inset-0 after:-z-20 after:backdrop-blur-xl after:[mask-image:linear-gradient(to_top,black,transparent)]",
  ),
};
