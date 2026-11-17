"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerTitleProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerTitle: FC<AnimatedDrawerTitleProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Title
      data-slot="drawer-title"
      className={primitiveClassName(drawerSlots({}).title(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerTitle;
