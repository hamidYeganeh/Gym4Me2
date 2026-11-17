"use client";

import type { AnimatedSheetContentProps } from "./AnimatedSheet.types";
import type { FC } from "react";

import AnimatedSheetOverlay from "./AnimatedSheetOverlay";
import AnimatedSheetPopup from "./AnimatedSheetPopup";
import AnimatedSheetPortal from "./AnimatedSheetPortal";
import AnimatedSheetViewport from "./AnimatedSheetViewport";

const AnimatedSheetContent: FC<AnimatedSheetContentProps> = (props) => {
  const { portalProps, overlayProps, viewportProps, ...rest } = props;
  return (
    <AnimatedSheetPortal {...portalProps}>
      <AnimatedSheetOverlay {...overlayProps} />
      <AnimatedSheetViewport {...viewportProps}>
        <AnimatedSheetPopup {...rest} />
      </AnimatedSheetViewport>
    </AnimatedSheetPortal>
  );
};
export default AnimatedSheetContent;
