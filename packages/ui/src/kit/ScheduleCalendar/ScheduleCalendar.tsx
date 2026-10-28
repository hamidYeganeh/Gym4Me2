"use client";

import { useLocale, useTranslations } from "@repo/i18n";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  Calendar1Icon as CalendarDays,
  ChevronLeftIcon as ChevronLeft,
  ChevronRightIcon as ChevronRight,
} from "../../icons";
import {
  calendarMonth,
  shiftCalendarDay,
  shiftCalendarMonth,
} from "../../lib/calendar-month";
import "./ScheduleCalendar.css";

export function ScheduleCalendar({
  title,
  today,
  month,
  onMonthChange,
  selected,
  onSelect,
  controls,
  children,
}: {
  title: string;
  today: string;
  month: string;
  onMonthChange: (day: string) => void;
  selected?: string;
  onSelect: (day?: string) => void;
  controls?: ReactNode;
  children?: ReactNode;
}) {
  const locale = useLocale();
  const t = useTranslations("ScheduleCalendar");
  const anchor = month;
  const setAnchor = onMonthChange;
  const [focused, setFocused] = useState<string>();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const model = calendarMonth(anchor, locale);
  const date = (day: string) => new Date(`${day}T12:00:00Z`);
  const monthLabel = (day: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date(day));
  const fullLabel = (day: string) =>
    new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(date(day));
  const numbers = new Intl.NumberFormat(locale);
  const possibleFocus = focused ?? selected ?? today;
  const focusKey = model.days.some((day) => day.key === possibleFocus)
    ? possibleFocus
    : model.start;
  function browse(day: string) {
    setAnchor(day);
    setFocused(undefined);
  }
  function choose(day?: string) {
    setAnchor(day ?? today);
    setFocused(day);
    onSelect(day);
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const offset = (date(day).getUTCDay() - model.weekStart + 7) % 7;
    const amount = {
      ArrowLeft: locale === "fa" ? 1 : -1,
      ArrowRight: locale === "fa" ? -1 : 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -offset,
      End: 6 - offset,
    }[event.key];
    let next: string;
    if (amount !== undefined) next = shiftCalendarDay(day, amount);
    else if (event.key === "PageUp" || event.key === "PageDown")
      next = shiftCalendarMonth(day, event.key === "PageUp" ? -1 : 1, locale);
    else return;
    event.preventDefault();
    setAnchor(next);
    setFocused(next);
    requestAnimationFrame(() => buttons.current.get(next)?.focus());
  }
  return (
    <section className="schedule-surface" aria-label={title}>
      <div className="schedule-backdrop" aria-hidden="true" />
      <div className="schedule-body">
        <div className="schedule-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="schedule-pill"
            onClick={() => choose(today)}
          >
            {t("today")}
          </button>
        </div>
        <div className="schedule-tools">
          <label className="schedule-month">
            <CalendarDays size={16} aria-hidden="true" />
            <span className="sr-only">{t("chooseMonth")}</span>
            <select
              aria-label={t("chooseMonth")}
              value={model.start}
              onChange={(e) => browse(e.target.value)}
            >
              {Array.from(
                { length: 25 },
                (_, i) =>
                  calendarMonth(
                    shiftCalendarMonth(anchor, i - 12, locale),
                    locale,
                  ).start,
              ).map((day) => (
                <option key={day} value={day}>
                  {monthLabel(day)}
                </option>
              ))}
            </select>
          </label>
          <div className="schedule-month-arrows">
            <button
              type="button"
              onClick={() => browse(shiftCalendarMonth(anchor, -1, locale))}
              aria-label={t("previousMonth")}
            >
              <ChevronLeft className="rtl:rotate-180" size={18} />
            </button>
            <button
              type="button"
              onClick={() => browse(shiftCalendarMonth(anchor, 1, locale))}
              aria-label={t("nextMonth")}
            >
              <ChevronRight className="rtl:rotate-180" size={18} />
            </button>
          </div>
        </div>
        <div className="schedule-filters">
          <button
            type="button"
            className="schedule-pill"
            aria-pressed={!selected}
            onClick={() => choose()}
          >
            {t("allDates")}
          </button>
          {controls}
        </div>
        <div
          className="schedule-grid"
          role="grid"
          aria-label={monthLabel(anchor)}
        >
          <div className="schedule-week" role="row">
            {Array.from({ length: 7 }, (_, i) => {
              const day = shiftCalendarDay(
                "2026-10-18",
                (model.weekStart + i) % 7,
              );
              return (
                <span
                  role="columnheader"
                  key={i}
                  aria-label={new Intl.DateTimeFormat(locale, {
                    weekday: "long",
                    timeZone: "UTC",
                  }).format(date(day))}
                >
                  {new Intl.DateTimeFormat(locale, {
                    weekday: locale === "fa" ? "narrow" : "short",
                    timeZone: "UTC",
                  }).format(date(day))}
                </span>
              );
            })}
          </div>
          {Array.from({ length: model.days.length / 7 }, (_, row) => (
            <div className="schedule-week" role="row" key={row}>
              {model.days.slice(row * 7, row * 7 + 7).map((day) => (
                <div
                  role="gridcell"
                  key={day.key}
                  aria-selected={selected === day.key}
                >
                  <button
                    ref={(element) => {
                      if (element) buttons.current.set(day.key, element);
                      else buttons.current.delete(day.key);
                    }}
                    type="button"
                    data-day={day.key}
                    data-outside={day.outside}
                    data-selected={selected === day.key}
                    data-today={today === day.key}
                    aria-label={fullLabel(day.key)}
                    aria-current={today === day.key ? "date" : undefined}
                    tabIndex={focusKey === day.key ? 0 : -1}
                    onFocus={() => setFocused(day.key)}
                    onKeyDown={(event) => keyDown(event, day.key)}
                    onClick={() => {
                      choose(day.key);
                      requestAnimationFrame(() =>
                        buttons.current.get(day.key)?.focus(),
                      );
                    }}
                  >
                    {numbers.format(day.day)}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="schedule-selection" role="status">
          {selected ? fullLabel(selected) : t("allDatesHint")}
        </p>
        <div className="schedule-events">{children}</div>
      </div>
    </section>
  );
}
