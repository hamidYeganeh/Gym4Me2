import { cn } from "tailwind-variants";

import type { ClassProp, VariantProps } from "tailwind-variants";

import { tv } from "../../lib/variants";

export const selectSlots = tv({
  slots: {
    item: cn(
      cn(
        "flex cursor-default items-center text-theme-body2 font-theme-medium outline-none select-none",
        "data-highlighted:bg-theme-primary data-highlighted:text-theme-primary-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
      ),
      "justify-between",
    ),
    itemIndicator: cn("inline-flex size-theme-4 shrink-0 items-center justify-center"),
    itemText: cn("min-w-0 flex-1"),
    popup: cn(
      "z-50 max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto",
      "origin-(--transform-origin) border border-theme-border bg-theme-popover text-theme-popover-foreground",
      "p-theme-1 outline-none",
    ),
    trigger: cn(
      "inline-flex min-w-theme-40 items-center justify-between border border-theme-input bg-theme-background",
      "text-theme-body2 font-theme-medium outline-none theme-motion-colors focus-visible:ring-2",
      "data-disabled:pointer-events-none data-disabled:opacity-50 data-placeholder:text-theme-muted-foreground",
    ),
    value: cn("truncate text-start"),
  },
  variants: {
    color: {
      neutral: { trigger: "focus-visible:ring-theme-foreground" },
      primary: { trigger: "focus-visible:ring-theme-primary" },
      secondary: { trigger: "focus-visible:ring-theme-secondary" },
      error: { trigger: "focus-visible:ring-theme-error" },
      success: { trigger: "focus-visible:ring-theme-success" },
      warning: { trigger: "focus-visible:ring-theme-warning" },
      info: { trigger: "focus-visible:ring-theme-info" },
    },
    radius: {
      none: {
        item: "rounded-theme-none",
        popup: "rounded-theme-none",
        trigger: "rounded-theme-none",
      },
      xs: { item: "rounded-theme-xs", popup: "rounded-theme-xs", trigger: "rounded-theme-xs" },
      sm: { item: "rounded-theme-sm", popup: "rounded-theme-sm", trigger: "rounded-theme-sm" },
      md: { item: "rounded-theme-md", popup: "rounded-theme-md", trigger: "rounded-theme-md" },
      lg: { item: "rounded-theme-lg", popup: "rounded-theme-lg", trigger: "rounded-theme-lg" },
      xl: { item: "rounded-theme-xl", popup: "rounded-theme-xl", trigger: "rounded-theme-xl" },
      "2xl": {
        item: "rounded-theme-2xl",
        popup: "rounded-theme-2xl",
        trigger: "rounded-theme-2xl",
      },
      "3xl": {
        item: "rounded-theme-3xl",
        popup: "rounded-theme-3xl",
        trigger: "rounded-theme-3xl",
      },
      full: {
        item: "rounded-theme-full",
        popup: "rounded-theme-full",
        trigger: "rounded-theme-full",
      },
    },
    size: {
      xs: {
        item: "h-theme-7 px-theme-2 py-theme-1 gap-theme-1 text-theme-caption",
        trigger: "h-theme-7 px-theme-2 py-theme-1 gap-theme-1 text-theme-caption",
      },
      sm: {
        item: "h-theme-8 px-theme-3 py-theme-1-5 gap-theme-1 text-theme-body2",
        trigger: "h-theme-8 px-theme-3 py-theme-1-5 gap-theme-1 text-theme-body2",
      },
      md: {
        item: "h-theme-9 px-theme-4 py-theme-2 gap-theme-2 text-theme-body2",
        trigger: "h-theme-9 px-theme-4 py-theme-2 gap-theme-2 text-theme-body2",
      },
      lg: {
        item: "h-theme-10 px-theme-5 py-theme-2-5 gap-theme-2 text-theme-body1",
        trigger: "h-theme-10 px-theme-5 py-theme-2-5 gap-theme-2 text-theme-body1",
      },
      xl: {
        item: "h-theme-12 px-theme-6 py-theme-3 gap-theme-2 text-theme-body-large",
        trigger: "h-theme-12 px-theme-6 py-theme-3 gap-theme-2 text-theme-body-large",
      },
    },
    shadow: {
      none: { popup: "shadow-theme-none", trigger: "shadow-theme-none" },
      xs: { popup: "shadow-theme-xs", trigger: "shadow-theme-xs" },
      sm: { popup: "shadow-theme-sm", trigger: "shadow-theme-sm" },
      md: { popup: "shadow-theme-md", trigger: "shadow-theme-md" },
      lg: { popup: "shadow-theme-lg", trigger: "shadow-theme-lg" },
      xl: { popup: "shadow-theme-xl", trigger: "shadow-theme-xl" },
    },
  },
});

// Compatibility helpers retain the existing per-part recipe API.
export const selectItemVariants = ({
  size = "md",
  radius = "md",
  class: classValue,
  className,
  ...props
}: Pick<VariantProps<typeof selectSlots>, "size" | "radius"> & ClassProp = {}) =>
  selectSlots({ size, radius, ...props }).item({ className: cn(classValue, className) });
export const selectItemIndicatorVariants = ({
  class: classValue,
  className,
  ...props
}: ClassProp = {}) =>
  selectSlots({ ...props }).itemIndicator({ className: cn(classValue, className) });
export const selectItemTextVariants = ({
  class: classValue,
  className,
  ...props
}: ClassProp = {}) => selectSlots({ ...props }).itemText({ className: cn(classValue, className) });
export const selectPopupVariants = ({
  radius = "md",
  shadow = "md",
  class: classValue,
  className,
  ...props
}: Pick<VariantProps<typeof selectSlots>, "radius" | "shadow"> & ClassProp = {}) =>
  selectSlots({ radius, shadow, ...props }).popup({ className: cn(classValue, className) });
export const selectTriggerVariants = ({
  size = "md",
  color = "primary",
  radius = "md",
  shadow = "none",
  class: classValue,
  className,
  ...props
}: Pick<VariantProps<typeof selectSlots>, "size" | "color" | "radius" | "shadow"> &
  ClassProp = {}) =>
  selectSlots({ size, color, radius, shadow, ...props }).trigger({
    className: cn(classValue, className),
  });
export const selectValueVariants = ({ class: classValue, className, ...props }: ClassProp = {}) =>
  selectSlots({ ...props }).value({ className: cn(classValue, className) });
