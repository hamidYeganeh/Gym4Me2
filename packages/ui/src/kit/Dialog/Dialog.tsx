"use client";
import { createContext, useContext, useRef, useState } from "react";
import { useOverlayHistory } from "../../hooks/use-overlay-history";
import { useSheetDrag } from "../../hooks/use-sheet-drag";
import { useIsMobile } from "../../hooks/use-mobile";
import { useOverlayReopenFocus } from "../../hooks/use-overlay-reopen-focus";
import { useTranslations } from "@repo/i18n";
import { restoreDialogFocus } from "../../lib/dialog-focus";
import type { ActionFocus } from "../../lib/action-focus";
import { dialogStyles } from "./Dialog.styles";
import type {
  DialogCloseProps,
  DialogContentProps,
  DialogDescriptionProps,
  DialogFooterProps,
  DialogHeaderProps,
  DialogOverlayProps,
  DialogPortalProps,
  DialogProps,
  DialogTitleProps,
  DialogTriggerProps,
} from "./Dialog.types";

import { cn } from "@repo/ui/lib/utils";
import { Dialog as DialogPrimitive } from "@animate-ui/react/primitives/radix-ui";

import { Button } from "@repo/ui/kit/Button";
import { XIcon } from "lucide-react";

const ModalDialog = createContext(true);
const DialogOpen = createContext(false);
const DialogDismiss = createContext<() => void>(() => undefined);

function Dialog({
  modal = true,
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: DialogProps) {
  const [internal, setInternal] = useState(defaultOpen ?? false);
  const change = (next: boolean) => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };
  useOverlayHistory(modal && (open ?? internal), change);
  return (
    <ModalDialog.Provider value={modal}>
      <DialogOpen.Provider value={open ?? internal}>
        <DialogDismiss.Provider value={() => change(false)}>
          <DialogPrimitive.Root
            data-slot="dialog"
            modal={modal}
            {...props}
            open={open ?? internal}
            onOpenChange={change}
          >
            {children}
          </DialogPrimitive.Root>
        </DialogDismiss.Provider>
      </DialogOpen.Provider>
    </ModalDialog.Provider>
  );
}

function DialogTrigger({ ...props }: DialogTriggerProps) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPortalProps) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogCloseProps) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(dialogStyles.dialogOverlay(), className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...props
}: DialogContentProps) {
  const t = useTranslations();
  const modal = useContext(ModalDialog);
  const open = useContext(DialogOpen);
  const content = useRef<HTMLDivElement | null>(null);
  const openRef = useOverlayReopenFocus(open, content, onOpenAutoFocus);
  const isMobile = useIsMobile(640);
  const close = useContext(DialogDismiss);
  const drag = useSheetDrag(close);
  const opener = useRef<ActionFocus | null>(null);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          content.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        data-slot="dialog-content"
        data-side={modal && isMobile ? "bottom" : undefined}
        className={cn(dialogStyles.dialogContent(), className)}
        {...props}
        onOpenAutoFocus={(event) => {
          const origin = document.activeElement;
          opener.current =
            origin instanceof HTMLElement && origin !== document.body
              ? {
                  origin,
                  target: () => origin,
                  location:
                    window.location.pathname +
                    window.location.search +
                    window.location.hash,
                }
              : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          if (openRef.current) {
            event.preventDefault();
            return;
          }
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented || !modal) return;
          const action = opener.current;
          requestAnimationFrame(() => restoreDialogFocus(action));
        }}
      >
        {modal && (
          <button
            type="button"
            className="sheet-grabber dialog-grabber"
            aria-label={t("Kit.close")}
            {...drag}
            onClick={(event) => {
              if (event.detail === 0) close();
            }}
          >
            <span aria-hidden="true" />
          </button>
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close data-slot="dialog-close" asChild>
            <Button
              variant="ghost"
              className={dialogStyles.dialogContent2()}
              size="icon-sm"
            >
              <XIcon />
              <span className={dialogStyles.dialogContent3()}>
                {t("Kit.close")}
              </span>
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(dialogStyles.dialogHeader(), className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: DialogFooterProps) {
  const t = useTranslations();
  return (
    <div
      data-slot="dialog-footer"
      className={cn(dialogStyles.dialogFooter(), className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">{t("Kit.close")}</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(dialogStyles.dialogTitle(), className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(dialogStyles.dialogDescription(), className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
