import type { VariantProps } from "class-variance-authority";
import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import type * as React from "react";
import type { scrollAreaVariants } from "./ScrollArea.styles";
export type ScrollAreaProps = React.ComponentProps<
  typeof ScrollAreaPrimitive.Root
>;

export type ScrollBarProps = React.ComponentProps<
  typeof ScrollAreaPrimitive.ScrollAreaScrollbar
>;

export type ScrollAreaVariants = VariantProps<typeof scrollAreaVariants>;
