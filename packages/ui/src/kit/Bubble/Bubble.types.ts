import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { bubbleReactionsVariants, bubbleVariants } from "./Bubble.styles";
export type BubbleGroupProps = React.ComponentProps<"div">;

export type BubbleProps = React.ComponentProps<"div"> &
  VariantProps<typeof bubbleVariants> & {
    align?: "start" | "end";
  };

export type BubbleContentProps = React.ComponentProps<"div"> & {
  asChild?: boolean;
};

export type BubbleReactionsProps = React.ComponentProps<"div"> & {
  align?: "start" | "end";
  side?: "top" | "bottom";
};

export type BubbleVariants = VariantProps<typeof bubbleVariants>;

export type BubbleReactionsVariants = VariantProps<
  typeof bubbleReactionsVariants
>;
