import type { inputVariants } from "./Input.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type InputVariants = VariantProps<typeof inputVariants>;

export type InputProps = Omit<ComponentPropsWithRef<"input">, "color" | "size"> &
  InputVariants & {
    /** Native HTML input width in characters. */
    htmlSize?: number;
  };
