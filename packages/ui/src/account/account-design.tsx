"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import { ChevronLeft, Dumbbell, Home, UserRound } from "lucide-react";
import { Button } from "../kit/Button";
import { Avatar, AvatarFallback } from "../kit/Avatar";
import { cn } from "../lib/utils";

export function AccountAvatar({
  name,
  large = false,
}: {
  name?: string | null;
  large?: boolean;
}) {
  return (
    <Avatar className={cn("size-12", large && "size-28 sm:size-32")}>
      <AvatarFallback>
        {name?.trim().slice(0, 2).toLocaleUpperCase() || (
          <UserRound className={cn("size-6", large && "size-12")} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

export function AccountNavigation() {
  const t = useTranslations("ProfileOverview");
  return (
    <nav
      aria-label={t("navigation")}
      className="profile-navigation fixed inset-x-5 bottom-[calc(1rem+var(--app-safe-bottom,0px))] mx-auto flex max-w-[calc(36rem-2.5rem)] items-center gap-2 rounded-full border border-border bg-card/95 p-2 shadow-lg backdrop-blur-xl"
    >
      <Button variant="ghost" asChild className="h-14 flex-1">
        <Link href="/discovery" className="flex flex-col gap-1">
          <Home />
          <span className="text-xs">{t("home")}</span>
        </Link>
      </Button>
      <Button variant="ghost" asChild className="h-14 flex-1">
        <Link href="/training" className="flex flex-col gap-1">
          <Dumbbell />
          <span className="text-xs">{t("training")}</span>
        </Link>
      </Button>
      <Button variant="secondary" asChild className="h-14 flex-1">
        <Link href="/profile" className="flex flex-col gap-1">
          <UserRound />
          <span className="text-xs">{t("title")}</span>
        </Link>
      </Button>
    </nav>
  );
}

export function AccountDesignPage({
  title,
  backHref = "/profile",
  actions,
  children,
}: {
  title: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations("Privacy");
  return (
    <main className="account-design min-h-dvh bg-muted/50 px-5 pb-[calc(8rem+var(--app-safe-bottom,0px))] sm:px-6">
      <header className="account-design-header sticky top-0 flex items-center justify-between gap-3 py-5 pt-[calc(1.5rem+var(--app-safe-top,0px))]">
        <Button asChild variant="outline" size="icon-lg" className="size-12">
          <Link href={backHref} aria-label={t("back")}>
            <ChevronLeft className="rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="text-center text-lg font-semibold">{title}</h1>
        <div className="flex size-12 items-center justify-center">
          {actions}
        </div>
      </header>
      <div className="flex flex-col gap-7 pb-6">{children}</div>
      <AccountNavigation />
    </main>
  );
}
