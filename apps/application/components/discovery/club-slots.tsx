"use client";
import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  ChevronLeftIcon,
  Calendar1Icon,
  ClockIcon,
  BasketballIcon,
} from "@repo/ui/icons";
import { Button } from "@repo/ui/kit/Button";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/kit/ToggleGroup";
import { ChoiceOptionCard } from "@repo/ui/kit/ChoiceOptionCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/kit/Tabs";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { SlidingNumber } from "@repo/ui/kit/SlidingNumber";
import { toast } from "@repo/ui/kit/Sonner";
import { getClubs } from "../../lib/clubs";

import { clubSlots as times, getSlotDates } from "../../lib/club-schedule";
import { useTehranDay } from "./use-tehran-day";
import { useSlotDateIndicator } from "./use-slot-date-indicator";
import "./club-slot-panel.css";

function subscribeSearch(listener: () => void) {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}
const getSearch = () => window.location.search;

// Extra fees are in the same currency as the club session price.
const extraOptions = {
  ball: { price: 0, icon: <BasketballIcon /> },
};

export function ClubSlots({ clubId }: { clubId: string }) {
  const locale = useLocale();
  const t = useTranslations("Slots");
  const club = getClubs(locale).find((item) => item.id === clubId)!;
  const today = useTehranDay();
  const search = useSyncExternalStore(subscribeSearch, getSearch, () => "");
  const params = new URLSearchParams(search);
  const slotDates = getSlotDates(today, 4);
  const [date, setDate] = useState("");
  const [timeOverride, setTime] = useState<string | null>(null);
  const requestedTime = params.get("time");
  const time =
    timeOverride ??
    (times.some((slot) => slot.value === requestedTime && slot.available)
      ? requestedTime!
      : "12:30");
  const [extras, setExtras] = useState<Record<string, boolean>>({});
  const selectedSlot = times.find((slot) => slot.value === time)!;
  const requestedDate = date || params.get("date") || "";
  const selectedDate = slotDates.includes(requestedDate)
    ? requestedDate
    : today;
  const { bar, pill } = useSlotDateIndicator(selectedDate, locale);
  const selectedDay = selectedDate
    ? new Date(`${selectedDate}T12:00:00Z`)
    : null;
  const selectedMonth = selectedDay
    ? new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Tehran",
      }).format(selectedDay)
    : "";
  const selectionLabel = selectedDay
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Tehran",
      }).format(selectedDay)
    : "";
  const selectedExtras = selectedSlot.extras.filter(
    (extra) => extras[`${selectedDate}:${time}:${extra}`],
  );
  const totalPrice =
    (club.priceValue ?? 0) +
    selectedExtras.reduce((sum, extra) => sum + extraOptions[extra].price, 0);
  const formatTime = (value: string) =>
    value.replace(/\d/g, (digit) =>
      new Intl.NumberFormat(locale, { useGrouping: false }).format(
        Number(digit),
      ),
    );
  const dates = slotDates.map((value) => {
    const day = new Date(`${value}T12:00:00Z`);
    return {
      value,
      day: new Intl.DateTimeFormat(locale, {
        day: "numeric",
        timeZone: "Asia/Tehran",
      }).format(day),
      month: new Intl.DateTimeFormat(locale, {
        month: "short",
        timeZone: "Asia/Tehran",
      }).format(day),
      label: new Intl.DateTimeFormat(locale, {
        dateStyle: "full",
        timeZone: "Asia/Tehran",
      }).format(day),
      weekday: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "Asia/Tehran",
      }).format(day),
    };
  });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !selectedDate ||
      !times.some((slot) => slot.value === time && slot.available)
    )
      return;
    try {
      localStorage.setItem(
        `gym4me:club:${clubId}:visit`,
        JSON.stringify({
          date: selectedDate,
          time,
          extras: selectedExtras,
          totalPrice,
        }),
      );
      toast.success(t("saved"));
    } catch {
      toast.error(t("storageError"));
    }
  }
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-image-surface text-image-foreground sm:rounded-[32px]">
      <div className="absolute inset-0 -z-20">
        <Image
          src={club.photos[0].src}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 576px) 100vw, 576px"
          priority
          unoptimized
        />
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-image-surface/50" />
      <header className="flex items-center justify-between px-6 pt-[calc(1.5rem+var(--app-safe-top))]">
        <Button asChild variant="image" size="icon-lg">
          <Link
            href={`/discovery/clubs/${clubId}`}
            scroll={false}
            aria-label={t("back")}
          >
            <ChevronLeftIcon className="rtl:rotate-180" />
          </Link>
        </Button>
      </header>
      <div className="flex min-h-60 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <p className="text-sm font-medium">{club.name}</p>
        <h1 className="text-5xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-image-foreground/80">{t("subtitle")}</p>
      </div>
      <form
        onSubmit={submit}
        className="mx-3 mb-[calc(1rem+var(--app-safe-bottom))] flex flex-col gap-6 rounded-[32px] bg-background p-5 text-foreground sm:mx-5 sm:p-6"
      >
        <Tabs
          value={selectedDate}
          onValueChange={setDate}
          dir={locale === "fa" ? "rtl" : "ltr"}
          className="gap-6"
        >
          <fieldset className="min-w-0">
            <legend className="mb-4 w-full">
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Calendar1Icon />
                  {t("date")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {selectedMonth}
                </span>
              </span>
            </legend>
            <TabsList
              ref={bar}
              className="t-tabs club-slot-days"
              aria-label={t("date")}
              aria-busy={!today}
            >
              <span ref={pill} className="t-tabs-pill" aria-hidden="true" />
              {dates.length
                ? dates.map((day, index) => (
                    <TabsTrigger
                      key={day.value}
                      value={day.value}
                      className="t-tab"
                      aria-label={day.label}
                    >
                      <span className="club-slot-weekday">{day.weekday}</span>
                      <span className="club-slot-day-number">{day.day}</span>
                      <span className="club-slot-day-caption">
                        {index === 0
                          ? t("today")
                          : index === 1
                            ? t("tomorrow")
                            : day.month}
                      </span>
                    </TabsTrigger>
                  ))
                : Array.from({ length: 4 }, (_, index) => (
                    <Skeleton
                      key={index}
                      className="h-25 rounded-3xl motion-reduce:animate-none"
                    />
                  ))}
            </TabsList>
          </fieldset>
          <TabsContent value={selectedDate}>
            <fieldset className="min-w-0">
              <legend className="mb-4 w-full">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <ClockIcon />
                    {t("time")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("availableTimes", {
                      count: new Intl.NumberFormat(locale).format(
                        times.filter((slot) => slot.available).length,
                      ),
                    })}
                  </span>
                </span>
              </legend>
              <ToggleGroup
                type="single"
                value={time}
                onValueChange={(value) => {
                  if (value) setTime(value);
                }}
                className="club-slot-times"
                aria-label={t("time")}
                dir={locale === "fa" ? "rtl" : "ltr"}
              >
                {times.map((slot) => (
                  <ToggleGroupItem
                    key={slot.value}
                    value={slot.value}
                    disabled={!slot.available}
                    className="club-slot-time"
                    aria-label={`${formatTime(slot.value)}–${formatTime(slot.end)} · ${t(slot.available ? "available" : "unavailable")}`}
                  >
                    <span dir="ltr" className="club-slot-time-start">
                      {formatTime(slot.value)}
                    </span>
                    <span className="club-slot-time-end">
                      {t("until", { time: formatTime(slot.end) })}
                    </span>
                    <span className="club-slot-time-status">
                      {t(slot.available ? "available" : "unavailable")}
                    </span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </fieldset>
          </TabsContent>
        </Tabs>
        {selectedDay && (
          <p
            className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"
            role="status"
            aria-label={t("selection")}
          >
            <span>{selectionLabel}</span>
            <span dir="ltr">
              {formatTime(time)}–{formatTime(selectedSlot.end)}
            </span>
          </p>
        )}
        {selectedSlot.extras.map((extra) => (
          <ChoiceOptionCard
            key={`${selectedDate}:${time}:${extra}`}
            control="switch"
            label={t(extra)}
            description={t("ballDescription")}
            checked={extras[`${selectedDate}:${time}:${extra}`] ?? false}
            onCheckedChange={(checked) =>
              setExtras((current) => ({
                ...current,
                [`${selectedDate}:${time}:${extra}`]: checked,
              }))
            }
            icon={extraOptions[extra].icon}
            supportingText={
              extraOptions[extra].price === 0
                ? t("free")
                : `+${new Intl.NumberFormat(locale).format(extraOptions[extra].price)} ${club.priceCurrency}`
            }
          />
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">{t("price")}</p>
            <p className="text-xl font-semibold">
              <SlidingNumber
                value={totalPrice}
                locale={club.locale}
                useGrouping
              />{" "}
              {club.priceCurrency}
            </p>
          </div>
          <Button size="lg" type="submit" disabled={!today}>
            {t("book")}
          </Button>
        </div>
      </form>
    </main>
  );
}
