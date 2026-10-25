import type { VariantProps } from "class-variance-authority";
import { ContextMenu as ContextMenuPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { contextMenuVariants } from "./ContextMenu.styles";
export type ContextMenuProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Root
>;

export type ContextMenuTriggerProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Trigger
>;

export type ContextMenuGroupProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Group
>;

export type ContextMenuPortalProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Portal
>;

export type ContextMenuSubProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Sub
>;

export type ContextMenuRadioGroupProps = React.ComponentProps<
  typeof ContextMenuPrimitive.RadioGroup
>;

export type ContextMenuContentProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Content
> & {
  side?: "top" | "right" | "bottom" | "left";
};

export type ContextMenuItemProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Item
> & {
  inset?: boolean;
  variant?: "default" | "destructive";
};

export type ContextMenuSubTriggerProps = React.ComponentProps<
  typeof ContextMenuPrimitive.SubTrigger
> & {
  inset?: boolean;
};

export type ContextMenuSubContentProps = React.ComponentProps<
  typeof ContextMenuPrimitive.SubContent
>;

export type ContextMenuCheckboxItemProps = React.ComponentProps<
  typeof ContextMenuPrimitive.CheckboxItem
> & {
  inset?: boolean;
};

export type ContextMenuRadioItemProps = React.ComponentProps<
  typeof ContextMenuPrimitive.RadioItem
> & {
  inset?: boolean;
};

export type ContextMenuLabelProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Label
> & {
  inset?: boolean;
};

export type ContextMenuSeparatorProps = React.ComponentProps<
  typeof ContextMenuPrimitive.Separator
>;

export type ContextMenuShortcutProps = React.ComponentProps<"span">;

export type ContextMenuVariants = VariantProps<typeof contextMenuVariants>;
