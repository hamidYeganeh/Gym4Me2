import { cva } from "class-variance-authority";

export const clubCardStyles = {
  root: cva(
    "group/club relative isolate flex w-full flex-col text-card-foreground",
    {
      variants: {
        variant: {
          portrait: "",
          landscape: "flex-row items-start gap-3 border-b border-border py-4",
        },
        size: { default: "", compact: "" },
      },
      defaultVariants: { size: "default", variant: "portrait" },
    },
  ),
  cover: cva("club-card-cover relative overflow-hidden rounded-xl bg-muted", {
    variants: { size: { default: "aspect-square", compact: "aspect-square" } },
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
      variants: { variant: { portrait: "", landscape: "" } },
      defaultVariants: { variant: "portrait" },
    },
  ),
  price: cva(
    "rounded-full bg-card px-3 py-2 text-xs font-semibold text-card-foreground shadow-sm",
  ),
  content: cva("pointer-events-none relative z-20 flex flex-col gap-2 pt-3"),
  titleRow: cva("flex flex-wrap items-start justify-between gap-2"),
  title: cva("min-w-0 text-base font-semibold leading-relaxed tracking-tight"),
  rating: cva("flex shrink-0 items-center gap-1 pt-1 text-xs tabular-nums"),
  star: cva("text-rating"),
  muted: cva("font-normal text-muted-foreground"),
  address: cva(
    "flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground",
  ),
  facilities: cva(
    "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground",
  ),
  facility: cva("flex items-center gap-1.5"),
  action: cva(
    "pointer-events-auto mt-1 h-11 w-full border border-border bg-muted text-foreground hover:bg-secondary",
  ),
};
