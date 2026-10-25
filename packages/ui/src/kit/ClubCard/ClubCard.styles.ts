import { cva } from "class-variance-authority";

export const clubCardStyles = {
  root: cva("group/club relative isolate flex w-full flex-col", {
    variants: {
      variant: {
        portrait:
          "@container/club aspect-[9/13] overflow-hidden rounded-4xl bg-image-surface text-image-foreground shadow-xl shadow-image-surface/15",
        landscape:
          "flex-row items-start gap-3 border-b border-border py-4 text-card-foreground",
      },
      size: { default: "", compact: "" },
    },
    defaultVariants: { size: "default", variant: "portrait" },
  }),
  cover: cva("club-card-cover relative overflow-hidden rounded-xl bg-muted", {
    variants: {
      size: { default: "aspect-square", compact: "aspect-square" },
      variant: {
        portrait: "absolute! inset-0 aspect-auto! rounded-[inherit]",
        landscape: "",
      },
    },
    defaultVariants: { size: "default" },
  }),
  landscapeContent: cva(
    "pointer-events-none relative z-20 flex min-w-0 flex-1 flex-col gap-2",
  ),
  landscapeTitle: cva("text-base font-semibold leading-relaxed"),
  landscapePrice: cva("shrink-0 text-sm font-semibold text-foreground"),
  landscapeAddress: cva("mt-1 text-xs leading-5 text-muted-foreground"),
  image: cva(
    "object-cover transition-transform duration-200 motion-reduce:transition-none md:group-hover/club:scale-[1.025]",
  ),
  link: cva(
    "absolute inset-0 z-10 rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
  ),
  top: cva(
    "pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2 p-3",
    {
      variants: { variant: { portrait: "p-[5.5%]", landscape: "" } },
      defaultVariants: { variant: "portrait" },
    },
  ),
  price: cva(
    "rounded-full bg-image-surface/65 px-3 py-2 text-xs font-semibold text-image-foreground backdrop-blur-md @[300px]/club:px-4 @[300px]/club:text-sm",
  ),
  content: cva(
    "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-[5.5%] @[300px]/club:gap-3",
  ),
  titleRow: cva("flex flex-wrap items-start justify-between gap-2"),
  title: cva(
    "min-w-0 flex-1 text-sm font-semibold leading-snug tracking-tight @[260px]/club:text-lg @[360px]/club:text-xl",
  ),
  rating: cva("flex shrink-0 items-center gap-1 pt-1 text-xs tabular-nums"),
  star: cva("text-rating"),
  muted: cva("font-normal text-image-foreground/75"),
  address: cva(
    "flex items-start gap-1.5 text-xs leading-relaxed text-image-foreground/75 @[300px]/club:text-sm",
  ),
  facilities: cva(
    "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground",
  ),
  facility: cva("flex items-center gap-1.5"),
  action: cva(
    "pointer-events-auto mt-1 h-11 w-full gap-2 bg-image-foreground text-image-surface hover:bg-image-foreground/90",
  ),
};
