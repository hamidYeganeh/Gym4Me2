"use client";

import { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";

import type { AnimatedSelectItemProps } from "./AnimatedSelect.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { selectItemVariants } from "./AnimatedSelect.styles";

const AnimatedSelectItem: FC<AnimatedSelectItemProps> = (props) => {
  const { className, size, radius, ...rest } = props;

  return (
    <Primitive.Item
      data-slot="select-item"
      className={primitiveClassName(selectItemVariants({ size, radius }), className)}
      {...rest}
    />
  );
};

export default AnimatedSelectItem;
