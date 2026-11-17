"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerViewportProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerViewport: FC<DrawerViewportProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Viewport
      data-slot="drawer-viewport"
      className={primitiveClassName(drawerSlots({}).viewport(), className)}
      {...rest}
    />
  );
};
export default DrawerViewport;
