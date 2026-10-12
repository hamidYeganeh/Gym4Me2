"use client";
import { tabsListVariants, tabsStyles } from "./Tabs.styles";
import type {
  TabsContentProps,
  TabsListProps,
  TabsProps,
  TabsTriggerProps,
} from "./Tabs.types";

import { cn } from "@repo/ui/lib/utils";
import { Tabs as TabsPrimitive } from "radix-ui";

function Tabs({ className, orientation = "horizontal", ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(tabsStyles.tabs(), className)}
      {...props}
    />
  );
}

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        tabsStyles.tabsTrigger(),
        tabsStyles.tabsTrigger2(),
        tabsStyles.tabsTrigger3(),
        tabsStyles.tabsTrigger4(),
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(tabsStyles.tabsContent(), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
