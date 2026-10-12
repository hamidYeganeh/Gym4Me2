import { cva } from "class-variance-authority";

export const clubCardStyles = {
  root: cva(
    "group/club relative isolate flex w-full flex-col overflow-hidden rounded-4xl bg-image-surface text-image-foreground shadow-xl shadow-image-surface/10",
    {
      variants: {
        variant: {
          portrait: "",
          landscape: "rounded-3xl",
        },
        size: {
          default: "aspect-[3/4.3] min-h-116",
          compact: "aspect-[3/4] min-h-108",
        },
      },
      compoundVariants: [
        { variant: "landscape", className: "aspect-[4/3] min-h-0" },
      ],
      defaultVariants: { size: "default", variant: "portrait" },
    },
  ),
  landscapeContent: cva(
    "pointer-events-none relative z-20 mt-auto text-foreground flex flex-col gap-3 px-4 pt-4 pb-5 sm:px-5",
  ),
  landscapeTitle: cva("text-base font-semibold leading-snug sm:text-lg"),
  landscapePrice: cva(
    "shrink-0 whitespace-nowrap text-sm font-semibold text-primary sm:text-base",
  ),
  landscapeAddress: cva("mt-1 text-xs leading-5 text-muted-foreground"),
  image: cva(
    "object-cover transition-transform duration-700 motion-reduce:transition-none group-hover/club:scale-[1.035]",
  ),
  overlay: cva(
    "pointer-events-none absolute inset-0 bg-linear-to-t from-background from-0% via-background/85 via-25% to-transparent to-65%",
  ),
  link: cva(
    "absolute inset-0 z-10 rounded-4xl outline-none   ",
  ),
  top: cva(
    "pointer-events-none relative z-20 flex items-start justify-between gap-3",
    {
      variants: {
        variant: { portrait: "p-5 sm:p-6", landscape: "p-3 sm:p-4" },
      },
      defaultVariants: { variant: "portrait" },
    },
  ),
  price: cva(
    "whitespace-nowrap rounded-full bg-image-surface/55 px-4 py-2 text-sm font-semibold backdrop-blur-md",
  ),
  content: cva(
    "pointer-events-none relative z-20 mt-auto text-foreground flex flex-col gap-4 p-5 sm:p-6",
  ),
  titleRow: cva("flex items-start justify-between gap-3"),
  title: cva("text-xl leading-snug font-semibold tracking-tight sm:text-2xl"),
  rating: cva("flex shrink-0 items-center gap-1.5 pt-1 text-sm tabular-nums"),
  star: cva("text-rating"),
  muted: cva("text-image-foreground/75"),
  address: cva(
    "flex items-start gap-2 text-sm leading-relaxed text-muted-foreground",
  ),
  facilities: cva(
    "flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm",
  ),
  facility: cva("flex items-center gap-1.5"),
  action: cva("pointer-events-auto mt-1 h-12 w-full"),
};
