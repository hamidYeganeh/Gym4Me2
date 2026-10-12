import { Button } from "@repo/ui/kit/Button";
import { MessageScroller as MessageScrollerPrimitive } from "@shadcn/react/message-scroller";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { messageScrollerVariants } from "./MessageScroller.styles";
export type MessageScrollerProviderProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Provider
>;

export type MessageScrollerProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Root
>;

export type MessageScrollerViewportProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Viewport
>;

export type MessageScrollerContentProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Content
>;

export type MessageScrollerItemProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Item
>;

export type MessageScrollerButtonProps = React.ComponentProps<
  typeof MessageScrollerPrimitive.Button
> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">;

export type MessageScrollerVariants = VariantProps<
  typeof messageScrollerVariants
>;
