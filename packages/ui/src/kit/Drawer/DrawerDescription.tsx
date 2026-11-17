"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerDescriptionProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerDescription: FC<DrawerDescriptionProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Description
      data-slot="drawer-description"
      className={primitiveClassName(drawerSlots({}).description(), className)}
      {...rest}
    />
  );
};
export default DrawerDescription;
