import { cn } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const badgeVariants = tv({
  base: cn(
    "inline-flex w-fit shrink-0 items-center justify-center gap-theme-1 whitespace-nowrap",
    "text-theme-body2 font-theme-medium theme-motion-colors",
    "focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:outline-none",
    "[&_svg]:pointer-events-none [&_svg]:size-theme-3",
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
      xs: "px-theme-2 py-theme-1 text-theme-caption",
      sm: "px-theme-3 py-theme-1-5 text-theme-body2",
      md: "px-theme-4 py-theme-2 text-theme-body2",
      lg: "px-theme-5 py-theme-2-5 text-theme-body1",
      xl: "px-theme-6 py-theme-3 text-theme-body-large",
    },
    shadow: {
      none: "shadow-theme-none",
      xs: "shadow-theme-xs",
      sm: "shadow-theme-sm",
      md: "shadow-theme-md",
      lg: "shadow-theme-lg",
      xl: "shadow-theme-xl",
    },
  },
  compoundVariants: [
    { variant: "contained", color: "neutral", class: "bg-theme-foreground text-theme-background" },
    {
      variant: "outlined",
      color: "neutral",
      class: "border-theme-foreground text-theme-foreground",
    },
    { variant: "text", color: "neutral", class: "text-theme-foreground" },
    {
      variant: "contained",
      color: "primary",
      class: "bg-theme-primary text-theme-primary-foreground",
    },
    { variant: "outlined", color: "primary", class: "border-theme-primary text-theme-primary" },
    { variant: "text", color: "primary", class: "text-theme-primary" },
    {
      variant: "contained",
      color: "secondary",
      class: "bg-theme-secondary text-theme-secondary-foreground",
    },
    {
      variant: "outlined",
      color: "secondary",
      class: "border-theme-secondary text-theme-secondary-foreground",
    },
    { variant: "text", color: "secondary", class: "text-theme-secondary-foreground" },
    { variant: "contained", color: "error", class: "bg-theme-error text-theme-error-foreground" },
    { variant: "outlined", color: "error", class: "border-theme-error text-theme-error" },
    { variant: "text", color: "error", class: "text-theme-error" },
    {
      variant: "contained",
      color: "success",
      class: "bg-theme-success text-theme-success-foreground",
    },
    { variant: "outlined", color: "success", class: "border-theme-success text-theme-success" },
    { variant: "text", color: "success", class: "text-theme-success" },
    {
      variant: "contained",
      color: "warning",
      class: "bg-theme-warning text-theme-warning-foreground",
    },
    {
      variant: "outlined",
      color: "warning",
      class: "border-theme-warning text-theme-warning-text",
    },
    { variant: "text", color: "warning", class: "text-theme-warning-text" },
    { variant: "contained", color: "info", class: "bg-theme-info text-theme-info-foreground" },
    { variant: "outlined", color: "info", class: "border-theme-info text-theme-info" },
    { variant: "text", color: "info", class: "text-theme-info" },
  ],
  defaultVariants: { variant: "contained", color: "primary", size: "md", radius: "full" },
});
