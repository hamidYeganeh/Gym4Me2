import { cva } from "class-variance-authority";

export const coachCardVariants = cva(
  "relative isolate flex w-full max-w-sm flex-col overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "aspect-[3/4] rounded-[32px] border border-border bg-card text-card-foreground",
        portrait:
          "aspect-[4/5] rounded-4xl bg-image-surface text-image-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export const coachCardStyles = {
  image: cva("object-cover object-top", {
    variants: { variant: { default: "", portrait: "grayscale" } },
    defaultVariants: { variant: "default" },
  }),
  gradient: cva("pointer-events-none absolute inset-0 bg-linear-to-t", {
    variants: {
      variant: {
        default: "from-card from-5% via-card/90 via-30% to-transparent to-65%",
        portrait:
          "from-image-surface/95 via-image-surface/10 to-transparent to-70%",
      },
    },
    defaultVariants: { variant: "default" },
  }),
  link: cva("absolute inset-0 z-10 rounded-[inherit] outline-none   "),
  portraitTop: cva("relative z-20 flex items-start justify-between gap-3 p-6"),
  socialBar: cva(
    "flex items-center gap-1 rounded-3xl bg-image-foreground/25 p-1",
  ),
  top: cva("relative z-20 flex items-center justify-between gap-3 p-5"),
  content: cva("pointer-events-none relative z-20 mt-auto flex flex-col", {
    variants: { variant: { default: "gap-3 p-5", portrait: "gap-2 p-6" } },
    defaultVariants: { variant: "default" },
  }),
  title: cva("leading-tight font-bold tracking-tight", {
    variants: { variant: { default: "text-2xl", portrait: "text-3xl" } },
    defaultVariants: { variant: "default" },
  }),
  specialty: cva("leading-snug", {
    variants: {
      variant: {
        default: "text-base",
        portrait: "text-xl text-image-foreground/80",
      },
    },
    defaultVariants: { variant: "default" },
  }),
  rating: cva("flex flex-wrap items-center gap-2 text-base tabular-nums"),
  stars: cva("inline-flex items-center gap-1 text-rating"),
  star: cva("relative inline-flex size-5 shrink-0 [&>svg]:size-full"),
  starFill: cva(
    "absolute inset-y-0 left-0 overflow-hidden [&>svg]:size-5 [&>svg]:max-w-none",
  ),
  meta: cva("flex flex-wrap items-center gap-2 text-base"),
  certification: cva(
    "inline-flex items-center gap-1.5 [&_.sandow-icon]:text-xl",
  ),
  certifiedIcon: cva("text-primary"),
  experience: cva("inline-flex items-center gap-1.5 [&_.sandow-icon]:text-xl"),
  separator: cva("text-muted-foreground"),
};
