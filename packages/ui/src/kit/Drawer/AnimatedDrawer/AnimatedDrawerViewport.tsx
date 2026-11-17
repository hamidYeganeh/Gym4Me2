"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerViewportProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerViewport: FC<AnimatedDrawerViewportProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Viewport
      data-slot="drawer-viewport"
      className={primitiveClassName(drawerSlots({}).viewport(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerViewport;
