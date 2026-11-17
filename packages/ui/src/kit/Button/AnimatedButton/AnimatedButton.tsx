"use client";

import { Button as ButtonPrimitive } from "@animate-ui/react/primitives/buttons/button";
import { isMotionValue, motion } from "motion/react";

import type { AnimatedButtonProps } from "./AnimatedButton.types";
import type { FC, ReactElement, ReactNode } from "react";

import { buttonContent } from "../Button.utils";
import { buttonVariants } from "./AnimatedButton.styles";

const AnimatedButton: FC<AnimatedButtonProps> = (props) => {
  const {
    className,
    variant,
    color,
    size,
    radius,
    shadow,
    iconOnly,
    fullWidth,
    children,
    disabled,
    loading = false,
    asChild = false,
    type,
    ...rest
  } = props;

  const content = buttonContent(
    isMotionValue(children) ? <motion.span>{children}</motion.span> : (children as ReactNode),
    asChild,
    Boolean(disabled || loading),
    loading,
  );
  const shared = {
    "data-slot": "button",
    className: buttonVariants({
      variant,
      color,
      size,
      radius,
      shadow,
      iconOnly,
      fullWidth,
      className,
    }),
    type: type ?? (asChild ? undefined : "button"),
    disabled: asChild ? undefined : disabled || loading,
    "aria-disabled": disabled || loading || rest["aria-disabled"] || undefined,
    "aria-busy": loading || rest["aria-busy"] || undefined,
    "data-loading": loading || undefined,
  } as const;

  return asChild ?
      <ButtonPrimitive {...rest} {...shared} asChild>
        {content as ReactElement}
      </ButtonPrimitive>
    : <ButtonPrimitive {...rest} {...shared} asChild={false}>
        {content}
      </ButtonPrimitive>;
};

export default AnimatedButton;
