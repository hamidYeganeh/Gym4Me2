import { cva } from "class-variance-authority";
export const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,color,border-color,opacity] duration-120 motion-reduce:transition-none outline-none select-none     disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20   [&_.sandow-icon]:text-base [&_.sandow-icon]:pointer-events-none [&_:is(svg,.sandow-icon)]:pointer-events-none [&_:is(svg,.sandow-icon)]:shrink-0 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        image:
          "border-image-foreground/10 bg-image-surface/70 text-image-foreground hover:bg-image-surface/65 aria-pressed:bg-primary aria-pressed:text-primary-foreground",
        imageSolid:
          "bg-image-foreground text-image-surface hover:bg-image-foreground/90",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-transparent bg-muted hover:bg-secondary hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground  ",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground ",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40    ",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2",
        lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3",
        icon: "size-9 rounded-full",
        "icon-xs":
          "size-6 rounded-full [&_:is(svg,.sandow-icon):not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
