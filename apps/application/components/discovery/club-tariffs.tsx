"use client";
import { useLocale, useTranslations } from "@repo/i18n";
import type { TariffDto } from "@repo/api/catalog";
import { Card, CardHeader, CardTitle, CardContent } from "@repo/ui/kit/Card";
export function ClubTariffs({ tariffs }: { tariffs: TariffDto[] }) {
  const locale = useLocale();
  const t = useTranslations("Tariffs");
  const number = new Intl.NumberFormat(locale);
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      {!tariffs.length && (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {tariffs.map((tariff) => (
        <Card key={tariff.versionId}>
          <CardHeader>
            <CardTitle>{tariff.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-lg font-semibold">
              {number.format(tariff.priceToman)} {t("toman")} /{" "}
              {t(`unit_${tariff.unit}`)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(`service_${tariff.serviceType}`)}
              {tariff.durationDays
                ? ` · ${t("validDays", { count: number.format(tariff.durationDays) })}`
                : ""}
              {tariff.sessionCount
                ? ` · ${t("sessionAllowance", { count: number.format(tariff.sessionCount) })}`
                : ""}
            </p>
            {tariff.includedServices?.length ? (
              <ul className="list-inside list-disc text-sm">
                {tariff.includedServices.map((service, index) => (
                  <li key={index}>{service}</li>
                ))}
              </ul>
            ) : null}
            <p className="whitespace-pre-line text-sm">{tariff.conditions}</p>
            <p className="text-xs text-muted-foreground">
              {t("version", { version: number.format(tariff.version) })} ·{" "}
              {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeZone: "Asia/Tehran",
              }).format(new Date(tariff.effectiveFrom))}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
