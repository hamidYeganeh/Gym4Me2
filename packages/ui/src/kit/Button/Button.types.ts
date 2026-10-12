import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { buttonVariants } from "./Button.styles";
export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export type ButtonVariants = VariantProps<typeof buttonVariants>;
