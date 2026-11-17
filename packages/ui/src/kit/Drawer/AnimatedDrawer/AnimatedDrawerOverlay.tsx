"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerOverlayProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerOverlay: FC<AnimatedDrawerOverlayProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Backdrop
      data-slot="drawer-overlay"
      className={primitiveClassName(drawerSlots({}).overlay(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerOverlay;
