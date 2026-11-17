"use client";

import type { AnimatedDrawerContentProps } from "./AnimatedDrawer.types";
import type { FC } from "react";

import AnimatedDrawerOverlay from "./AnimatedDrawerOverlay";
import AnimatedDrawerPopup from "./AnimatedDrawerPopup";
import AnimatedDrawerPortal from "./AnimatedDrawerPortal";
import AnimatedDrawerViewport from "./AnimatedDrawerViewport";

const AnimatedDrawerContent: FC<AnimatedDrawerContentProps> = (props) => {
  const { portalProps, overlayProps, viewportProps, ...rest } = props;
  return (
    <AnimatedDrawerPortal {...portalProps}>
      <AnimatedDrawerOverlay {...overlayProps} />
      <AnimatedDrawerViewport {...viewportProps}>
        <AnimatedDrawerPopup {...rest} />
      </AnimatedDrawerViewport>
    </AnimatedDrawerPortal>
  );
};
export default AnimatedDrawerContent;
