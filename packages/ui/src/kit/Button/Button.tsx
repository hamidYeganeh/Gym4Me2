"use client";

import { Slot } from "@radix-ui/react-slot";

import type { ButtonProps } from "./Button.types";
import type { FC } from "react";

import { buttonVariants } from "./Button.styles";
import { buttonContent } from "./Button.utils";

export const Button: FC<ButtonProps> = (props) => {
  const {
    className,
    variant,
    color,
    size,
    radius,
    shadow,
    iconOnly,
    asChild = false,
    ref,
    children,
    disabled,
    loading = false,
    type,
    fullWidth,
    ...rest
  } = props;
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={buttonVariants({
        variant,
        color,
        size,
        radius,
        shadow,
        iconOnly,
        fullWidth,
        className,
      })}
      ref={ref}
      {...rest}
      type={type ?? (asChild ? undefined : "button")}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={disabled || loading || rest["aria-disabled"] || undefined}
      aria-busy={loading || rest["aria-busy"] || undefined}
      data-loading={loading || undefined}
    >
      {buttonContent(children, asChild, Boolean(disabled || loading), loading)}
    </Comp>
  );
};

export default Button;
