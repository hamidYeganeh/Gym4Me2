import type { Tabs as Primitive } from "@base-ui/react/tabs";
import type { ComponentPropsWithRef } from "react";

export type TabsProps = ComponentPropsWithRef<typeof Primitive.Root>;
export type TabsListProps = ComponentPropsWithRef<typeof Primitive.List>;
export type TabsTriggerProps = ComponentPropsWithRef<typeof Primitive.Tab>;
export type TabsContentProps = ComponentPropsWithRef<typeof Primitive.Panel>;
export type TabsIndicatorProps = ComponentPropsWithRef<typeof Primitive.Indicator>;
