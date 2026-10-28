import { cva } from "class-variance-authority";

export const coachCardVariants = cva(
  "relative isolate flex w-full max-w-sm flex-col overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "aspect-[3/4] rounded-[2rem] border-2 border-border bg-image-surface text-image-foreground",
        portrait: "aspect-[15/16] rounded-[2rem] bg-[#101112] text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export const coachCardStyles = {
  image: cva("object-cover object-top", {
    variants: {
      variant: { default: "grayscale", portrait: "grayscale contrast-110" },
    },
    defaultVariants: { variant: "default" },
  }),
  gradient: cva("pointer-events-none absolute inset-0 bg-linear-to-t", {
    variants: {
      variant: {
        default:
          "from-image-surface/95 from-0% via-image-surface/50 via-35% to-transparent to-75%",
        portrait:
          "from-black/95 from-0% via-black/20 via-40% to-transparent to-75%",
      },
    },
    defaultVariants: { variant: "default" },
  }),
  link: cva(
    "absolute inset-0 z-10 rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ring",
  ),
  portraitTop: cva(
    "pointer-events-none relative z-20 flex items-start justify-between gap-3 p-6 [&_button]:pointer-events-auto [&_a]:pointer-events-auto",
  ),
  socialBar: cva(
    "flex items-center gap-1 rounded-2xl bg-white/30 p-1 text-white backdrop-blur-md [&_svg]:size-5",
  ),
  top: cva("relative z-20 flex items-center justify-between gap-3 p-6"),
  content: cva("pointer-events-none relative z-20 mt-auto flex flex-col", {
    variants: { variant: { default: "gap-4 p-6", portrait: "gap-2 p-6" } },
    defaultVariants: { variant: "default" },
  }),
  title: cva("leading-tight font-bold tracking-tight", {
    variants: {
      variant: { default: "text-2xl", portrait: "text-2xl font-extrabold" },
    },
    defaultVariants: { variant: "default" },
  }),
  specialty: cva("leading-snug", {
    variants: {
      variant: {
        default: "text-base text-image-foreground/85",
        portrait: "text-lg text-white/80",
      },
    },
    defaultVariants: { variant: "default" },
  }),
  rating: cva("flex flex-wrap items-center gap-2 text-lg tabular-nums"),
  stars: cva("inline-flex items-center gap-1 text-rating"),
  star: cva(
    "relative inline-flex size-6 shrink-0 [&>:is(svg,.sandow-icon)]:size-full",
  ),
  starFill: cva(
    "absolute inset-y-0 left-0 overflow-hidden [&>:is(svg,.sandow-icon)]:size-6 [&>:is(svg,.sandow-icon)]:max-w-none",
  ),
  meta: cva("flex flex-wrap items-center gap-2 text-base"),
  certification: cva(
    "inline-flex items-center gap-1.5 [&_.sandow-icon]:text-xl",
  ),
  certifiedIcon: cva("text-image-foreground"),
  experience: cva("inline-flex items-center gap-1.5 [&_.sandow-icon]:text-xl"),
  separator: cva("text-muted-foreground"),
};
