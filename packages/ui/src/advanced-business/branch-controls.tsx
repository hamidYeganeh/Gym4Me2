"use client";
import { useTranslations } from "@repo/i18n";
import { NativeSelectOption } from "../kit/NativeSelect";
import { Card, CardHeader, CardTitle, CardContent } from "../kit/Card";
import type {
  AdvancedData,
  AdvancedSurface,
} from "@repo/api/advanced-business";
import { Field, Select, Form, Money, Reason, value } from "./forms";
export function PriceSettings({
  surface,
  org,
  data,
  owner,
  canManage,
}: {
  surface: AdvancedSurface;
  org: string;
  data: AdvancedData;
  owner: boolean;
  canManage: boolean;
}) {
  const t = useTranslations("PH5");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("priceTemplates")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-sm text-muted-foreground">{t("priceHint")}</p>
        <Form
          surface={surface}
          path="prices"
          disabled={!data.subscription?.advanced_finance || !canManage}
          label={t("savePrice")}
          build={(f) => {
            const branchId =
                value(f, "branch") === "base" ? undefined : value(f, "branch"),
              kind = value(f, "kind");
            return {
              organizationId: org,
              branchId,
              kind,
              amountMinor: value(f, "amount"),
              revision:
                data.prices?.find(
                  (p) => p.kind === kind && p.branch_id === (branchId ?? null),
                )?.revision ?? 0,
              reason: value(f, "reason"),
            };
          }}
        >
          <Field name="branch" label={t("branch")}>
            <Select
              name="branch"
              defaultValue={owner ? "base" : data.branches[0]?.id}
            >
              <NativeSelectOption value="base">
                {t("basePrice")}
              </NativeSelectOption>
              {data.branches.map((b) => (
                <NativeSelectOption key={b.id} value={b.id}>
                  {b.name}
                </NativeSelectOption>
              ))}
            </Select>
          </Field>
          <Field name="kind" label={t("serviceKind")}>
            <Select name="kind">
              {(
                [
                  "class",
                  "course",
                  "court",
                  "access",
                  "membership",
                  "program",
                ] as const
              ).map((k) => (
                <NativeSelectOption key={k} value={k}>
                  {t(k)}
                </NativeSelectOption>
              ))}
            </Select>
          </Field>
          <Field name="amount" type="number" min="0" label={t("price")} />
          <Reason />
        </Form>
        <div className="mt-5 grid gap-3">
          {data.prices?.map((p) => (
            <p key={`${p.kind}:${p.branch_id}`} className="text-sm">
              {data.branches.find((b) => b.id === p.branch_id)?.name ??
                t("basePrice")}{" "}
              · {t(p.kind)} · <Money amount={p.amount_minor} />
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
export function SharedMemberships({
  surface,
  data,
  owner,
}: {
  surface: AdvancedSurface;
  data: AdvancedData;
  owner: boolean;
}) {
  const t = useTranslations("PH5");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("sharedMembership")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">{t("sharedHint")}</p>
        {data.memberships.map((m) => (
          <details key={m.id} className="rounded-2xl border p-4">
            <summary className="cursor-pointer">
              {m.display_name} · {m.title} · {m.consumed}/{m.granted ?? "∞"}
            </summary>
            <div className="mt-5">
              {data.allocations.some((a) => a.membership_id === m.id) ? (
                <div className="grid gap-3">
                  {data.allocations
                    .filter((a) => a.membership_id === m.id)
                    .map((a) => (
                      <p key={a.branch_id}>
                        {data.branches.find((b) => b.id === a.branch_id)?.name}{" "}
                        · {a.basis_points / 100}% ·{" "}
                        <Money amount={a.amount_minor} />
                      </p>
                    ))}
                </div>
              ) : (
                <Form
                  surface={surface}
                  path="memberships"
                  label={t("shareMembership")}
                  disabled={!owner || !data.subscription?.advanced_finance}
                  build={(f) => ({
                    membershipId: m.id,
                    revision: m.revision,
                    services: f.getAll("services").map(String),
                    allocations: data.branches
                      .map((b) => ({
                        branchId: b.id,
                        basisPoints: Number(value(f, b.id) || "0"),
                      }))
                      .filter((a) => a.basisPoints > 0),
                    reason: value(f, "reason"),
                  })}
                >
                  <div className="grid gap-3">
                    {data.services
                      ?.filter(
                        (s) => !["membership", "program"].includes(s.kind),
                      )
                      .map((s) => (
                        <label
                          key={s.id}
                          className="flex items-start gap-3 text-sm"
                        >
                          <input
                            name="services"
                            type="checkbox"
                            value={s.id}
                            className="mt-1"
                          />
                          {s.title} ·{" "}
                          {
                            data.branches.find((b) => b.id === s.branch_id)
                              ?.name
                          }
                        </label>
                      ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("allocationHint")}
                  </p>
                  {data.branches.map((b) => (
                    <Field
                      key={b.id}
                      label={b.name}
                      name={b.id}
                      type="number"
                      min="0"
                      max="10000"
                      defaultValue={b.id === m.branch_id ? "10000" : "0"}
                    />
                  ))}
                  <Reason />
                </Form>
              )}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
