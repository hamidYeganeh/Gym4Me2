"use client";
import { useState } from "react";
import { useTranslations } from "@repo/i18n";
import type {
  AdvancedData,
  AdvancedSurface,
  BusinessPlan,
} from "@repo/api/advanced-business";
import { Card, CardHeader, CardTitle, CardContent } from "../kit/Card";
import { NativeSelectOption } from "../kit/NativeSelect";
import {
  Field,
  Select,
  Form,
  Money,
  Reason,
  Outcome,
  value,
  useFinancialDate,
} from "./forms";
export function PlanControls({
  surface,
  organizationId,
  data,
  owner,
}: {
  surface: AdvancedSurface;
  organizationId: string;
  data: AdvancedData;
  owner: boolean;
}) {
  const date = useFinancialDate();
  const t = useTranslations("PH5");
  return (
    <>
      <p className="rounded-2xl bg-muted p-4 text-sm">{t("downgradeHint")}</p>
      {data.subscription?.expires_at && (
        <p className="text-sm text-muted-foreground">
          {t("expiresOn", { date: date(data.subscription.expires_at) })}
        </p>
      )}
      {data.planPayments?.map((p) => (
        <Card key={p.id}>
          <CardContent className="space-y-4 py-5">
            <p>
              {t(p.plan_code)} · <Money amount={p.amount_minor} /> ·{" "}
              {t(p.state)}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {p.reference}
            </p>
            {p.state === "unknown" && owner && (
              <Form
                surface={surface}
                path={`plan-payments/${p.id}/reconcile`}
                label={t("reconcile")}
                build={(f) => ({
                  outcome: value(f, "result"),
                  reason: value(f, "reason"),
                })}
              >
                <Field name="result" label={t("finalResult")}>
                  <Select name="result">
                    <NativeSelectOption value="succeeded">
                      {t("succeeded")}
                    </NativeSelectOption>
                    <NativeSelectOption value="failed">
                      {t("failed")}
                    </NativeSelectOption>
                  </Select>
                </Field>
                <Reason />
              </Form>
            )}
          </CardContent>
        </Card>
      ))}
      <div className="grid gap-5 md:grid-cols-2">
        {data.plans.map((p) => (
          <Card key={p.code}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{t(p.code)}</CardTitle>
                {data.subscription?.plan_code === p.code && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                    {t("currentPlan")}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="text-2xl font-semibold">
                <Money amount={p.amount_minor} />
                <span className="ms-2 text-xs text-muted-foreground">
                  {t("monthly")}
                </span>
              </div>
              <p className="text-sm">
                {t("branchAllowance", { count: p.branch_limit })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(p.advanced_finance ? "proFeatures" : "basicFeatures")}
              </p>
              <details>
                <summary className="cursor-pointer text-sm">
                  {t("terms")}
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t(p.code === "basic" ? "basicTerms" : "proTerms")}
                </p>
              </details>
              {surface === "admin" ? (
                <Form
                  surface={surface}
                  path="catalog"
                  disabled={p.code === "basic"}
                  label={t("savePrice")}
                  build={(f) => ({
                    code: p.code,
                    amountMinor: value(f, "amount"),
                    branchLimit: Number(value(f, "limit")),
                    revision: p.revision,
                    reason: value(f, "reason"),
                  })}
                >
                  <Field
                    name="amount"
                    type="number"
                    min="0"
                    label={t("price")}
                    defaultValue={p.amount_minor}
                  />
                  <Field
                    name="limit"
                    type="number"
                    min="1"
                    max="1000"
                    label={t("branchLimitLabel")}
                    defaultValue={String(p.branch_limit)}
                  />
                  <Reason />
                </Form>
              ) : (
                <Activation
                  surface={surface}
                  organizationId={organizationId}
                  data={data}
                  plan={p}
                  owner={owner}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
function Activation({
  surface,
  organizationId,
  data,
  plan: p,
  owner,
}: {
  surface: AdvancedSurface;
  organizationId: string;
  data: AdvancedData;
  plan: BusinessPlan;
  owner: boolean;
}) {
  const t = useTranslations("PH5");
  const [months, setMonths] = useState("1");
  const count = Math.max(1, Math.min(12, Number(months) || 1));
  return (
    <Form
      surface={surface}
      path="plan"
      label={t("activate")}
      disabled={!owner}
      build={(f) => ({
        organizationId,
        plan: p.code,
        revision: data.subscription?.revision ?? 1,
        catalogRevision: p.revision,
        outcome: value(f, "outcome"),
        months: Number(months),
        acceptTerms: f.get("accept") === "on",
        reason: value(f, "reason"),
      })}
    >
      <Field name="months" label={t("months")}>
        <input
          className="min-h-11 rounded-xl border bg-background px-3"
          type="number"
          name="months"
          min="1"
          max="12"
          required
          value={months}
          onChange={(e) => setMonths(e.target.value)}
        />
      </Field>
      <p className="text-sm">
        {t("totalDue")}:{" "}
        <Money amount={(BigInt(p.amount_minor) * BigInt(count)).toString()} />
      </p>
      <Outcome />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="accept" required className="mt-1" />
        {t("acceptTerms")}
      </label>
      <Reason />
    </Form>
  );
}
