"use client";

import { Slot } from "@radix-ui/react-slot";

import type { BadgeProps } from "./Badge.types";
import type { FC } from "react";

import { badgeVariants } from "./Badge.styles";

const Badge: FC<BadgeProps> = (props) => {
  const { className, variant, color, size, radius, shadow, asChild = false, ...rest } = props;
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={badgeVariants({ variant, color, size, radius, shadow, className })}
      {...rest}
    />
  );
};

export default Badge;
