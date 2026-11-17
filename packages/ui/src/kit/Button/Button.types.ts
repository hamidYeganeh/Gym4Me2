import type { buttonVariants } from "./Button.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type ButtonVariants = VariantProps<typeof buttonVariants>;

export interface ButtonProps
  extends Omit<ComponentPropsWithRef<"button">, "color">, ButtonVariants {
  asChild?: boolean;
  /** Shows progress while retaining the label and preventing activation. */
  loading?: boolean;
}
