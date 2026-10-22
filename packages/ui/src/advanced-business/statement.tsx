"use client";
import { useTranslations } from "@repo/i18n";
import { NativeSelectOption } from "../kit/NativeSelect";
import { Card, CardHeader, CardTitle, CardContent } from "../kit/Card";
import type {
  AdvancedData,
  AdvancedSurface,
  BusinessStatement,
} from "@repo/api/advanced-business";
import {
  Field,
  Select,
  Form,
  Money,
  Reason,
  Outcome,
  useFinancialDate,
  value,
} from "./forms";
export function Statement({
  statement: s,
  data,
  surface,
}: {
  statement: BusinessStatement;
  data: AdvancedData;
  surface: AdvancedSurface;
}) {
  const date = useFinancialDate();
  const t = useTranslations("PH5");
  const earnings = data.earnings.filter((e) => e.statement_id === s.id),
    payouts = data.payouts.filter((p) => p.statement_id === s.id);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            {s.coach_name || t("statement")} · {s.branch_name}
          </CardTitle>
          <span className="rounded-full bg-muted px-3 py-1 text-xs">
            {t(s.status)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {date(s.from_on)} — {date(s.to_on)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            {t("earned")}: <Money amount={s.earned_minor} />
          </span>
          <span>
            {t("adjustments")}: <Money amount={s.adjusted_minor} />
          </span>
          <span>
            {t("paid")}: <Money amount={s.paid_minor} />
          </span>
        </div>
        <details>
          <summary className="cursor-pointer font-medium">
            {t("lineItems", { count: earnings.length })}
          </summary>
          <div className="mt-4 grid gap-4">
            {earnings.map((e) => (
              <div key={e.id} className="space-y-3 rounded-2xl border p-4">
                <p className="font-medium">
                  <Money amount={e.amount_minor} />
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {t("source")}: {e.source_key} · {t("contract")}:{" "}
                  {e.contract_id}
                </p>
                {data.adjustments
                  .filter((a) => a.earning_id === e.id)
                  .map((a) => (
                    <p key={a.id} className="text-sm">
                      <Money amount={a.amount_minor} /> · {a.reason}
                    </p>
                  ))}
                {data.disputes
                  .filter((d) => d.earning_id === e.id)
                  .map((d) => (
                    <div
                      key={d.id}
                      className="space-y-3 rounded-xl bg-muted p-3"
                    >
                      <p>{d.reason}</p>
                      <p className="text-sm">{t(d.state)}</p>
                      {d.decision && <p className="text-sm">{d.decision}</p>}
                      {d.state === "open" && surface !== "coach" && (
                        <Form
                          surface={surface}
                          path={`disputes/${d.id}/resolve`}
                          label={t("resolve")}
                          build={(f) => ({
                            revision: d.revision,
                            amountMinor: value(f, "amount"),
                            reason: value(f, "reason"),
                          })}
                        >
                          <Field
                            name="amount"
                            type="number"
                            defaultValue="0"
                            label={t("adjustmentAmount")}
                          />
                          <Reason />
                        </Form>
                      )}
                    </div>
                  ))}
                {!data.disputes.some(
                  (d) => d.earning_id === e.id && d.state === "open",
                ) &&
                  surface !== "admin" && (
                    <details>
                      <summary className="cursor-pointer text-sm">
                        {t("dispute")}
                      </summary>
                      <div className="mt-3">
                        <Form
                          surface={surface}
                          path="disputes"
                          label={t("submitDispute")}
                          build={(f) => ({
                            earningId: e.id,
                            reason: value(f, "reason"),
                          })}
                        >
                          <Reason />
                        </Form>
                      </div>
                    </details>
                  )}
              </div>
            ))}
          </div>
        </details>
        {surface === "business" && s.status === "draft" && (
          <Form
            surface={surface}
            path={`statements/${s.id}/approve`}
            label={t("approve")}
            build={(f) => ({
              revision: s.revision,
              reason: value(f, "reason"),
            })}
          >
            <Reason />
          </Form>
        )}
        {surface === "business" && s.status === "approved" && (
          <details>
            <summary className="cursor-pointer font-medium">
              {t("payout")}
            </summary>
            <div className="mt-4">
              <Form
                surface={surface}
                path={`statements/${s.id}/payout`}
                label={t("recordPayout")}
                build={(f) => ({
                  revision: s.revision,
                  reference: value(f, "reference"),
                  method: value(f, "method"),
                  outcome: value(f, "outcome"),
                  reason: value(f, "reason"),
                })}
              >
                <Field name="reference" label={t("reference")} />
                <Field name="method" label={t("method")}>
                  <Select name="method">
                    <NativeSelectOption value="mock">
                      {t("simulatedPayment")}
                    </NativeSelectOption>
                    <NativeSelectOption value="manual">
                      {t("manualPayment")}
                    </NativeSelectOption>
                  </Select>
                </Field>
                <Outcome />
                <Reason />
              </Form>
            </div>
          </details>
        )}
        {payouts.map((p) => (
          <div key={p.id} className="space-y-3 rounded-2xl bg-muted p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <Money amount={p.amount_minor} />
              <span className="text-sm">{t(p.state)}</span>
            </div>
            <p className="break-all text-xs text-muted-foreground">
              {p.reference}
            </p>
            {p.state === "unknown" && surface === "business" && (
              <Form
                surface={surface}
                path={`payouts/${p.id}/reconcile`}
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
