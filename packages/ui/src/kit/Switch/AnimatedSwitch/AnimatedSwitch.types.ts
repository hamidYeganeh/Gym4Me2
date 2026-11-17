import type { switchThumbVariants, switchVariants } from "./AnimatedSwitch.styles";
import type { Switch as Primitive } from "@animate-ui/react/primitives/base-ui/switch";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type AnimatedSwitchVariants = VariantProps<typeof switchVariants>;

export type AnimatedSwitchProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Root>,
  keyof AnimatedSwitchVariants
> &
  AnimatedSwitchVariants;

export type AnimatedSwitchThumbVariants = VariantProps<typeof switchThumbVariants>;

export type AnimatedSwitchThumbProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Thumb>,
  keyof AnimatedSwitchThumbVariants
> &
  AnimatedSwitchThumbVariants;
