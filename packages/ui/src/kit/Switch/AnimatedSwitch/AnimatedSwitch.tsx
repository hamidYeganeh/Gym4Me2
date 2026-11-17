"use client";

import { Switch as Primitive } from "@animate-ui/react/primitives/base-ui/switch";

import type { AnimatedSwitchProps } from "./AnimatedSwitch.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { switchVariants } from "./AnimatedSwitch.styles";

const AnimatedSwitch: FC<AnimatedSwitchProps> = (props) => {
  const { className, size, color, radius, ...rest } = props;

  return (
    <Primitive.Root
      data-slot="switch-root"
      className={primitiveClassName(switchVariants({ size, color, radius }), className)}
      {...rest}
    />
  );
};

export default AnimatedSwitch;
