"use client";

import { Drawer as Primitive } from "@base-ui/react/drawer";

import type { DrawerPopupProps } from "./Drawer.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { drawerSlots } from "./Drawer.styles";

const DrawerPopup: FC<DrawerPopupProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Popup
      data-slot="drawer-popup"
      className={primitiveClassName(
        drawerSlots({}).popup() +
          " translate-x-(--drawer-swipe-movement-x) translate-y-[calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y,0px))]",
        className,
      )}
      {...rest}
    />
  );
};
export default DrawerPopup;
