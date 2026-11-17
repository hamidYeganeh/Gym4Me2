"use client";

import { Drawer as Primitive } from "@animate-ui/react/primitives/base-ui/drawer";

import type { AnimatedDrawerPopupProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../../lib/primitive-classname";
import { drawerSlots } from "./AnimatedDrawer.styles";

const AnimatedDrawerPopup: FC<AnimatedDrawerPopupProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Popup
      data-slot="drawer-popup"
      className={primitiveClassName(drawerSlots({}).popup(), className)}
      {...rest}
    />
  );
};
export default AnimatedDrawerPopup;
