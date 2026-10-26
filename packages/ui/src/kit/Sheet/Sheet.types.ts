import type { VariantProps } from "class-variance-authority";
import { Dialog as SheetPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { sheetVariants } from "./Sheet.styles";
export type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>;

export type SheetTriggerProps = React.ComponentProps<
  typeof SheetPrimitive.Trigger
>;

export type SheetCloseProps = React.ComponentProps<typeof SheetPrimitive.Close>;

export type SheetPortalProps = React.ComponentProps<
  typeof SheetPrimitive.Portal
>;

export type SheetOverlayProps = React.ComponentProps<
  typeof SheetPrimitive.Overlay
>;

export type SheetContentProps = React.ComponentProps<
  typeof SheetPrimitive.Content
> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
};

export type SheetHeaderProps = React.ComponentProps<"div">;

export type SheetFooterProps = React.ComponentProps<"div">;

export type SheetTitleProps = React.ComponentProps<typeof SheetPrimitive.Title>;

export type SheetDescriptionProps = React.ComponentProps<
  typeof SheetPrimitive.Description
>;

export type SheetVariants = VariantProps<typeof sheetVariants>;
