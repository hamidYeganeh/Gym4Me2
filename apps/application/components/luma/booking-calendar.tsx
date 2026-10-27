"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import {
  useSportsBookings,
  type BookingDto,
  type BookingTab,
} from "@repo/api/sports";
import { useListState } from "@repo/ui/hooks/use-list-state";
import { agendaDay } from "@repo/ui/lib/agenda";
import { validCalendarDay } from "@repo/ui/lib/calendar-month";
import { ScheduleCalendar } from "@repo/ui/kit/ScheduleCalendar";
import {
  CommandError,
  Empty,
  QueryState,
  StatusBadge,
  useLuma,
} from "./common";

export function BookingCalendar({ title }: { title?: string } = {}) {
  const t = useLuma(),
    copy = useTranslations("ScheduleCalendar"),
    locale = useLocale();
  const [today, setToday] = useState(() => agendaDay(new Date())!);
  useEffect(() => {
    const refresh = () => setToday(agendaDay(new Date())!);
    const timer = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const [tab, setTab] = useListState<BookingTab>(
    "tab",
    "upcoming",
    (value): value is BookingTab => value === "upcoming" || value === "past",
  );
  const [day, setDay] = useListState<string>(
    "booking-day",
    "",
    (value): value is string => value === "" || validCalendarDay(value),
  );
  const [month, setMonth] = useListState<string>(
    "booking-month",
    today,
    validCalendarDay,
  );
  const query = useSportsBookings(tab, day || undefined);
  const data = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const days = new Map<string | null, BookingDto[]>();
  for (const booking of data) {
    const key = agendaDay(booking.startAt);
    days.set(key, [...(days.get(key) ?? []), booking]);
  }
  const results = useRef<HTMLDivElement>(null);
  const nextFocus = useRef<number | null>(null);
  useEffect(() => {
    if (query.isFetchingNextPage || nextFocus.current === null) return;
    if (data.length > nextFocus.current) {
      const target = results.current?.querySelectorAll<HTMLAnchorElement>(
        "a[data-booking-event]",
      )[nextFocus.current];
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", behavior: "instant" });
      nextFocus.current = null;
    } else if (query.error) nextFocus.current = null;
  }, [data.length, query.isFetchingNextPage, query.error]);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tehran",
  });
  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  });
  function select(value?: string) {
    nextFocus.current = null;
    setDay(value ?? "");
    setMonth(value ?? today);
    if (value && value < today) setTab("past");
  }
  return (
    <BookingCalendarFrame
      title={title ?? copy("title")}
      today={today}
      month={month}
      onMonthChange={setMonth}
      selected={day || undefined}
      onSelect={select}
      controls={(["upcoming", "past"] as const).map((value) => (
        <button
          key={value}
          type="button"
          className="schedule-pill"
          aria-pressed={tab === value}
          onClick={() => {
            nextFocus.current = null;
            setTab(value);
          }}
        >
          {t(value)}
        </button>
      ))}
    >
      <QueryState
        query={{
          isPending: query.isPending,
          error: query.data ? null : query.error,
          refetch: query.refetch,
        }}
      >
        <p role="status" aria-atomic="true" className="sr-only">
          {query.data ? t("bookingListCount", { count: data.length }) : ""}
        </p>
        <div
          ref={results}
          id="booking-results"
          aria-busy={query.isFetchingNextPage}
        >
          {[...days].map(([key, bookings]) => (
            <section className="booking-day" key={key ?? "undated"}>
              {key && <h3>{dateLabel.format(new Date(`${key}T12:00:00Z`))}</h3>}
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  data-booking-event
                  href={`/bookings/detail?id=${booking.id}`}
                  className="schedule-event"
                >
                  <div className="schedule-event-copy">
                    <time
                      className="schedule-event-time"
                      dateTime={booking.startAt}
                    >
                      {Number.isFinite(Date.parse(booking.startAt))
                        ? timeLabel.format(new Date(booking.startAt))
                        : ""}
                    </time>
                    <strong>{booking.title}</strong>
                    <small>{booking.branchName}</small>
                    <StatusBadge state={booking.status} />
                  </div>
                  <div className="schedule-event-image" aria-hidden="true">
                    <Image
                      src="/images/clubs/training.webp"
                      alt=""
                      fill
                      sizes="(max-width: 640px) 35vw, 230px"
                    />
                  </div>
                </Link>
              ))}
            </section>
          ))}
        </div>
        {!data.length && (
          <Empty illustration="watch">
            <strong className="block text-lg font-semibold">
              {day
                ? copy("noBookingsOnDay")
                : t(
                    tab === "upcoming"
                      ? "noUpcomingBookings"
                      : "noPastBookings",
                  )}
            </strong>
            <span className="mt-2 block">
              {day
                ? copy("tryAnotherDay")
                : t(
                    tab === "upcoming"
                      ? "noUpcomingBookingsHint"
                      : "noPastBookingsHint",
                  )}
            </span>
          </Empty>
        )}
        {query.data && query.error && <CommandError error={query.error} />}
        {query.hasNextPage && (
          <button
            className="schedule-pill"
            disabled={query.isFetchingNextPage}
            aria-controls="booking-results"
            onClick={() => {
              nextFocus.current = data.length;
              void query.fetchNextPage();
            }}
          >
            {query.isFetchingNextPage ? t("loading") : t("loadMoreBookings")}
          </button>
        )}
      </QueryState>
    </BookingCalendarFrame>
  );
}

function BookingCalendarFrame({
  controls,
  children,
  ...calendar
}: ComponentProps<typeof ScheduleCalendar>) {
  const t = useTranslations("SimpleApp");
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={calendar.title}>
      <div className="schedule-filters flex flex-wrap gap-2">
        {controls}
        <button
          type="button"
          className="schedule-pill"
          aria-expanded={open}
          aria-controls="booking-date-filter"
          onClick={() => setOpen((v) => !v)}
        >
          {t(open ? "hideCalendar" : "filterByDate")}
        </button>
        {calendar.selected && (
          <button
            className="schedule-pill"
            type="button"
            onClick={() => calendar.onSelect(undefined)}
          >
            {t("clearDate")}
          </button>
        )}
      </div>
      {open && (
        <div id="booking-date-filter" className="mt-4">
          <ScheduleCalendar {...calendar} />
        </div>
      )}
      {children}
    </section>
  );
}
