"use client";

import { Switch as Primitive } from "@animate-ui/react/primitives/base-ui/switch";

import type { AnimatedSwitchThumbProps } from "./AnimatedSwitch.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { switchThumbVariants } from "./AnimatedSwitch.styles";

const AnimatedSwitchThumb: FC<AnimatedSwitchThumbProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.Thumb
      data-slot="switch-thumb"
      className={primitiveClassName(switchThumbVariants({}), className)}
      {...rest}
    />
  );
};

export default AnimatedSwitchThumb;
