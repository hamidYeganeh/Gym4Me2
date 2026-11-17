"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useTranslations } from "@repo/i18n";
import { ArrowLeft } from "@repo/icons/arrow-left";
import { BellRinging } from "@repo/icons/bell-ringing";
import { CalendarCheck } from "@repo/icons/calendar-check";
import { CheckCircle } from "@repo/icons/check-circle";
import { Button, buttonVariants } from "@repo/ui/kit/button";
import { cn } from "@repo/ui/lib/utils";

import styles from "./onboarding.module.css";
import OnboardingShell from "./OnboardingShell";

const NotificationOnboarding = () => {
  const t = useTranslations("Application");

  const examples = [
    {
      title: t("gym4Me"),
      description: t("yourClubRequestHasBeenApproved"),
      time: t("time2m"),
      Icon: CheckCircle,
    },
    {
      title: t("trainingReminder"),
      description: t("yourSessionStartsInAnHour"),
      time: t("time1h"),
      Icon: CalendarCheck,
    },
    {
      title: t("clubUpdate"),
      description: t("checkYourClubsUpdatedOpeningHours"),
      time: t("time2h"),
      Icon: BellRinging,
    },
  ];
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setMessage(t("notificationsArentAvailableInThisBrowserYouCanContinueToClubs"));
      return;
    }

    setPending(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") router.push("/clubs/");
      else setMessage(t("notificationsAreOffYouCanChangeThisInYourBrowserSettings"));
    } catch {
      setMessage(t("notificationsCouldntBeEnabledYouCanContinueToClubs"));
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingShell>
      <div className="flex flex-1 flex-col gap-theme-6">
        <nav aria-label={t("onboardingNavigation")} className="flex items-center justify-between">
          <Link
            href="/onboarding/"
            aria-label={t("backToProfile")}
            className={buttonVariants({
              iconOnly: true,
              size: "lg",
              radius: "full",
              variant: "text",
              color: "neutral",
            })}
          >
            <ArrowLeft />
          </Link>
          <Link
            href="/clubs/"
            className={buttonVariants({ variant: "text", color: "neutral", radius: "full" })}
          >
            {t("skip")}
          </Link>
        </nav>
        <header className="flex flex-col items-center gap-theme-3 text-center">
          <div className="grid size-theme-16 place-items-center rounded-theme-full bg-theme-muted text-theme-muted-foreground">
            <BellRinging className="size-theme-8" />
          </div>
          <h1 className="text-theme-h3 font-theme-semibold">{t("getNotified")}</h1>
          <p className="text-theme-body1 text-theme-muted-foreground">
            {t("allowNotificationsForClubUpdatesAndTrainingReminders")}
          </p>
        </header>
        <div className="relative isolate px-theme-1 pt-theme-12">
          <div
            aria-hidden="true"
            className="absolute inset-x-theme-10 top-0 -z-10 h-full rounded-t-[2.5rem] border-8 border-b-0 border-theme-muted"
          >
            <div className="mx-auto mt-theme-2 h-theme-4 w-theme-16 rounded-theme-full bg-theme-muted" />
          </div>
          <ul aria-label={t("exampleNotifications")} className="grid gap-theme-2">
            {examples.map(({ title, description, time, Icon }, index) => (
              <li
                key={title}
                className={cn(
                  styles.notice,
                  "flex items-center gap-theme-3 rounded-theme-2xl border border-theme-border bg-theme-card p-theme-3 shadow-theme-sm",
                )}
                style={{ animationDelay: `calc(${index} * var(--theme-duration-fast) / 3)` }}
              >
                <span className="grid size-theme-10 shrink-0 place-items-center rounded-theme-full bg-theme-muted text-theme-muted-foreground">
                  <Icon className="size-theme-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-theme-1">
                  <p className="text-theme-body2 font-theme-semibold">{title}</p>
                  <p className="text-theme-caption text-theme-muted-foreground">{description}</p>
                </div>
                <span className="self-start text-theme-caption text-theme-muted-foreground">
                  {time}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-auto flex flex-col gap-theme-2">
          {message && (
            <p role="status" className="text-center text-theme-body2 text-theme-muted-foreground">
              {message}
            </p>
          )}
          {message ?
            <Link href="/clubs/" className={buttonVariants({ size: "xl", radius: "full" })}>
              {t("continueToClubs")}
            </Link>
          : <Button
              size="xl"
              radius="full"
              loading={pending}
              onClick={() => void enableNotifications()}
            >
              {t("turnOnNotifications")}
            </Button>
          }
        </div>
      </div>
    </OnboardingShell>
  );
};

export default NotificationOnboarding;
