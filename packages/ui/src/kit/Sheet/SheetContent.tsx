"use client";

import type { SheetContentProps } from "./Sheet.types";
import type { FC } from "react";

import SheetOverlay from "./SheetOverlay";
import SheetPopup from "./SheetPopup";
import SheetPortal from "./SheetPortal";
import SheetViewport from "./SheetViewport";

const SheetContent: FC<SheetContentProps> = (props) => {
  const { portalProps, overlayProps, viewportProps, ...rest } = props;
  return (
    <SheetPortal {...portalProps}>
      <SheetOverlay {...overlayProps} />
      <SheetViewport {...viewportProps}>
        <SheetPopup {...rest} />
      </SheetViewport>
    </SheetPortal>
  );
};
export default SheetContent;
