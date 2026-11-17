import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const buttonVariants = tv({
  base: cn(
    "relative inline-flex items-center justify-center gap-theme-2 whitespace-nowrap",
    "rounded-(--theme-button-radius) text-theme-body2 font-theme-medium theme-motion-colors",
    "cursor-pointer transition-[color,background-color,border-color,filter,transform] duration-(--theme-duration-normal)",
    "motion-safe:active:translate-y-px",
    "focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:outline-none",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-theme-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-']):not([class*='w-']):not([width])]:w-(--button-icon-size)",
    "[&_svg:not([class*='size-']):not([class*='h-']):not([height])]:h-(--button-icon-size)",
  ),
  variants: {
    variant: { contained: "", outlined: "border bg-transparent", text: "bg-transparent" },
    color: {
      neutral: "",
      primary: "",
      secondary: "",
      error: "",
      success: "",
      warning: "",
      info: "",
    },
    radius: {
      none: "rounded-theme-none",
      xs: "rounded-theme-xs",
      sm: "rounded-theme-sm",
      md: "rounded-theme-md",
      lg: "rounded-theme-lg",
      xl: "rounded-theme-xl",
      "2xl": "rounded-theme-2xl",
      "3xl": "rounded-theme-3xl",
      full: "rounded-theme-full",
    },
    size: {
      xs: "[--button-icon-size:var(--theme-space-3)] h-theme-7 px-theme-2 py-theme-1 gap-theme-1 text-theme-caption [&_svg]:size-3",
      sm: "[--button-icon-size:var(--theme-space-3_5)] h-theme-8 px-theme-3 py-theme-1-5 gap-theme-1 text-theme-body2 [&_svg]:size-4",
      md: "[--button-icon-size:var(--theme-space-4)] h-theme-9 px-theme-4 py-theme-2 gap-theme-2 text-theme-body2 [&_svg]:size-5",
      lg: "[--button-icon-size:var(--theme-space-5)] h-theme-10 px-theme-5 py-theme-2-5 gap-theme-2 text-theme-body1 [&_svg]:size-6",
      xl: "[--button-icon-size:var(--theme-space-6)] h-theme-12 px-theme-6 py-theme-3 gap-theme-2 text-theme-body-large [&_svg]:size-7",
    },
    shadow: {
      none: "shadow-theme-none",
      xs: "shadow-theme-xs",
      sm: "shadow-theme-sm",
      md: "shadow-theme-md",
      lg: "shadow-theme-lg",
      xl: "shadow-theme-xl",
    },
    iconOnly: { true: "aspect-square px-theme-0" },
    fullWidth: { true: "w-full" },
  },
  compoundVariants: [
    {
      variant: "contained",
      color: "neutral",
      class:
        "bg-theme-foreground text-theme-background [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-foreground/90",
    },
    {
      variant: "outlined",
      color: "neutral",
      class:
        "border-theme-foreground text-theme-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-foreground/10",
    },
    {
      variant: "text",
      color: "neutral",
      class:
        "text-theme-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-foreground/10",
    },
    {
      variant: "contained",
      color: "primary",
      class:
        "bg-theme-primary text-theme-primary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-primary/90",
    },
    {
      variant: "outlined",
      color: "primary",
      class:
        "border-theme-primary text-theme-primary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-primary/10",
    },
    {
      variant: "text",
      color: "primary",
      class:
        "text-theme-primary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-primary/10",
    },
    {
      variant: "contained",
      color: "secondary",
      class:
        "bg-theme-secondary text-theme-secondary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-secondary/90",
    },
    {
      variant: "outlined",
      color: "secondary",
      class:
        "border-theme-secondary text-theme-secondary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-secondary/10",
    },
    {
      variant: "text",
      color: "secondary",
      class:
        "text-theme-secondary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-secondary/10",
    },
    {
      variant: "contained",
      color: "error",
      class:
        "bg-theme-error text-theme-error-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-error/90",
    },
    {
      variant: "outlined",
      color: "error",
      class:
        "border-theme-error text-theme-error [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-error/10",
    },
    {
      variant: "text",
      color: "error",
      class: "text-theme-error [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-error/10",
    },
    {
      variant: "contained",
      color: "success",
      class:
        "bg-theme-success text-theme-success-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-success/90",
    },
    {
      variant: "outlined",
      color: "success",
      class:
        "border-theme-success text-theme-success [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-success/10",
    },
    {
      variant: "text",
      color: "success",
      class:
        "text-theme-success [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-success/10",
    },
    {
      variant: "contained",
      color: "warning",
      class:
        "bg-theme-warning text-theme-warning-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-warning/90",
    },
    {
      variant: "outlined",
      color: "warning",
      class:
        "border-theme-warning text-theme-warning-text [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-warning/10",
    },
    {
      variant: "text",
      color: "warning",
      class:
        "text-theme-warning-text [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-warning/10",
    },
    {
      variant: "contained",
      color: "info",
      class:
        "bg-theme-info text-theme-info-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-info/90",
    },
    {
      variant: "outlined",
      color: "info",
      class:
        "border-theme-info text-theme-info [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-info/10",
    },
    {
      variant: "text",
      color: "info",
      class: "text-theme-info [@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-info/10",
    },
    {
      variant: "contained",
      color: "primary",
      class: cn(
        "overflow-clip border-x border-b-[1.5px] border-theme-primary",
        "bg-[linear-gradient(175deg,var(--theme-color-primary)_15.78%,var(--theme-color-primary-hover)_85%)]",
        "text-theme-primary-foreground",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:brightness-110",
      ),
    },
    {
      variant: "outlined",
      color: "primary",
      class: cn(
        "border-theme-border bg-theme-card",
        "text-theme-primary",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-theme-secondary",
      ),
    },
  ],
  defaultVariants: {
    variant: "contained",
    color: "primary",
    size: "md",
    shadow: "none",
  },
});
