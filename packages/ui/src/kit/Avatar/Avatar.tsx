"use client";
import { avatarStyles } from "./Avatar.styles";
import type {
  AvatarBadgeProps,
  AvatarFallbackProps,
  AvatarGroupCountProps,
  AvatarGroupProps,
  AvatarImageProps,
  AvatarProps,
} from "./Avatar.types";

import { cn } from "@repo/ui/lib/utils";
import { Avatar as AvatarPrimitive } from "radix-ui";

function Avatar({ className, size = "default", ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(avatarStyles.avatar(), className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(avatarStyles.avatarImage(), className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(avatarStyles.avatarFallback(), className)}
      {...props}
    />
  );
}

function AvatarBadge({ className, ...props }: AvatarBadgeProps) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        avatarStyles.avatarBadge(),
        avatarStyles.avatarBadge2(),
        avatarStyles.avatarBadge3(),
        avatarStyles.avatarBadge4(),
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: AvatarGroupProps) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(avatarStyles.avatarGroup(), className)}
      {...props}
    />
  );
}

function AvatarGroupCount({ className, ...props }: AvatarGroupCountProps) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(avatarStyles.avatarGroupCount(), className)}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
};
