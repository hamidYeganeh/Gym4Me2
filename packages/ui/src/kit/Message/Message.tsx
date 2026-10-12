import { cn } from "@repo/ui/lib/utils";
import { messageStyles } from "./Message.styles";
import type {
  MessageAvatarProps,
  MessageContentProps,
  MessageFooterProps,
  MessageGroupProps,
  MessageHeaderProps,
  MessageProps,
} from "./Message.types";

function MessageGroup({ className, ...props }: MessageGroupProps) {
  return (
    <div
      data-slot="message-group"
      className={cn(messageStyles.messageGroup(), className)}
      {...props}
    />
  );
}

function Message({ className, align = "start", ...props }: MessageProps) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(messageStyles.message(), className)}
      {...props}
    />
  );
}

function MessageAvatar({ className, ...props }: MessageAvatarProps) {
  return (
    <div
      data-slot="message-avatar"
      className={cn(messageStyles.messageAvatar(), className)}
      {...props}
    />
  );
}

function MessageContent({ className, ...props }: MessageContentProps) {
  return (
    <div
      data-slot="message-content"
      className={cn(messageStyles.messageContent(), className)}
      {...props}
    />
  );
}

function MessageHeader({ className, ...props }: MessageHeaderProps) {
  return (
    <div
      data-slot="message-header"
      className={cn(messageStyles.messageHeader(), className)}
      {...props}
    />
  );
}

function MessageFooter({ className, ...props }: MessageFooterProps) {
  return (
    <div
      data-slot="message-footer"
      className={cn(messageStyles.messageFooter(), className)}
      {...props}
    />
  );
}

export {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
};
