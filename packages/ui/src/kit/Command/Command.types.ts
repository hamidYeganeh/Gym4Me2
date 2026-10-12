import { Dialog } from "@repo/ui/kit/Dialog";
import type { VariantProps } from "class-variance-authority";
import { Command as CommandPrimitive } from "cmdk";
import type * as React from "react";
import type { commandVariants } from "./Command.styles";
export type CommandProps = React.ComponentProps<typeof CommandPrimitive>;

export type CommandDialogProps = React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
};

export type CommandInputProps = React.ComponentProps<
  typeof CommandPrimitive.Input
>;

export type CommandListProps = React.ComponentProps<
  typeof CommandPrimitive.List
>;

export type CommandEmptyProps = React.ComponentProps<
  typeof CommandPrimitive.Empty
>;

export type CommandGroupProps = React.ComponentProps<
  typeof CommandPrimitive.Group
>;

export type CommandSeparatorProps = React.ComponentProps<
  typeof CommandPrimitive.Separator
>;

export type CommandItemProps = React.ComponentProps<
  typeof CommandPrimitive.Item
>;

export type CommandShortcutProps = React.ComponentProps<"span">;

export type CommandVariants = VariantProps<typeof commandVariants>;
