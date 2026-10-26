import { cva } from "class-variance-authority";

export const coachCardVariants = cva(
  "relative isolate flex w-full max-w-sm flex-col overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "aspect-[3/4] rounded-[2rem] border-2 border-border bg-image-surface text-image-foreground",
        portrait:
          "aspect-[4/5] rounded-3xl bg-image-surface text-image-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export const coachCardStyles = {
  image: cva("object-cover object-top", {
    variants: { variant: { default: "grayscale", portrait: "grayscale" } },
    defaultVariants: { variant: "default" },
  }),
  gradient: cva("pointer-events-none absolute inset-0 bg-linear-to-t", {
    variants: {
      variant: {
        default:
          "from-image-surface/95 from-0% via-image-surface/50 via-35% to-transparent to-75%",
        portrait:
          "from-image-surface/95 via-image-surface/10 to-transparent to-70%",
      },
    },
    defaultVariants: { variant: "default" },
  }),
  link: cva(
    "absolute inset-0 z-10 rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring",
  ),
  portraitTop: cva("relative z-20 flex items-start justify-between gap-3 p-6"),
  socialBar: cva(
    "flex items-center gap-1 rounded-3xl bg-image-foreground/25 p-1",
  ),
  top: cva("relative z-20 flex items-center justify-between gap-3 p-6"),
  content: cva("pointer-events-none relative z-20 mt-auto flex flex-col", {
    variants: { variant: { default: "gap-4 p-6", portrait: "gap-2 p-6" } },
    defaultVariants: { variant: "default" },
  }),
  title: cva("leading-tight font-bold tracking-tight", {
    variants: { variant: { default: "text-2xl", portrait: "text-2xl" } },
    defaultVariants: { variant: "default" },
  }),
  specialty: cva("leading-snug", {
    variants: {
      variant: {
        default: "text-base text-image-foreground/85",
        portrait: "text-base text-image-foreground/80",
      },
    },
    defaultVariants: { variant: "default" },
  }),
  rating: cva("flex flex-wrap items-center gap-2 text-lg tabular-nums"),
  stars: cva("inline-flex items-center gap-1 text-rating"),
  star: cva("relative inline-flex size-6 shrink-0 [&>svg]:size-full"),
  starFill: cva(
    "absolute inset-y-0 left-0 overflow-hidden [&>svg]:size-6 [&>svg]:max-w-none",
  ),
  meta: cva("flex flex-wrap items-center gap-2 text-base"),
  certification: cva(
    "inline-flex items-center gap-1.5 [&_.sandow-icon]:text-xl",
  ),
  certifiedIcon: cva("text-image-foreground"),
  experience: cva("inline-flex items-center gap-1.5 [&_.sandow-icon]:text-xl"),
  separator: cva("text-muted-foreground"),
};
