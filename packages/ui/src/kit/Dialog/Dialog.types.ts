import type { VariantProps } from "class-variance-authority";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import type { dialogVariants } from "./Dialog.styles";
export type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

export type DialogTriggerProps = React.ComponentProps<
  typeof DialogPrimitive.Trigger
>;

export type DialogPortalProps = React.ComponentProps<
  typeof DialogPrimitive.Portal
>;

export type DialogCloseProps = React.ComponentProps<
  typeof DialogPrimitive.Close
>;

export type DialogOverlayProps = React.ComponentProps<
  typeof DialogPrimitive.Overlay
>;

export type DialogContentProps = React.ComponentProps<
  typeof DialogPrimitive.Content
> & {
  showCloseButton?: boolean;
};

export type DialogHeaderProps = React.ComponentProps<"div">;

export type DialogFooterProps = React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
};

export type DialogTitleProps = React.ComponentProps<
  typeof DialogPrimitive.Title
>;

export type DialogDescriptionProps = React.ComponentProps<
  typeof DialogPrimitive.Description
>;

export type DialogVariants = VariantProps<typeof dialogVariants>;
