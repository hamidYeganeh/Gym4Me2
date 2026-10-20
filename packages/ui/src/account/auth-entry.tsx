"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Dumbbell,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wind,
  X,
} from "lucide-react";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";
import { Badge } from "../kit/Badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../kit/Empty";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../kit/Sheet";
import { useOverlayHistory } from "../hooks/use-overlay-history";
import { safeReturnPath } from "./safe-return-path";
import { applicationAuthHref } from "../lib/auth-routes";
import { isActiveSurfaceElement } from "../lib/active-surface";
import "./auth-controls.css";

/** A single entry point for both new and returning athletes. */
export function AuthEntryButton({
  returnTo = "/",
  children,
  variant = "default",
}: {
  returnTo?: string;
  children?: ReactNode;
  variant?: "default" | "secondary" | "ghost";
}) {
  const t = useTranslations("AuthDesign");
  const kit = useTranslations("Kit");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  useOverlayHistory(open, setOpen);
  const destination = safeReturnPath(returnTo, "/");
  useEffect(() => {
    if (!open) return;
    router.prefetch(applicationAuthHref("otp", destination));
    router.prefetch(applicationAuthHref("password", destination));
  }, [open, router, destination]);
  const login = (method: "otp" | "password") =>
    applicationAuthHref(method, destination);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant} data-auth-action className="min-h-12">
          {children ?? t("join")}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="auth-entry-sheet"
        data-gym-auth
      >
        <div className="auth-sheet-handle" aria-hidden="true" />
        <div className="auth-sheet-top">
          <div className="auth-emblem" aria-hidden="true">
            <Sparkles strokeWidth={1.5} />
          </div>
          <SheetClose asChild>
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label={kit("close")}
            >
              <X strokeWidth={1.5} />
            </Button>
          </SheetClose>
        </div>
        <SheetHeader>
          <SheetTitle>{t("getStarted")}</SheetTitle>
          <SheetDescription>{t("welcomeHint")}</SheetDescription>
        </SheetHeader>
        <div className="auth-entry-options">
          <Button asChild data-auth-action className="min-h-14 w-full">
            <Link href={login("otp")}>
              <Smartphone strokeWidth={1.5} data-icon="inline-start" />
              {t("continuePhone")}
            </Link>
          </Button>
          <Button asChild variant="secondary" className="min-h-14 w-full">
            <Link href={login("password")}>
              <KeyRound strokeWidth={1.5} data-icon="inline-start" />
              {t("continuePassword")}
            </Link>
          </Button>
          <p className="auth-entry-note">
            <ShieldCheck strokeWidth={1.5} aria-hidden="true" />
            {t("sharedAccount")}
          </p>
          <p className="auth-policy">
            {t("policyPrefix")}{" "}
            <Link
              href={`/privacy?${new URLSearchParams({ from: "login", returnTo: destination })}`}
            >
              {t("policyLink")}
            </Link>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Decorative exercise posters: no fabricated bookings or account information. */
export function AuthArtwork() {
  const t = useTranslations("AuthDesign");
  return (
    <div className="auth-artwork" aria-hidden="true">
      <div className="auth-artwork-tray">
        <div>
          <span>{t("yourMovement")}</span>
          <span className="auth-artwork-avatar">
            <Activity strokeWidth={1.5} />
          </span>
        </div>
      </div>
      <div className="auth-poster auth-poster--left">
        <span>
          {t("flowLine1")}
          <br />
          {t("flowLine2")}
          <br />
          {t("flowLine3")}
        </span>
        <Wind strokeWidth={1} />
        <small>{t("flowCaption")}</small>
      </div>
      <div className="auth-poster auth-poster--right">
        <span>
          {t("stepLine1")}
          <br />
          {t("stepLine2")}
          <br />
          {t("stepLine3")}
        </span>
        <Activity strokeWidth={1} />
        <small>{t("stepCaption")}</small>
      </div>
      <div className="auth-poster auth-poster--center">
        <small>{t("moveCaption")}</small>
        <strong>
          {t("moveLine1")}
          <br />
          {t("moveLine2")}
          <br />
          {t("moveLine3")}
        </strong>
        <Dumbbell strokeWidth={1} />
        <Badge variant="secondary">{t("madeForYou")}</Badge>
      </div>
    </div>
  );
}

export function AuthWelcome({ returnTo = "/" }: { returnTo?: string }) {
  const t = useTranslations("AuthDesign");
  return (
    <section className="auth-welcome" data-gym-auth>
      <AuthArtwork />
      <div className="auth-welcome-copy">
        <h2>{t("getStarted")}</h2>
        <p>{t("welcomeHint")}</p>
        <AuthEntryButton returnTo={returnTo} />
        <Button variant="ghost" asChild>
          <Link href="/discovery">{t("browse")}</Link>
        </Button>
      </div>
    </section>
  );
}

/** Used after a 401; the complete destination survives sign-in and profile setup. */
export function AuthRequired({
  returnTo,
  compact = false,
  focusOnEntry = false,
}: {
  returnTo: string;
  compact?: boolean;
  focusOnEntry?: boolean;
}) {
  const t = useTranslations("AuthDesign");
  const entry = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!focusOnEntry) return;
    const frame = requestAnimationFrame(() => {
      const button =
        entry.current?.querySelector<HTMLButtonElement>("[data-auth-action]");
      if (
        button &&
        document.activeElement === document.body &&
        isActiveSurfaceElement(button)
      ) {
        button.focus({ preventScroll: true });
        button.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "instant",
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focusOnEntry]);
  return (
    <Empty
      ref={entry}
      className="auth-required"
      data-compact={compact || undefined}
      data-gym-auth
    >
      <EmptyHeader>
        <EmptyMedia>
          <span className="auth-emblem">
            <ShieldCheck strokeWidth={1.5} />
          </span>
        </EmptyMedia>
        <EmptyTitle>{t("requiredTitle")}</EmptyTitle>
        <EmptyDescription>{t("requiredHint")}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <AuthEntryButton returnTo={returnTo} />
      </EmptyContent>
    </Empty>
  );
}
