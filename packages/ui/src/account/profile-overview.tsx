"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import type { Account } from "@repo/api/auth";
import {
  Activity,
  ArrowDown,
  CalendarDays,
  Flame,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Avatar, AvatarFallback } from "../kit/Avatar";
import { Badge } from "../kit/Badge";
import { Button } from "../kit/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../kit/Card";
import { AccountNavigation } from "./account-design";
import { cn } from "../lib/utils";
import { Separator } from "../kit/Separator";
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
  const dateLabel = useDateLabel();
  const name = account?.displayName || t("you");
  return (
    <main className="profile-overview relative flex min-h-dvh flex-col gap-6 px-5 pb-[calc(8rem+var(--app-safe-bottom,0px))] pt-[calc(2rem+var(--app-safe-top,0px))] sm:px-6">
      <header className="relative flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <Button variant="outline" size="icon-lg" asChild>
          <Link href="/profile/settings" aria-label={t("settings")}>
            <MoreHorizontal />
          </Link>
        </Button>
      </header>
      <section
        className="relative flex items-center justify-center gap-5 py-9"
        aria-label={t("identity")}
      >
        <Avatar className="size-24 shrink-0 sm:size-28">
          <AvatarFallback>
            {account?.displayName?.trim().slice(0, 2).toLocaleUpperCase() || (
              <UserRound className="size-10" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col items-start gap-3">
          <div className="flex max-w-full items-center gap-2">
            <h2 className="truncate text-3xl font-semibold">{name}</h2>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/profile/edit" aria-label={t("edit")}>
                <Pencil />
              </Link>
            </Button>
          </div>
          <Badge variant="outline">
            <Sparkles data-icon="inline-start" />
            {t("journey")}
          </Badge>
        </div>
      </section>
      <Card className="profile-progress relative">
        <CardHeader className="sr-only">
          <CardTitle>{t("progress")}</CardTitle>
          <CardDescription>{t("activityHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="profile-stat profile-stat-current flex min-h-40 flex-col items-start justify-between gap-6 rounded-4xl p-5 sm:min-h-48">
              <Badge>{t("now")}</Badge>
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-4xl font-semibold">
                  <ArrowDown className="size-7 text-primary" />
                  <span aria-label={t("noActivity")}>—</span>
                </p>
                <p className="text-sm font-medium">{t("lastDays")}</p>
              </div>
            </div>
            <div className="profile-stat flex min-h-40 flex-col items-start justify-between gap-6 rounded-4xl border border-border p-5 sm:min-h-48">
              <Badge variant="outline">{t("before")}</Badge>
              <div className="flex flex-col gap-2 text-muted-foreground">
                <p
                  className="text-4xl font-semibold"
                  aria-label={t("noActivity")}
                >
                  —
                </p>
                <p className="text-sm font-medium">{t("dailyAverage")}</p>
              </div>
            </div>
          </div>
          <p className="flex items-center justify-center gap-2 py-1 text-center font-semibold text-primary">
            <Activity className="size-5 shrink-0" />
            {t("motivation")}
          </p>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-muted p-4 text-center">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                {t("memberSince")}
              </p>
              <p className="text-lg font-semibold">
                {account?.createdAt ? (
                  <time dateTime={account.createdAt}>
                    {dateLabel(account.createdAt)}
                  </time>
                ) : (
                  "—"
                )}
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-muted p-4 text-center">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Flame className="size-4 shrink-0" />
                {t("bestStreak")}
              </p>
              <p className="text-lg font-semibold" aria-label={t("noActivity")}>
                —
              </p>
            </div>
          </div>
          <p className="text-center text-xs leading-5 text-muted-foreground">
            {t("activityHint")}
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            disabled={refreshing}
            onClick={refresh}
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
