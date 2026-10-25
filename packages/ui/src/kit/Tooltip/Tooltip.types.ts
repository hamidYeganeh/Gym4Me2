import type { VariantProps } from "class-variance-authority";
import { Tooltip as TooltipPrimitive } from "@animate-ui/react/primitives/radix-ui";
import type * as React from "react";
import type { tooltipVariants } from "./Tooltip.styles";
export type TooltipProviderProps = React.ComponentProps<
  typeof TooltipPrimitive.Provider
>;

export type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>;

export type TooltipTriggerProps = React.ComponentProps<
  typeof TooltipPrimitive.Trigger
>;

export type TooltipContentProps = React.ComponentProps<
  typeof TooltipPrimitive.Content
>;

export type TooltipVariants = VariantProps<typeof tooltipVariants>;
