"use client";
import {
  Children,
  isValidElement,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { SlidersHorizontal } from "lucide-react";
import { useOverlayHistory } from "../../hooks/use-overlay-history";
import { restoreOverlayFocus } from "../../lib/active-surface";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../Sheet";
import { Button } from "../Button";

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onOpenAutoFocus,
  fixedHeader,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onOpenAutoFocus?: (event: Event) => void;
  fixedHeader?: ReactNode;
  footer?: ReactNode;
}) {
  const locale = useLocale();
  const trigger = useRef<HTMLElement | null>(null);
  useOverlayHistory(open, onOpenChange);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        dir={locale === "fa" ? "rtl" : "ltr"}
        className="mx-auto w-full min-w-0 max-w-2xl max-h-[90dvh] overflow-hidden rounded-t-[1.75rem] pb-[env(safe-area-inset-bottom)]"
        onOpenAutoFocus={(event) => {
          trigger.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreOverlayFocus(trigger.current);
        }}
      >
        <SheetHeader className="shrink-0 pe-16 pt-4 pb-4">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className={description ? undefined : "sr-only"}>
            {description ?? title}
          </SheetDescription>
        </SheetHeader>
        {fixedHeader && (
          <div className="shrink-0 min-w-0 px-5 pb-4">{fixedHeader}</div>
        )}
        <div
          data-sheet-scroll=""
          className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-6"
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border bg-popover px-5 py-4">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function hasForm(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      isValidElement<{ children?: ReactNode }>(child) &&
      (child.type === "form" || hasForm(child.props.children)),
  );
}

export function FilterSheet({
  children,
  count = 0,
  onOpen,
  triggerRef,
  onReset,
}: {
  children: ReactNode;
  count?: number;
  onOpen?: () => void;
  triggerRef?: Ref<HTMLButtonElement>;
  onReset?: () => void;
}) {
  const t = useTranslations("SheetPicker");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className="min-h-11 self-start"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        {t("filters")}
        {count > 0 && (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
            {new Intl.NumberFormat(locale).format(count)}
          </span>
        )}
      </Button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={t("filters")}
        description={t("filterHint")}
        footer={
          !hasForm(children) && (
            <div className="flex gap-3">
              {onReset && count > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  onClick={onReset}
                >
                  {t("clearFilters")}
                </Button>
              )}
              <Button
                type="button"
                className="min-h-11 flex-1"
                onClick={() => setOpen(false)}
              >
                {t("done")}
              </Button>
            </div>
          )
        }
      >
        <div
          className="grid gap-5"
          onSubmit={(event) => {
            if (
              event.target instanceof HTMLFormElement &&
              event.target.checkValidity()
            )
              setOpen(false);
          }}
        >
          {children}
        </div>
      </BottomSheet>
    </>
  );
}
