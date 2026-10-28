"use client";
import { ClubLocationCard } from "./club-location-card";
import type { ReactNode } from "react";
import type { BranchProfileDto } from "@repo/api/catalog";
import { useLocale, useTranslations } from "@repo/i18n";
import { catalogIcon } from "@repo/ui/icons/catalog";
import { SportCard } from "@repo/ui/kit/SportCard";
import { EquipmentDetails } from "@repo/ui/kit/EquipmentCard";
import { BarbellHorizontalIcon } from "@repo/ui/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/kit/Card";

export function BranchInformation({ branch }: { branch: BranchProfileDto }) {
  const t = useTranslations("Catalog");
  const number = new Intl.NumberFormat(useLocale());
  const policy = branch.audiencePolicies;
  const fact = (label: string, content: ReactNode) => (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="text-2xl font-semibold">{label}</h3>
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
      <h2 className="text-2xl font-semibold">
        {t("branchInformation", { branch: branch.name })}
      </h2>
      <ClubLocationCard key={branch.id} branch={branch} />
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
      {branch.sports.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-2xl font-semibold">{t("sports")}</h3>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {branch.sports.map((sport) => (
              <SportCard
                key={sport.id}
                name={sport.name}
                color="var(--primary)"
                className="!text-primary-foreground [&_.sport-card-watermark]:!text-primary-foreground"
                image={sport.imageUrl}
                icon={catalogIcon(sport.iconName)}
              />
            ))}
          </div>
        </section>
      )}
      {branch.equipments.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-2xl font-semibold">{t("equipment")}</h3>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {branch.equipments.map((item) => (
              <EquipmentDetails
                key={item.id}
                label={item.name}
                description={item.description ?? undefined}
                icon={<BarbellHorizontalIcon />}
              />
            ))}
          </div>
        </section>
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
