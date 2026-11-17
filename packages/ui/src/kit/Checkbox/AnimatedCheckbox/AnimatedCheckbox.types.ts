import type { checkboxIndicatorVariants, checkboxVariants } from "./AnimatedCheckbox.styles";
import type { Checkbox as Primitive } from "@animate-ui/react/primitives/base-ui/checkbox";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type AnimatedCheckboxVariants = VariantProps<typeof checkboxVariants>;

export type AnimatedCheckboxProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Root>,
  keyof AnimatedCheckboxVariants
> &
  AnimatedCheckboxVariants;

export type AnimatedCheckboxIndicatorVariants = VariantProps<typeof checkboxIndicatorVariants>;

export type AnimatedCheckboxIndicatorProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Indicator>,
  keyof AnimatedCheckboxIndicatorVariants
> &
  AnimatedCheckboxIndicatorVariants;
