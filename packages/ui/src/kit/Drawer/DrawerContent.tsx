"use client";

import type { DrawerContentProps } from "./Drawer.types";
import type { FC } from "react";

import DrawerOverlay from "./DrawerOverlay";
import DrawerPopup from "./DrawerPopup";
import DrawerPortal from "./DrawerPortal";
import DrawerViewport from "./DrawerViewport";

const DrawerContent: FC<DrawerContentProps> = (props) => {
  const { portalProps, overlayProps, viewportProps, ...rest } = props;
  return (
    <DrawerPortal {...portalProps}>
      <DrawerOverlay {...overlayProps} />
      <DrawerViewport {...viewportProps}>
        <DrawerPopup {...rest} />
      </DrawerViewport>
    </DrawerPortal>
  );
};
export default DrawerContent;
