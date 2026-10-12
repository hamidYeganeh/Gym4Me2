import type { VariantProps } from "class-variance-authority";
import { Avatar as AvatarPrimitive } from "radix-ui";
import type * as React from "react";
import type { avatarVariants } from "./Avatar.styles";
export type AvatarProps = React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "sm" | "lg";
};

export type AvatarImageProps = React.ComponentProps<
  typeof AvatarPrimitive.Image
>;

export type AvatarFallbackProps = React.ComponentProps<
  typeof AvatarPrimitive.Fallback
>;

export type AvatarBadgeProps = React.ComponentProps<"span">;

export type AvatarGroupProps = React.ComponentProps<"div">;

export type AvatarGroupCountProps = React.ComponentProps<"div">;

export type AvatarVariants = VariantProps<typeof avatarVariants>;
