import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type { messageVariants } from "./Message.styles";
export type MessageGroupProps = React.ComponentProps<"div">;

export type MessageProps = React.ComponentProps<"div"> & {
  align?: "start" | "end";
};

export type MessageAvatarProps = React.ComponentProps<"div">;

export type MessageContentProps = React.ComponentProps<"div">;

export type MessageHeaderProps = React.ComponentProps<"div">;

export type MessageFooterProps = React.ComponentProps<"div">;

export type MessageVariants = VariantProps<typeof messageVariants>;
