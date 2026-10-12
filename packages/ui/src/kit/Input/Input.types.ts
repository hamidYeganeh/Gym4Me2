import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { inputVariants } from "./Input.styles";
export type InputProps = React.ComponentProps<"input">;

export type InputVariants = VariantProps<typeof inputVariants>;
