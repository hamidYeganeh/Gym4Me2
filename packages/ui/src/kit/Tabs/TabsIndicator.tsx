"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";

import type { TabsIndicatorProps } from "./Tabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { tabsSlots } from "./Tabs.styles";

const TabsIndicator: FC<TabsIndicatorProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Indicator
      data-slot="tabs-indicator"
      className={primitiveClassName(tabsSlots({}).indicator(), className)}
      {...rest}
    />
  );
};
export default TabsIndicator;
