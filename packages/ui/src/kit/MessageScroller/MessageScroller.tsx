"use client";
import { useTranslations } from "@repo/i18n";
import { messageScrollerStyles } from "./MessageScroller.styles";
import type {
  MessageScrollerButtonProps,
  MessageScrollerContentProps,
  MessageScrollerItemProps,
  MessageScrollerProps,
  MessageScrollerProviderProps,
  MessageScrollerViewportProps,
} from "./MessageScroller.types";

import { cn } from "@repo/ui/lib/utils";
import {
  MessageScroller as MessageScrollerPrimitive,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
} from "@shadcn/react/message-scroller";

import { Button } from "@repo/ui/kit/Button";
import { ArrowDownIcon } from "lucide-react";

function MessageScrollerProvider(props: MessageScrollerProviderProps) {
  return <MessageScrollerPrimitive.Provider {...props} />;
}

function MessageScroller({ className, ...props }: MessageScrollerProps) {
  return (
    <MessageScrollerPrimitive.Root
      data-slot="message-scroller"
      className={cn(messageScrollerStyles.messageScroller(), className)}
      {...props}
    />
  );
}

function MessageScrollerViewport({
  className,
  ...props
}: MessageScrollerViewportProps) {
  return (
    <MessageScrollerPrimitive.Viewport
      data-slot="message-scroller-viewport"
      className={cn(messageScrollerStyles.messageScrollerViewport(), className)}
      {...props}
    />
  );
}

function MessageScrollerContent({
  className,
  ...props
}: MessageScrollerContentProps) {
  return (
    <MessageScrollerPrimitive.Content
      data-slot="message-scroller-content"
      className={cn(messageScrollerStyles.messageScrollerContent(), className)}
      {...props}
    />
  );
}

function MessageScrollerItem({
  className,
  scrollAnchor = false,
  ...props
}: MessageScrollerItemProps) {
  return (
    <MessageScrollerPrimitive.Item
      data-slot="message-scroller-item"
      scrollAnchor={scrollAnchor}
      className={cn(messageScrollerStyles.messageScrollerItem(), className)}
      {...props}
    />
  );
}

function MessageScrollerButton({
  direction = "end",
  className,
  children,
  render,
  variant = "secondary",
  size = "icon-sm",
  ...props
}: MessageScrollerButtonProps) {
  const t = useTranslations();
  return (
    <MessageScrollerPrimitive.Button
      data-slot="message-scroller-button"
      data-direction={direction}
      data-variant={variant}
      data-size={size}
      direction={direction}
      className={cn(messageScrollerStyles.messageScrollerButton(), className)}
      render={render ?? <Button variant={variant} size={size} />}
      {...props}
    >
      {children ?? (
        <>
          <ArrowDownIcon />
          <span className={messageScrollerStyles.messageScrollerButton2()}>
            {direction === "end"
              ? t("Kit.scrollToEnd")
              : t("Kit.scrollToStart")}
          </span>
        </>
      )}
    </MessageScrollerPrimitive.Button>
  );
}

export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
  useMessageScrollerScrollable,
  useMessageScrollerVisibility,
};
