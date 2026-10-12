import { cva } from "class-variance-authority";
export const messageVariants = cva("");

export const messageStyles = {
  messageGroup: cva("flex min-w-0 flex-col gap-2"),
  message: cva(
    "group/message relative flex w-full min-w-0 gap-2 text-sm data-[align=end]:flex-row-reverse",
  ),
  messageAvatar: cva(
    "flex w-fit min-w-8 shrink-0 items-center justify-center self-end overflow-hidden rounded-full bg-muted group-has-data-[slot=message-footer]/message:-translate-y-8",
  ),
  messageContent: cva(
    "flex w-full min-w-0 flex-col gap-2.5 wrap-break-word group-data-[align=end]/message:*:data-slot:self-end",
  ),
  messageHeader: cva(
    "flex max-w-full min-w-0 items-center px-3.5 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0",
  ),
  messageFooter: cva(
    "flex max-w-full min-w-0 items-center px-3.5 text-xs font-medium text-muted-foreground group-has-data-[variant=ghost]/message:px-0 group-data-[align=end]/message:justify-end",
  ),
};
