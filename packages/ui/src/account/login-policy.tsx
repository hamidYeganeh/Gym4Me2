"use client";

import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import { useDataPolicy } from "@repo/api/profile";
import { Button } from "../kit/Button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "../kit/Sheet";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { DataPolicyContent } from "./privacy";
import { Loading, QueryError } from "./common";

function PolicyBody() {
  const policy = useDataPolicy();
  return (
    <>
      <QueryError error={policy.error} retry={policy.refetch} />
      {policy.isPending ? (
        <Loading />
      ) : policy.data ? (
        <DataPolicyContent policy={policy.data} />
      ) : null}
    </>
  );
}

/** Reading the policy never unmounts the sign-in form or loses its draft. */
export function LoginPolicyNotice() {
  const t = useTranslations("Privacy");
  const kit = useTranslations("Kit");
  const [open, setOpen] = useState(false);
  useOverlayHistory(open, setOpen);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <p className="text-sm leading-7 text-muted-foreground">
        {t("loginNotice")}{" "}
        <SheetTrigger asChild>
          <button
            type="button"
            className="inline-flex min-h-11 items-center text-foreground underline underline-offset-4"
          >
            {t("policyLink")}
          </button>
        </SheetTrigger>
      </p>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] max-w-xl gap-0 rounded-t-3xl"
        data-login-policy
        data-gym-auth
      >
        <SheetHeader className="shrink-0 pe-16">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <div
          className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-4"
          tabIndex={0}
          aria-label={t("readPolicy")}
        >
          {open && <PolicyBody />}
        </div>
        <SheetFooter className="shrink-0 pb-[calc(1rem+var(--app-safe-bottom,0px))] pt-2">
          <SheetClose asChild>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 w-full"
            >
              {kit("close")}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
