import type { switchThumbVariants, switchVariants } from "./Switch.styles";
import type { Switch as Primitive } from "@base-ui/react/switch";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type SwitchVariants = VariantProps<typeof switchVariants>;

export type SwitchProps = Omit<ComponentPropsWithRef<typeof Primitive.Root>, keyof SwitchVariants> &
  SwitchVariants;

export type SwitchThumbVariants = VariantProps<typeof switchThumbVariants>;

export type SwitchThumbProps = Omit<
  ComponentPropsWithRef<typeof Primitive.Thumb>,
  keyof SwitchThumbVariants
> &
  SwitchThumbVariants;
