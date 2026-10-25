"use client";
import { useTranslations } from "@repo/i18n";
import { createContext, useContext, useRef, useState } from "react";
import { useOverlayReopenFocus } from "../../hooks/use-overlay-reopen-focus";
import { useSheetDrag } from "../../hooks/use-sheet-drag";
import { sheetStyles } from "./Sheet.styles";
import type {
  SheetCloseProps,
  SheetContentProps,
  SheetDescriptionProps,
  SheetFooterProps,
  SheetHeaderProps,
  SheetOverlayProps,
  SheetPortalProps,
  SheetProps,
  SheetTitleProps,
  SheetTriggerProps,
} from "./Sheet.types";

import { cn } from "@repo/ui/lib/utils";
import { Dialog as SheetPrimitive } from "@animate-ui/react/primitives/radix-ui";

import { Button } from "@repo/ui/kit/Button";
import { XIcon } from "lucide-react";

const SheetDismiss = createContext<() => void>(() => undefined);
const SheetOpen = createContext(false);
function Sheet({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...props
}: SheetProps) {
  const [internal, setInternal] = useState(defaultOpen ?? false);
  const change = (next: boolean) => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };
  return (
    <SheetDismiss.Provider value={() => change(false)}>
      <SheetOpen.Provider value={open ?? internal}>
        <SheetPrimitive.Root
          data-slot="sheet"
          {...props}
          open={open ?? internal}
          onOpenChange={change}
        >
          {children}
        </SheetPrimitive.Root>
      </SheetOpen.Provider>
    </SheetDismiss.Provider>
  );
}

function SheetTrigger({ ...props }: SheetTriggerProps) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: SheetCloseProps) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: SheetPortalProps) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(sheetStyles.sheetOverlay(), className)}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...props
}: SheetContentProps) {
  const t = useTranslations();
  const close = useContext(SheetDismiss);
  const open = useContext(SheetOpen);
  const content = useRef<HTMLDivElement | null>(null);
  const openRef = useOverlayReopenFocus(open, content, onOpenAutoFocus);
  const drag = useSheetDrag(close);
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={(node) => {
          content.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetStyles.sheetContent(), className)}
        {...props}
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={(event) => {
          if (openRef.current) {
            event.preventDefault();
            return;
          }
          onCloseAutoFocus?.(event);
        }}
      >
        {side === "bottom" && (
          <button
            type="button"
            className="sheet-grabber"
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
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button
              variant="ghost"
              className={sheetStyles.sheetContent2()}
              size="icon-sm"
            >
              <XIcon />
              <span className={sheetStyles.sheetContent3()}>
                {t("Kit.close")}
              </span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(sheetStyles.sheetHeader(), className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn(sheetStyles.sheetFooter(), className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(sheetStyles.sheetTitle(), className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn(sheetStyles.sheetDescription(), className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
