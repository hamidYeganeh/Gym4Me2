"use client";

import { Tabs as Primitive } from "@base-ui/react/tabs";

import type { TabsContentProps } from "./Tabs.types";
import type { FC } from "react";

import { primitiveClassName } from "../../lib/primitive-classname";
import { tabsSlots } from "./Tabs.styles";

const TabsContent: FC<TabsContentProps> = (props) => {
  const { className, ...rest } = props;
  return (
    <Primitive.Panel
      data-slot="tabs-content"
      className={primitiveClassName(tabsSlots({}).content(), className)}
      {...rest}
    />
  );
};
export default TabsContent;
