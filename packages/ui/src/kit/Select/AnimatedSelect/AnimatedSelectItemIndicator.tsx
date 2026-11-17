"use client";

import { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";

import type { AnimatedSelectItemIndicatorProps } from "./AnimatedSelect.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { selectItemIndicatorVariants } from "./AnimatedSelect.styles";

const AnimatedSelectItemIndicator: FC<AnimatedSelectItemIndicatorProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.ItemIndicator
      data-slot="select-item-indicator"
      className={primitiveClassName(selectItemIndicatorVariants({}), className)}
      {...rest}
    />
  );
};

export default AnimatedSelectItemIndicator;
