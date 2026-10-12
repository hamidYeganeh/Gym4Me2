import { Button } from "@repo/ui/kit/Button";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import type {
  attachmentMediaVariants,
  attachmentVariants,
} from "./Attachment.styles";
export type AttachmentProps = React.ComponentProps<"div"> &
  VariantProps<typeof attachmentVariants> & {
    state?: "idle" | "uploading" | "processing" | "error" | "done";
  };

export type AttachmentMediaProps = React.ComponentProps<"div"> &
  VariantProps<typeof attachmentMediaVariants>;

export type AttachmentContentProps = React.ComponentProps<"div">;

export type AttachmentTitleProps = React.ComponentProps<"span">;

export type AttachmentDescriptionProps = React.ComponentProps<"span">;

export type AttachmentActionsProps = React.ComponentProps<"div">;

export type AttachmentActionProps = React.ComponentProps<typeof Button>;

export type AttachmentTriggerProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
};

export type AttachmentGroupProps = React.ComponentProps<"div">;

export type AttachmentVariants = VariantProps<typeof attachmentVariants>;

export type AttachmentMediaVariants = VariantProps<
  typeof attachmentMediaVariants
>;
