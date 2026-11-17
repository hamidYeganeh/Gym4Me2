import type { badgeVariants } from "./Badge.styles";
import type { ComponentPropsWithRef } from "react";
import type { VariantProps } from "tailwind-variants";

export type BadgeVariants = VariantProps<typeof badgeVariants>;
export type BadgeProps = Omit<ComponentPropsWithRef<"span">, "color"> &
  BadgeVariants & {
    asChild?: boolean;
  };
