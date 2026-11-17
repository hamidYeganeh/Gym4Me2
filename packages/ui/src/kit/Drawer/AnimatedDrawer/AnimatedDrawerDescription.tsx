"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerDescriptionProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerDescription: FC<AnimatedDrawerDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Description
      data-slot="drawer-description"
      className={primitiveClassName(drawerSlots({}).description(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerDescription;
