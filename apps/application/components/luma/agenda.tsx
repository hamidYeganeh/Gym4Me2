"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Clock3,
  MapPin,
  QrCode,
  ArrowUpLeft,
  Dumbbell,
} from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useTrainingQuery } from "@repo/api/profile";
import { useSportsQuery, type BookingPageDto } from "@repo/api/sports";
import { agendaGroups, type AgendaView } from "@repo/ui/lib/agenda";
import { useListState } from "@repo/ui/hooks/use-list-state";
import { Empty, QueryState, Segments, StatusBadge, useLuma } from "./common";
const isView = (value: unknown): value is AgendaView =>
  value === "today" || value === "week" || value === "allDates";
export function PersonalAgenda() {
  const t = useTranslations("LumaDesign"),
    luma = useLuma(),
    locale = useLocale();
  const [view, setView] = useListState<AgendaView>(
    "agenda-view",
    "allDates",
    isView,
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  const bookings = useSportsQuery<BookingPageDto>(
    "sports/account/bookings/page",
    { tab: "upcoming", limit: 20 },
  );
  const training = useTrainingQuery<{
    active: { id: string; title: string } | null;
    plan: { id?: string; title: string } | null;
  }>("profile/training/home-summary");
  const groups = agendaGroups(bookings.data?.items ?? [], view, now);
  const active = training.data?.active,
    plan = training.data?.plan;
  const workoutHref = active
    ? `/training/workout?id=${active.id}`
    : plan?.id
      ? `/training/workout?assignment=${plan.id}&day=0`
      : "/training";
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Tehran",
  });
  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "Asia/Tehran",
  });
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tehran",
  });
  return (
    <section className="personal-agenda" aria-label={t("schedule")}>
      <div className="agenda-intro">
        <div>
          <h2>{t("schedule")}</h2>
          <p className="luma-meta">{t("agendaHint")}</p>
        </div>
        <Link
          className="luma-icon"
          href="/bookings"
          aria-label={luma("yourBookings")}
        >
          <CalendarDays size={21} />
        </Link>
      </div>
      <Segments
        value={view}
        onChange={(value) => {
          if (isView(value)) setView(value);
        }}
        options={(["today", "week", "allDates"] as const).map((value) => ({
          value,
          label: t(value),
        }))}
      />
      <QueryState query={training} compact>
        <article className="agenda-workout">
          <Link className="agenda-workout-main" href={workoutHref}>
            <Image
              src="/images/clubs/training.webp"
              alt=""
              width={72}
              height={72}
            />
            <div>
              <span className="agenda-eyebrow">
                <Dumbbell size={13} />
                {active ? t("ongoing") : t("nextWorkout")}
              </span>
              <h3>{active?.title ?? plan?.title ?? t("yourDay")}</h3>
              <span className="luma-meta">
                {active ? luma("continue") : t("openTraining")}
              </span>
            </div>
            <ArrowUpLeft className="ltr:rotate-90" size={20} />
          </Link>
        </article>
      </QueryState>
      <QueryState query={bookings} compact>
        {groups.map(({ day, entries }) => (
          <section className="agenda-day" key={day}>
            <h3>
              <span>{dayFormatter.format(new Date(`${day}T12:00:00Z`))}</span>
              <span className="agenda-weekday">
                {" "}
                / {weekday.format(new Date(`${day}T12:00:00Z`))}
              </span>
            </h3>
            <div>
              {entries.map((item) => (
                <article className="agenda-entry" key={item.id}>
                  <Link
                    href={`/bookings/detail?id=${item.id}`}
                    className="agenda-entry-main"
                  >
                    <span className="agenda-calendar" aria-hidden="true">
                      <small>
                        {new Intl.DateTimeFormat(locale, {
                          month: "short",
                          timeZone: "Asia/Tehran",
                        }).format(new Date(item.startAt))}
                      </small>
                      <strong>
                        {new Intl.DateTimeFormat(locale, {
                          day: "numeric",
                          timeZone: "Asia/Tehran",
                        }).format(new Date(item.startAt))}
                      </strong>
                    </span>
                    <span className="agenda-entry-copy">
                      <StatusBadge state={item.status} />
                      <strong>{item.title}</strong>
                      <span className="luma-meta">
                        <Clock3 size={14} />
                        {time.format(new Date(item.startAt))}
                        <span>·</span>
                        <MapPin size={14} />
                        {item.branchName}
                      </span>
                    </span>
                  </Link>
                  {item.status === "confirmed" && (
                    <Link
                      className="agenda-ticket"
                      href={`/tickets/view?id=${item.id}`}
                      aria-label={`${luma("ticket")} · ${item.title}`}
                    >
                      <QrCode size={19} />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
        {!groups.length && (
          <Empty compact>
            <span>{t("noAgenda")}</span>
            <Link href="/services">{t("planSomething")}</Link>
          </Empty>
        )}
        <Link href="/bookings" className="agenda-view-all">
          {luma("yourBookings")}{" "}
          <ArrowUpLeft size={15} className="ltr:rotate-90" />
        </Link>
      </QueryState>
    </section>
  );
}
