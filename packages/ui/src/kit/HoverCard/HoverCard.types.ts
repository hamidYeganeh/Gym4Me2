import type { VariantProps } from "class-variance-authority";
import { HoverCard as HoverCardPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { hoverCardVariants } from "./HoverCard.styles";
export type HoverCardProps = React.ComponentProps<
  typeof HoverCardPrimitive.Root
>;

export type HoverCardTriggerProps = React.ComponentProps<
  typeof HoverCardPrimitive.Trigger
>;

export type HoverCardContentProps = React.ComponentProps<
  typeof HoverCardPrimitive.Content
>;

export type HoverCardVariants = VariantProps<typeof hoverCardVariants>;
