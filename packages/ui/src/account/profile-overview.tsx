"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations, useLocale } from "@repo/i18n";
import { useTrainingQuery, type TrainingProgress } from "@repo/api/profile";
import { QueryError, Loading } from "./common";
import type { Account } from "@repo/api/auth";
import {
  Dumbbell,
  ArrowUpLeft,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  RefreshCw,
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
  const locale = useLocale();
  const visual = useTranslations("Visual");
  const progress = useTrainingQuery<TrainingProgress>(
    "profile/training/progress",
    {},
    Boolean(account),
  );
  // The progress endpoint already projects completed sessions only.
  const completed = progress.data?.sessions ?? [];
  const latest = completed
    .map((session) => session.endedAt || session.startedAt)
    .sort()
    .at(-1);
  const name = account?.displayName || t("you");
  return (
    <main className="profile-overview relative flex min-h-dvh flex-col gap-6 px-5 pb-[calc(8rem+var(--app-safe-bottom,0px))] pt-[calc(1.25rem+var(--app-safe-top,0px))] sm:px-6">
      <header className="relative flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
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
          <Badge variant="outline">
            <Dumbbell data-icon="inline-start" />
            {t("journey")}
          </Badge>
        </div>
      </section>
      <Card className="profile-progress relative">
        <CardHeader className="sr-only">
          <CardTitle>{t("progress")}</CardTitle>
          <CardDescription>{visual("viewTraining")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {account ? (
            progress.isPending ? (
              <Loading />
            ) : progress.error ? (
              <QueryError error={progress.error} retry={progress.refetch} />
            ) : (
              <dl className="profile-activity">
                <div>
                  <dt>{visual("completedWorkouts")}</dt>
                  <dd data-metric="count">
                    {new Intl.NumberFormat(locale).format(completed.length)}
                  </dd>
                </div>
                <div>
                  <dt>{visual("lastWorkout")}</dt>
                  <dd>{latest ? dateLabel(latest) : visual("noneYet")}</dd>
                </div>
              </dl>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              {visual("trainingProgressHint")}
            </p>
          )}
          <Link href="/training" className="profile-training-link">
            <span>
              <Dumbbell size={19} />
              {visual("viewTraining")}
            </span>
            <ArrowUpLeft size={19} className="ltr:rotate-90" />
          </Link>
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
              if (account) void progress.refetch();
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
