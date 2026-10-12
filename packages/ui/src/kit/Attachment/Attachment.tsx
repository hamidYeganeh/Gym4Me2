import { cn } from "@repo/ui/lib/utils";
import { Slot } from "radix-ui";
import {
  attachmentMediaVariants,
  attachmentStyles,
  attachmentVariants,
} from "./Attachment.styles";
import type {
  AttachmentActionProps,
  AttachmentActionsProps,
  AttachmentContentProps,
  AttachmentDescriptionProps,
  AttachmentGroupProps,
  AttachmentMediaProps,
  AttachmentProps,
  AttachmentTitleProps,
  AttachmentTriggerProps,
} from "./Attachment.types";

import { Button } from "@repo/ui/kit/Button";

function Attachment({
  className,
  state = "done",
  size = "default",
  orientation = "horizontal",
  ...props
}: AttachmentProps) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      data-size={size}
      data-orientation={orientation}
      className={cn(attachmentVariants({ size, orientation }), className)}
      {...props}
    />
  );
}

function AttachmentMedia({
  className,
  variant = "icon",
  ...props
}: AttachmentMediaProps) {
  return (
    <div
      data-slot="attachment-media"
      data-variant={variant}
      className={cn(attachmentMediaVariants({ variant }), className)}
      {...props}
    />
  );
}

function AttachmentContent({ className, ...props }: AttachmentContentProps) {
  return (
    <div
      data-slot="attachment-content"
      className={cn(attachmentStyles.attachmentContent(), className)}
      {...props}
    />
  );
}

function AttachmentTitle({ className, ...props }: AttachmentTitleProps) {
  return (
    <span
      data-slot="attachment-title"
      className={cn(attachmentStyles.attachmentTitle(), className)}
      {...props}
    />
  );
}

function AttachmentDescription({
  className,
  ...props
}: AttachmentDescriptionProps) {
  return (
    <span
      data-slot="attachment-description"
      className={cn(
        attachmentStyles.attachmentDescription(),
        attachmentStyles.attachmentDescription2(),
        className,
      )}
      {...props}
    />
  );
}

function AttachmentActions({ className, ...props }: AttachmentActionsProps) {
  return (
    <div
      data-slot="attachment-actions"
      className={cn(attachmentStyles.attachmentActions(), className)}
      {...props}
    />
  );
}

function AttachmentAction({
  className,
  variant,
  size = "icon-xs",
  ...props
}: AttachmentActionProps) {
  return (
    <Button
      data-slot="attachment-action"
      variant={variant ?? "ghost"}
      size={size}
      className={cn(className)}
      {...props}
    />
  );
}

function AttachmentTrigger({
  className,
  asChild = false,
  type,
  ...props
}: AttachmentTriggerProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="attachment-trigger"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(attachmentStyles.attachmentTrigger(), className)}
      {...props}
    />
  );
}

function AttachmentGroup({ className, ...props }: AttachmentGroupProps) {
  return (
    <div
      data-slot="attachment-group"
      className={cn(attachmentStyles.attachmentGroup(), className)}
      {...props}
    />
  );
}

export {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
};
