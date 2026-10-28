"use client";

import type { Account } from "@repo/api/auth";
import { useTranslations } from "@repo/i18n";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Calendar1Icon as CalendarDays,
  ChevronLeftIcon as ChevronLeft,
  DotThreeHorizontalIcon as MoreHorizontal,
  Pencil1Icon as Pencil,
  ArrowRepeatClockwise1Icon as RefreshCw,
  UserIcon as UserRound,
} from "../icons";
import { Avatar, AvatarFallback } from "../kit/Avatar";
import { Button } from "../kit/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../kit/Card";
import { cn } from "../lib/utils";
import { AccountNavigation } from "./account-design";
import { useDateLabel } from "./common";

export function ProfileOverview({
  account,
  refreshing,
  refresh,
  children,
}: {
  account?: Account;
  refreshing: boolean;
  refresh: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("ProfileOverview");
  const back = useTranslations("Privacy");
  const dateLabel = useDateLabel();
  const simple = useTranslations("SimpleApp");
  const name = account?.displayName || t("you");
  return (
    <main className="profile-overview relative flex min-h-dvh flex-col gap-6 px-5 pb-[calc(8rem+var(--app-safe-bottom,0px))] pt-[calc(1.25rem+var(--app-safe-top,0px))] sm:px-6">
      <header className="relative flex items-center justify-between gap-4">
        <Button variant="secondary" size="icon-lg" asChild>
          <Link href="/" aria-label={back("back")}>
            <ChevronLeft className="rtl:rotate-180" />
          </Link>
        </Button>
        <h1 className="flex-1 text-xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <Button variant="outline" size="icon-lg" asChild>
          <Link href="/profile/settings" aria-label={t("settings")}>
            <MoreHorizontal />
          </Link>
        </Button>
      </header>
      <section
        className="relative flex items-center justify-start gap-4 py-5"
        aria-label={t("identity")}
      >
        <Avatar className="size-20 shrink-0">
          <AvatarFallback>
            {account?.displayName?.trim().slice(0, 2).toLocaleUpperCase() || (
              <UserRound className="size-10" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col items-start gap-3">
          <div className="flex max-w-full items-center gap-2">
            <h2 className="truncate text-2xl font-semibold">{name}</h2>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/profile/edit" aria-label={t("edit")}>
                <Pencil />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <Card className="profile-progress relative">
        <CardHeader>
          <CardTitle>{simple("purchasesAndHelp")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(
            [
              ["/memberships", "memberships"],
              ["/bookings", "bookings"],
              ["/orders", "orders"],
              ["/support", "support"],
              ["/more", "more"],
            ] as const
          ).map(([href, label]) => (
            <Button
              key={href}
              variant="ghost"
              className="justify-start min-h-12"
              asChild
            >
              <Link href={href}>{simple(label)}</Link>
            </Button>
          ))}
          {account?.createdAt && (
            <p className="flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <CalendarDays size={14} />
              {t("memberSince")}{" "}
              <time dateTime={account.createdAt}>
                {dateLabel(account.createdAt)}
              </time>
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            disabled={refreshing}
            onClick={() => {
              refresh();
            }}
          >
            <RefreshCw
              data-icon="inline-start"
              className={cn(refreshing && "animate-spin")}
            />
            {t("refresh")}
          </Button>
        </CardFooter>
      </Card>
      <div className="relative grid gap-6">{children}</div>
      <AccountNavigation />
    </main>
  );
}
