import type { VariantProps } from "class-variance-authority";
import type { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";
import type { inputVariants } from "./Input.styles";
export type InputProps = Omit<
  InputPrimitive.Props,
  "ref" | "className" | "style"
> &
  Pick<React.ComponentProps<"input">, "ref" | "className" | "style">;

export type InputVariants = VariantProps<typeof inputVariants>;
