"use client";
import { useLocale, useTranslations } from "@repo/i18n";
import type { OfferingDto, PolicyDto } from "@repo/api/sports";

/** Render the conditions actually used by the server, including historical snapshots. */
export function PurchaseConditions({
  kind,
  policy,
  offering,
  approvalRequired,
}: {
  kind?: string;
  policy: PolicyDto;
  offering?: OfferingDto;
  approvalRequired?: boolean;
}) {
  const t = useTranslations("PurchaseConditions");
  const locale = useLocale();
  const number = (value: number) => new Intl.NumberFormat(locale).format(value);
  const lines: string[] = [];
  if (kind === "program") {
    lines.push(
      offering
        ? t("delivery", { days: number(offering.deliveryDays) })
        : t("programTerms"),
    );
    if (offering)
      lines.push(t("support", { days: number(offering.supportDays) }));
    if (offering?.maxRevisions != null)
      lines.push(t("revisions", { count: number(offering.maxRevisions) }));
    if (offering?.responseHours != null)
      lines.push(t("response", { hours: number(offering.responseHours) }));
    lines.push(t("programCancellation"));
  } else {
    if (kind === "membership") lines.push(t("membershipCancellation"));
    else {
      lines.push(
        policy.cancellationHours === 0
          ? t("cancelUntilStart")
          : t("cancelBefore", { hours: number(policy.cancellationHours) }),
      );
      lines.push(
        t("lateRefund", {
          percent: number(policy.lateRefundBasisPoints / 100),
        }),
      );
      lines.push(
        t(
          policy.noShowConsumesSession ? "absenceConsumes" : "absencePreserves",
        ),
      );
    }
    if (kind === "membership") {
      lines.push(
        t(offering?.entryAllowed === false ? "entryExcluded" : "entryIncluded"),
      );
      lines.push(
        t("coveredServices", {
          count: number(offering?.includedServiceIds?.length ?? 0),
        }),
      );
      if (policy.freezeDays > 0)
        lines.push(t("freeze", { days: number(policy.freezeDays) }));
    }
    if (offering?.confirmation === "before_payment")
      lines.push(t("confirmBeforePayment"));
    else if (approvalRequired) lines.push(t("approvalRequired"));
  }
  return (
    <section className="luma-group p-4 my-5" aria-label={t("title")}>
      <h2 className="font-semibold mb-3">{t("title")}</h2>
      <ul className="list-disc ps-5 space-y-2 text-sm leading-7">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <details className="service-conditions mt-3">
        <summary>{t("fullTerms")}</summary>
        <p className="luma-meta whitespace-pre-wrap">{policy.terms}</p>
      </details>
    </section>
  );
}
