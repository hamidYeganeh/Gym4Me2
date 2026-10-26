import type { VariantProps } from "class-variance-authority";
import { Tabs as TabsPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { tabsListVariants } from "./Tabs.styles";
export type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

export type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>;

export type TabsTriggerProps = React.ComponentProps<
  typeof TabsPrimitive.Trigger
>;

export type TabsContentProps = React.ComponentProps<
  typeof TabsPrimitive.Content
>;

export type TabsListVariants = VariantProps<typeof tabsListVariants>;
