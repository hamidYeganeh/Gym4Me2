"use client";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "@repo/i18n";
import { ServiceCoverThumbnail } from "@repo/ui/sports-cover";
import type { ServiceCoverDto } from "@repo/api/sports";
import { Price, StatusBadge, stamp } from "./common";
import "./reservation-design.css";

export function ReservationSummary({
  title,
  venue,
  startAt,
  endAt,
  amountMinor,
  state,
  cover,
  orderTotal = false,
}: {
  title: string;
  venue?: string;
  startAt?: string;
  endAt?: string;
  amountMinor?: string;
  state?: string;
  cover?: ServiceCoverDto | null;
  orderTotal?: boolean;
}) {
  const t = useTranslations("ReservationUI"),
    locale = useLocale();
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  return (
    <section className="reservation-summary" aria-label={t("summary")}>
      <div className="reservation-summary-heading">
        <div className="min-w-0 flex-1">
          {state && <StatusBadge state={state} />}
          <h2>{title}</h2>
          {venue && (
            <p className="reservation-meta">
              <MapPin aria-hidden="true" size={16} />
              <span>{venue}</span>
            </p>
          )}
        </div>
        <div className="reservation-thumbnail" aria-hidden="true">
          <ServiceCoverThumbnail cover={cover ?? null} />
        </div>
      </div>
      {startAt && (
        <div className="reservation-schedule">
          <CalendarDays aria-hidden="true" size={21} />
          <div>
            <p>{stamp(startAt, locale)}</p>
            {endAt && (
              <p className="reservation-meta">
                <Clock3 aria-hidden="true" size={14} />
                <span>
                  {time(startAt)} – {time(endAt)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}
      {amountMinor !== undefined && (
        <div className="reservation-total">
          <span>{t(orderTotal ? "orderTotal" : "total")}</span>
          <strong>
            <Price value={amountMinor} />
          </strong>
        </div>
      )}
    </section>
  );
}
