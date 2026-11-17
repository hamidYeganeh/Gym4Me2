"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerCloseProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerClose: FC<DrawerCloseProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Close
      data-slot="drawer-close"
      className={primitiveClassName(drawerSlots({}).close(), className)}
      {...rest}
    />
  );
};
export default DrawerClose;
