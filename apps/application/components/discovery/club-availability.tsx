"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { Button } from "@repo/ui/kit/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";
import { Carousel, CarouselContent, CarouselItem } from "@repo/ui/kit/Carousel";
import { Skeleton } from "@repo/ui/kit/Skeleton";
import { clubSlots, getSlotDates } from "../../lib/club-schedule";
import { useTehranDay } from "./use-tehran-day";

export function ClubAvailability({ clubId }: { clubId: string }) {
  const locale = useLocale();
  const t = useTranslations("Availability");
  const today = useTehranDay();
  const dates = getSlotDates(today, 2);
  const number = new Intl.NumberFormat(locale, { useGrouping: false });
  const formatTime = (value: string) =>
    value.replace(/\d/g, (digit) => number.format(Number(digit)));
  const shortDate = (date: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(new Date(`${date}T12:00:00Z`));

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={t("title")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <Button asChild variant="link" className="shrink-0">
          <Link href={`/discovery/clubs/${clubId}/slots`} scroll={false}>
            {t("seeAll")}
          </Link>
        </Button>
      </div>
      <Card className="gap-0">
        {today ? (
          dates.map((date, index) => {
            const label =
              index === 0
                ? t("today")
                : t("tomorrow", { date: shortDate(date) });
            return (
              <Fragment key={date}>
                <CardHeader className="pb-3">
                  <CardTitle>
                    <h3>{label}</h3>
                  </CardTitle>
                </CardHeader>
                <CardContent className={index === 0 ? "pb-7" : undefined}>
                  <Carousel
                    dir={locale === "fa" ? "rtl" : "ltr"}
                    opts={{
                      align: "start",
                      direction: locale === "fa" ? "rtl" : "ltr",
                    }}
                    aria-label={label}
                  >
                    <CarouselContent className="ms-0 gap-3 pb-1">
                      {clubSlots.map((slot) => {
                        const content = (
                          <>
                            <span
                              dir="ltr"
                              className="font-normal text-muted-foreground"
                            >
                              {formatTime(slot.value)}
                            </span>
                            <span>
                              {t(slot.available ? "available" : "unavailable")}
                            </span>
                          </>
                        );
                        const slotLabel = `${label} · ${formatTime(slot.value)} · ${t(slot.available ? "available" : "unavailable")}`;
                        return (
                          <CarouselItem
                            key={slot.value}
                            className="basis-auto ps-0"
                          >
                            {slot.available ? (
                              <Button
                                asChild
                                variant="outline"
                                className="h-auto min-h-18 w-34 flex-col items-start gap-1 px-3 py-3"
                              >
                                <Link
                                  scroll={false}
                                  aria-label={slotLabel}
                                  href={`/discovery/clubs/${clubId}/slots?date=${date}&time=${slot.value}`}
                                >
                                  {content}
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                disabled
                                variant="outline"
                                aria-label={slotLabel}
                                className="h-auto min-h-18 w-34 flex-col items-start gap-1 px-3 py-3"
                              >
                                {content}
                              </Button>
                            )}
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </CardContent>
              </Fragment>
            );
          })
        ) : (
          <>
            <CardHeader>
              <CardTitle>{t("today")}</CardTitle>
            </CardHeader>
            <CardContent
              className="flex flex-col gap-5 pt-3"
              aria-busy="true"
              aria-label={t("loading")}
            >
              <Skeleton className="h-18 w-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-18 w-full" />
            </CardContent>
          </>
        )}
      </Card>
    </section>
  );
}
