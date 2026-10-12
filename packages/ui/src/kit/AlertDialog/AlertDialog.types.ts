import { Button } from "@repo/ui/kit/Button";
import type { VariantProps } from "class-variance-authority";
import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type * as React from "react";
import type { alertDialogVariants } from "./AlertDialog.styles";
export type AlertDialogProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Root
>;

export type AlertDialogTriggerProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Trigger
>;

export type AlertDialogPortalProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Portal
>;

export type AlertDialogOverlayProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Overlay
>;

export type AlertDialogContentProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Content
> & {
  size?: "default" | "sm";
};

export type AlertDialogHeaderProps = React.ComponentProps<"div">;

export type AlertDialogFooterProps = React.ComponentProps<"div">;

export type AlertDialogMediaProps = React.ComponentProps<"div">;

export type AlertDialogTitleProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Title
>;

export type AlertDialogDescriptionProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Description
>;

export type AlertDialogActionProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Action
> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">;

export type AlertDialogCancelProps = React.ComponentProps<
  typeof AlertDialogPrimitive.Cancel
> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">;

export type AlertDialogVariants = VariantProps<typeof alertDialogVariants>;
