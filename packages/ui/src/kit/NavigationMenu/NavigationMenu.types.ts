import type { VariantProps } from "class-variance-authority";
import { NavigationMenu as NavigationMenuPrimitive } from "radix-ui";
import type * as React from "react";
import type { navigationMenuTriggerStyle } from "./NavigationMenu.styles";
export type NavigationMenuProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Root
> & {
  viewport?: boolean;
};

export type NavigationMenuListProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.List
>;

export type NavigationMenuItemProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Item
>;

export type NavigationMenuTriggerProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Trigger
>;

export type NavigationMenuContentProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Content
>;

export type NavigationMenuViewportProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Viewport
>;

export type NavigationMenuLinkProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Link
>;

export type NavigationMenuIndicatorProps = React.ComponentProps<
  typeof NavigationMenuPrimitive.Indicator
>;

export type NavigationMenuVariants = VariantProps<
  typeof navigationMenuTriggerStyle
>;
