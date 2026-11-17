"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerCloseProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerClose: FC<AnimatedDrawerCloseProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Close
      data-slot="drawer-close"
      className={primitiveClassName(drawerSlots({}).close(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerClose;
