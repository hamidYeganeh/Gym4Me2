"use client";
import { createContext, useContext, useRef } from "react";
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
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "@repo/ui/kit/Button";
import { XIcon } from "lucide-react";

const ModalDialog = createContext(true);

function Dialog({ modal = true, ...props }: DialogProps) {
  return (
    <ModalDialog.Provider value={modal}>
      <DialogPrimitive.Root data-slot="dialog" modal={modal} {...props} />
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
  ...props
}: DialogContentProps) {
  const t = useTranslations();
  const modal = useContext(ModalDialog);
  const opener = useRef<ActionFocus | null>(null);
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
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
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented || !modal) return;
          const action = opener.current;
          requestAnimationFrame(() => restoreDialogFocus(action));
        }}
      >
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
