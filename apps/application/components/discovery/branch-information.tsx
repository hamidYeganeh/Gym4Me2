"use client";
import type { ReactNode } from "react";
import type { BranchProfileDto } from "@repo/api/catalog";
import { useLocale, useTranslations } from "@repo/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";

export function BranchInformation({ branch }: { branch: BranchProfileDto }) {
  const t = useTranslations("Catalog");
  const number = new Intl.NumberFormat(useLocale());
  const policy = branch.audiencePolicies;
  const fact = (label: string, content: ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{label}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-7 [overflow-wrap:anywhere]">
        {content}
      </CardContent>
    </Card>
  );
  const missing = (
    <span className="text-muted-foreground">{t("notDeclared")}</span>
  );
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label={t("branchInformation", { branch: branch.name })}
    >
      <h2 className="text-xl font-semibold">
        {t("branchInformation", { branch: branch.name })}
      </h2>
      {fact(t("operatingStatus"), t(`operating_${branch.operatingStatus}`))}
      {fact(t("address"), branch.location.address || missing)}
      {fact(
        t("branchContact"),
        branch.phones.length ? (
          <ul>
            {branch.phones.map((phone, index) => (
              <li key={index}>
                {phone.label && <span>{phone.label}: </span>}
                <a
                  className="inline-flex min-h-11 min-w-11 items-center underline"
                  href={`tel:${phone.number.replace(/[^+\d]/g, "")}`}
                >
                  <bdi>{phone.number}</bdi>
                </a>
                {phone.extension && (
                  <>
                    {" "}
                    · {t("extension")} <bdi>{phone.extension}</bdi>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : (
          missing
        ),
      )}
      {fact(
        t("sports"),
        branch.sports.length
          ? branch.sports.map((item) => item.name).join(" · ")
          : missing,
      )}
      {fact(
        t("equipment"),
        branch.equipments.length ? (
          <ul className="grid gap-2">
            {branch.equipments.map((item) => (
              <li key={item.id}>
                {item.name}
                {item.quantity !== null
                  ? ` · ${t("equipmentCount", { count: number.format(item.quantity) })}`
                  : ""}
                {item.description && (
                  <p className="whitespace-pre-line">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          missing
        ),
      )}
      {fact(
        t("facilities"),
        branch.amenities.length ? (
          <ul className="grid gap-2">
            {branch.amenities.map((item) => (
              <li key={item.id}>
                {item.name} ·{" "}
                {item.availability === "included"
                  ? t("includedAmenity")
                  : item.availability === "paid"
                    ? t("paidAmenity")
                    : item.availability === "unavailable"
                      ? t("unavailableAmenity")
                      : t("notDeclared")}
                {item.description && (
                  <p className="whitespace-pre-line">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          missing
        ),
      )}
      {fact(
        t("accessibility"),
        branch.accessibilityFeatures.length ? (
          <ul className="grid gap-2">
            {branch.accessibilityFeatures.map((item) => (
              <li key={item.id}>
                {item.name}
                {item.description && (
                  <p className="whitespace-pre-line">{item.description}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          missing
        ),
      )}
      {fact(
        t("audiencePolicy"),
        policy ? (
          <div className="grid gap-2">
            <p>
              {policy.audiences.length
                ? policy.audiences
                    .map((value) => t(`audience_${value}`))
                    .join(" · ")
                : missing}
            </p>
            {policy.minimumAge !== null && (
              <p>
                {t("minimumAge", { age: number.format(policy.minimumAge) })}
              </p>
            )}
            {policy.maximumAge !== null && (
              <p>
                {t("maximumAge", { age: number.format(policy.maximumAge) })}
              </p>
            )}
            {policy.notes && (
              <p className="whitespace-pre-line">{policy.notes}</p>
            )}
          </div>
        ) : (
          missing
        ),
      )}
    </section>
  );
}
