"use client";

import { Switch as Primitive } from "@base-ui/react/switch";

import type { SwitchThumbProps } from "./Switch.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { switchThumbVariants } from "./Switch.styles";

const SwitchThumb: FC<SwitchThumbProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Primitive.Thumb
      data-slot="switch-thumb"
      className={primitiveClassName(switchThumbVariants({}), className)}
      {...rest}
    />
  );
};

export default SwitchThumb;
