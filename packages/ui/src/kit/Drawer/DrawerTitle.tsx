"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerTitleProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerTitle: FC<DrawerTitleProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Title
      data-slot="drawer-title"
      className={primitiveClassName(drawerSlots({}).title(), className)}
      {...rest}
    />
  );
};
export default DrawerTitle;
