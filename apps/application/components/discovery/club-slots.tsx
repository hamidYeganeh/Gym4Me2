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
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { SlidingNumber } from "@repo/ui/kit/SlidingNumber";
import { toast } from "@repo/ui/kit/Sonner";
import { getClubs } from "../../lib/clubs";

import { clubSlots as times, getSlotDates } from "../../lib/club-schedule";
import { useTehranDay } from "./use-tehran-day";

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
  const selectedExtras = selectedSlot.extras.filter(
    (extra) => extras[`${selectedDate}:${time}:${extra}`],
  );
  const totalPrice =
    club.priceValue +
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
        <fieldset className="min-w-0">
          <legend className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar1Icon />
            {t("date")}
          </legend>
          <ToggleGroup
            type="single"
            value={selectedDate}
            onValueChange={(value) => {
              if (value) setDate(value);
            }}
            className="grid w-full grid-cols-4 gap-2"
            aria-label={t("date")}
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            {dates.map((day) => (
              <ToggleGroupItem
                value={day.value}
                key={day.value}
                className="h-auto min-h-22 flex-col gap-1 bg-muted px-1 py-3 data-[state=on]:ring-2 data-[state=on]:ring-primary"
                aria-label={`${day.weekday} ${day.day}`}
              >
                <span className="text-3xl font-medium">{day.day}</span>
                <span className="text-xs">{day.weekday}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <ClockIcon />
            {t("time")}
          </legend>
          <ToggleGroup
            type="single"
            value={time}
            onValueChange={(value) => {
              if (value) setTime(value);
            }}
            className="block w-full"
            aria-label={t("time")}
            dir={locale === "fa" ? "rtl" : "ltr"}
          >
            <Carousel
              opts={{
                align: "start",
                direction: locale === "fa" ? "rtl" : "ltr",
              }}
              aria-label={t("time")}
              onKeyDownCapture={() => {}}
            >
              <CarouselContent className="ms-0 gap-2">
                {times.map((slot) => (
                  <CarouselItem key={slot.value} className="basis-auto ps-0">
                    <ToggleGroupItem
                      value={slot.value}
                      disabled={!slot.available}
                      className="h-16 w-44 bg-muted data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                      aria-label={`${formatTime(slot.value)}–${formatTime(slot.end)}${slot.available ? "" : " · " + t("unavailable")}`}
                    >
                      <span dir="ltr">
                        {formatTime(slot.value)}–{formatTime(slot.end)}
                      </span>
                    </ToggleGroupItem>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </ToggleGroup>
        </fieldset>
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
