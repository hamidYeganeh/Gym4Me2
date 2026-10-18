"use client";
import { useRef, type ReactNode } from "react";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { useTranslations } from "@repo/i18n";
import { X } from "lucide-react";
import { Button } from "../kit/Button";
import { restoreOverlayFocus } from "../lib/active-surface";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../kit/Sheet";

export function HostSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const t = useTranslations("Kit"),
    trigger = useRef<HTMLElement | null>(null);
  useOverlayHistory(open, onOpenChange);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="sports-host-sheet"
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
        <SheetHeader className="pe-20">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        <SheetClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="absolute top-4 end-4"
            aria-label={t("close")}
          >
            <X />
          </Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
