"use client";
import { useLocale, useTranslations } from "@repo/i18n";
import type { BranchProfileDto } from "@repo/api/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";
import { catalogDate, catalogInterval } from "../../lib/catalog-hours";
import { BranchInformation } from "./branch-information";

export function ClubAvailability({ branch }: { branch?: BranchProfileDto }) {
  const t = useTranslations("Catalog");
  const locale = useLocale();
  const days = [
    "day0",
    "day1",
    "day2",
    "day3",
    "day4",
    "day5",
    "day6",
  ] as const;
  if (!branch) return null;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("openingHours")}</CardTitle>
          <p className="text-xs leading-6 text-muted-foreground">
            {t("branchUpdated", { branch: branch.name })}{" "}
            <time dateTime={branch.updatedAt}>
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: branch.timezone,
              }).format(new Date(branch.updatedAt))}
            </time>
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {branch.openingHours.weekly.map((row, index) => (
            <p
              key={index}
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span>
                {t(days[row.dayOfWeek] ?? "day0")} ·{" "}
                {t(`audience_${row.audience}`)}
              </span>
              <span dir="ltr">{catalogInterval(row, locale)}</span>
            </p>
          ))}
          {branch.openingHours.exceptions.map((row) => (
            <div
              key={`${row.date}:${row.audience}`}
              className="border-t border-border pt-3 text-sm"
            >
              <p>
                <time dateTime={row.date}>{catalogDate(row.date, locale)}</time>{" "}
                · {t(`audience_${row.audience}`)} ·{" "}
                {row.isClosed
                  ? t("closed")
                  : row.intervals.map((interval, index) => (
                      <span
                        key={`${interval.startMinute}:${interval.endMinute}`}
                      >
                        {index > 0 ? " · " : ""}
                        <bdi dir="ltr">{catalogInterval(interval, locale)}</bdi>
                      </span>
                    ))}
              </p>
              {row.reason && (
                <p className="text-muted-foreground">{row.reason}</p>
              )}
            </div>
          ))}
          {branch.rules && (
            <p className="whitespace-pre-line border-t border-border pt-3 text-sm">
              {branch.rules}
            </p>
          )}
          {branch.visitInstructions && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {branch.visitInstructions}
            </p>
          )}
          {branch.location.coordinates && (
            <a
              className="text-sm underline"
              href={`https://www.google.com/maps/search/?api=1&query=${branch.location.coordinates.join(",")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("directions")}
            </a>
          )}
        </CardContent>
      </Card>
      <BranchInformation branch={branch} />
    </section>
  );
}
