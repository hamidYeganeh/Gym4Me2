"use client";

import { Switch as Primitive } from "@base-ui/react/switch";

import type { SwitchProps } from "./Switch.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { switchVariants } from "./Switch.styles";

const Switch: FC<SwitchProps> = (props) => {
  const { className, size, color, radius, ...rest } = props;

  return (
    <Primitive.Root
      data-slot="switch-root"
      className={primitiveClassName(switchVariants({ size, color, radius }), className)}
      {...rest}
    />
  );
};

export default Switch;
