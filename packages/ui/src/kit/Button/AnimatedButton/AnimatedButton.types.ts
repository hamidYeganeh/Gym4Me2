import type { ButtonVariants } from "../Button.types";
import type { Button as AnimatedPrimitive } from "@animate-ui/react/primitives/buttons/button";
import type { ComponentPropsWithRef } from "react";

export type AnimatedButtonProps = ComponentPropsWithRef<typeof AnimatedPrimitive> &
  ButtonVariants & {
    loading?: boolean;
  };
