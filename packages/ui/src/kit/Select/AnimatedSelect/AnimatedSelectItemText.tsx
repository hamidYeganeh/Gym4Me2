"use client";

import { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";

import type { AnimatedSelectItemTextProps } from "./AnimatedSelect.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { selectItemTextVariants } from "./AnimatedSelect.styles";

const AnimatedSelectItemText: FC<AnimatedSelectItemTextProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.ItemText
      data-slot="select-item-text"
      className={primitiveClassName(selectItemTextVariants({}), className)}
      {...rest}
    />
  );
};

export default AnimatedSelectItemText;
