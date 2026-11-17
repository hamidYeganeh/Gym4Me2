import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const clubCardVariants = tv({
  slots: {
    root: cn(
      "relative isolate w-full justify-end gap-theme-3 overflow-hidden p-theme-5 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-theme-ring has-[a:focus-visible]:ring-offset-2",
      "bg-theme-surface-dark text-theme-surface-dark-foreground",
    ),
    link: "after:absolute after:inset-0 after:z-10 focus-visible:outline-none",
    arrow:
      "absolute end-theme-5 top-theme-5 grid size-theme-9 place-items-center rounded-theme-full bg-theme-surface-dark text-theme-surface-dark-foreground",
    image: "absolute inset-0 -z-20 size-full object-cover",
    scrim:
      "pointer-events-none absolute inset-0 -z-10 bg-linear-to-t from-theme-surface-dark from-5% via-theme-surface-dark/85 via-32% to-transparent to-75%",
    price: "mb-auto self-start bg-theme-surface-dark/85 text-theme-surface-dark-foreground",
    header: "min-w-0 gap-theme-2",
    heading: "flex flex-wrap items-baseline justify-between gap-x-theme-3 gap-y-theme-1",
    title: "min-w-0 wrap-anywhere text-theme-h4 font-theme-semibold",
    rating: "inline-flex shrink-0 items-center gap-theme-1 text-theme-body1",
    star: "text-theme-warning",
    reviewCount: "text-theme-surface-dark-muted-foreground",
    address: cn(
      "flex items-start gap-theme-2 wrap-anywhere [&_svg]:shrink-0",
      "text-theme-surface-dark-muted-foreground",
    ),
    amenities: cn(
      "flex list-none flex-wrap gap-x-theme-4 gap-y-theme-1",
      "text-theme-body2 text-theme-surface-dark-muted-foreground",
    ),
  },
  variants: {
    orientation: {
      vertical: { root: "aspect-[3/4]" },
      horizontal: {
        root: "aspect-[6/5] gap-theme-2 bg-theme-card text-theme-card-foreground",
        scrim: "from-theme-card from-12% via-theme-card/90 via-37% to-78%",
        heading: "items-start",
        title: "text-theme-h5",
        price: "m-0 bg-transparent px-0 py-0 text-theme-h5 text-theme-card-foreground",
        rating: "w-fit rounded-theme-full bg-theme-card/90 px-theme-2 py-theme-1 text-theme-body2",
        reviewCount: "text-theme-muted-foreground",
        address: "text-theme-muted-foreground",
        amenities:
          "gap-theme-2 text-theme-muted-foreground [&>li]:rounded-theme-full [&>li]:bg-theme-surface-soft [&>li]:px-theme-2 [&>li]:py-theme-1",
      },
    },
  },
  defaultVariants: { orientation: "vertical" },
});
