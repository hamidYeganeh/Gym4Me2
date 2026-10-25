"use client";
import { useTranslations } from "@repo/i18n";
import { useGrowthQuery } from "@repo/api/growth";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { Field } from "../advanced-business/forms";
import { QueryError } from "../account/common";
import { GrowthForm } from "./form";
import type { Recommendations } from "./discovery";
type Offer = {
  id: string;
  occurrence_id: string;
  title: string;
  start_at: string;
  discount_basis_points: number;
  max_uses: number;
  ends_at: string;
  revision: number;
  active: boolean;
};
export function OfferManager({
  organizationId,
  branchId,
}: {
  organizationId: string;
  branchId: string;
}) {
  const t = useTranslations("Growth"),
    q = useGrowthQuery<Offer[]>("business/offers", {
      organizationId,
      branchId,
    }),
    available = useGrowthQuery<Recommendations>("sports/recommendations", {
      branchId,
    });
  return (
    <section className="grid gap-4 rounded-2xl border p-4">
      <h2 className="text-xl font-semibold">{t("offerManagement")}</h2>
      <p>{t("offerHint")}</p>
      {q.error && <QueryError error={q.error} retry={() => void q.refetch()} />}
      <GrowthForm
        path="business/offers"
        label={t("save")}
        build={(f) => ({
          occurrenceId: String(f.get("occurrenceId")),
          discountBasisPoints: Number(f.get("discount")) * 100,
          maxUses: Number(f.get("maxUses")),
          endsAt: new Date(String(f.get("endsAt"))).toISOString(),
          revision: 0,
          active: true,
        })}
      >
        <Field name="occurrenceId" label={t("session")}>
          <NativeSelect name="occurrenceId" required>
            <NativeSelectOption value="">{t("choose")}</NativeSelectOption>
            {available.data?.items
              .filter((o) => !q.data?.some((g) => g.occurrence_id === o.id))
              .map((o) => (
                <NativeSelectOption key={o.id} value={o.id}>
                  {o.title} · {o.start_at}
                </NativeSelectOption>
              ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="discount"
            type="number"
            min="1"
            max="50"
            label={t("discountPercent")}
          />
          <Field
            name="maxUses"
            type="number"
            min="1"
            max="10000"
            label={t("maxUses")}
          />
          <Field name="endsAt" type="datetime-local" label={t("offerEnds")} />
        </div>
      </GrowthForm>
      {q.data?.map((o) => (
        <div
          key={`${o.id}:${o.revision}`}
          className="grid gap-3 rounded-xl bg-muted p-4"
        >
          <h3 className="font-semibold">{o.title}</h3>
          <p>
            {t("discountPercent")}: {o.discount_basis_points / 100} ·{" "}
            {t("maxUses")}: {o.max_uses}
          </p>
          {o.active && (
            <GrowthForm
              path="business/offers"
              label={t("stopOffer")}
              build={() => ({
                occurrenceId: o.occurrence_id,
                discountBasisPoints: o.discount_basis_points,
                maxUses: o.max_uses,
                endsAt: o.ends_at,
                revision: o.revision,
                active: false,
              })}
            >
              <p>{t("preserveOrders")}</p>
            </GrowthForm>
          )}
        </div>
      ))}
    </section>
  );
}
