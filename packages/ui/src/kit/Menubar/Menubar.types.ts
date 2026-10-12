import type { VariantProps } from "class-variance-authority";
import { Menubar as MenubarPrimitive } from "radix-ui";
import type * as React from "react";
import type { menubarVariants } from "./Menubar.styles";
export type MenubarProps = React.ComponentProps<typeof MenubarPrimitive.Root>;

export type MenubarMenuProps = React.ComponentProps<
  typeof MenubarPrimitive.Menu
>;

export type MenubarGroupProps = React.ComponentProps<
  typeof MenubarPrimitive.Group
>;

export type MenubarPortalProps = React.ComponentProps<
  typeof MenubarPrimitive.Portal
>;

export type MenubarRadioGroupProps = React.ComponentProps<
  typeof MenubarPrimitive.RadioGroup
>;

export type MenubarTriggerProps = React.ComponentProps<
  typeof MenubarPrimitive.Trigger
>;

export type MenubarContentProps = React.ComponentProps<
  typeof MenubarPrimitive.Content
>;

export type MenubarItemProps = React.ComponentProps<
  typeof MenubarPrimitive.Item
> & {
  inset?: boolean;
  variant?: "default" | "destructive";
};

export type MenubarCheckboxItemProps = React.ComponentProps<
  typeof MenubarPrimitive.CheckboxItem
> & {
  inset?: boolean;
};

export type MenubarRadioItemProps = React.ComponentProps<
  typeof MenubarPrimitive.RadioItem
> & {
  inset?: boolean;
};

export type MenubarLabelProps = React.ComponentProps<
  typeof MenubarPrimitive.Label
> & {
  inset?: boolean;
};

export type MenubarSeparatorProps = React.ComponentProps<
  typeof MenubarPrimitive.Separator
>;

export type MenubarShortcutProps = React.ComponentProps<"span">;

export type MenubarSubProps = React.ComponentProps<typeof MenubarPrimitive.Sub>;

export type MenubarSubTriggerProps = React.ComponentProps<
  typeof MenubarPrimitive.SubTrigger
> & {
  inset?: boolean;
};

export type MenubarSubContentProps = React.ComponentProps<
  typeof MenubarPrimitive.SubContent
>;

export type MenubarVariants = VariantProps<typeof menubarVariants>;
