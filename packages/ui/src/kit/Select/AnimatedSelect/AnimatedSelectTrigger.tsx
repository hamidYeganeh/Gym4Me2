"use client";

import { Select as Primitive } from "@animate-ui/react/primitives/base-ui/select";

import type { AnimatedSelectTriggerProps } from "./AnimatedSelect.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { selectTriggerVariants } from "./AnimatedSelect.styles";

const AnimatedSelectTrigger: FC<AnimatedSelectTriggerProps> = (props) => {
  const { className, size, color, radius, shadow, ...rest } = props;

  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={primitiveClassName(
        selectTriggerVariants({ size, color, radius, shadow }),
        className,
      )}
      {...rest}
    />
  );
};

export default AnimatedSelectTrigger;
