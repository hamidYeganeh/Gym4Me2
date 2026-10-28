"use client";
import { useTranslations } from "@repo/i18n";
import { useOverlayHistory } from "@repo/ui/hooks/use-overlay-history";
import { CloseXIcon as X } from "@repo/ui/icons";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/kit/Sheet";
import { restoreOverlayFocus } from "@repo/ui/lib/active-surface";
import { useRef, type ReactNode } from "react";
/** Focus trap, escape, keyboard-safe scrolling and native back share one dismissal. */
export function LumaSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const t = useTranslations();
  const trigger = useRef<HTMLElement | null>(null);
  useOverlayHistory(open, onOpenChange);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="luma-sheet"
        onOpenAutoFocus={() => {
          trigger.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreOverlayFocus(trigger.current);
        }}
      >
        <SheetHeader className="pt-4">
          <SheetTitle className="pe-12 min-h-11 flex items-center">
            {title}
          </SheetTitle>
          <SheetDescription>{description ?? title}</SheetDescription>
        </SheetHeader>
        <div className="luma-sheet-body">{children}</div>
        <SheetClose asChild>
          <button
            type="button"
            className="luma-icon absolute top-4 end-4"
            aria-label={t("Kit.close")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
