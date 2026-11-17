import type { checkboxIndicatorVariants, checkboxVariants } from "./Checkbox.styles";
import type { Checkbox as Primitive } from "@base-ui/react/checkbox";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type CheckboxVariants = VariantProps<typeof checkboxVariants>;

export type CheckboxProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Root>,
  keyof CheckboxVariants
> &
  CheckboxVariants;

export type CheckboxIndicatorVariants = VariantProps<typeof checkboxIndicatorVariants>;

export type CheckboxIndicatorProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Indicator>,
  keyof CheckboxIndicatorVariants
> &
  CheckboxIndicatorVariants;
