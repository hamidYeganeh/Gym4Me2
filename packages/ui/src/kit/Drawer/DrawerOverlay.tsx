"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerOverlayProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerOverlay: FC<DrawerOverlayProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Backdrop
      data-slot="drawer-overlay"
      className={primitiveClassName(drawerSlots({}).overlay(), className)}
      {...rest}
    />
  );
};
export default DrawerOverlay;
