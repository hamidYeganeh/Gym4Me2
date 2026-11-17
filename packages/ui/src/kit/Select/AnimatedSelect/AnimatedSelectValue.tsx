"use client";

import { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";

import type { AnimatedSelectValueProps } from "./AnimatedSelect.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { selectValueVariants } from "./AnimatedSelect.styles";

const AnimatedSelectValue: FC<AnimatedSelectValueProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.Value
      data-slot="select-value"
      className={primitiveClassName(selectValueVariants({}), className)}
      {...rest}
    />
  );
};

export default AnimatedSelectValue;
