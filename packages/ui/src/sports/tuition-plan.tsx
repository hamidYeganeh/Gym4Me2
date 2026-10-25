"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "@repo/i18n";

import { useSportsCommand, useSportsQuery } from "@repo/api/sports";
import { normalizeLoginDigits } from "../account/login-validation";
import { IranianDateInput } from "../kit/IranianDateInput";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { FormField } from "./shared";
import { QueryError } from "./query-error";
type Installment = {
  id: string;
  ordinal: number;
  dueOn: string;
  amountMinor: string;
  remainingMinor: string;
  overdue: boolean;
  activation: string;
  graceDays: number;
};
export function TuitionPlan({
  orderId,
  business = false,
  organizationId,
  amountMinor,
  status,
}: {
  orderId: string;
  business?: boolean;
  organizationId?: string;
  amountMinor?: string;
  status?: string;
}) {
  const t = useTranslations("Closure"),
    w = useTranslations("Workflow"),
    locale = useLocale(),
    [count, setCount] = useState(2),
    key = useRef(crypto.randomUUID());
  const organizations = useSportsQuery<{ id: string; role: string }[]>(
    "business/organizations",
    undefined,
    business,
  );
  const canCreate =
    business &&
    ["owner", "manager", "accountant"].includes(
      organizations.data?.find((o) => o.id === organizationId)?.role ?? "",
    );
  const path = business
    ? `business/collections/orders/${orderId}`
    : `profile/tuition/${orderId}`;
  const query = useSportsQuery<Installment[]>(path),
    command = useSportsCommand(`business/collections/orders/${orderId}`);
  if (query.error?.status === 403) return null;
  const money = (v: string) =>
    `${new Intl.NumberFormat(locale).format(BigInt(v) / BigInt(10))} ${t("toman")}`;
  return (
    <section className="rounded-2xl border my-4 p-4 grid gap-3">
      <h3>{t("installments")}</h3>
      <QueryError error={query.error} />
      {query.data?.[0] && (
        <p>
          {t("activation")}: {t(query.data[0].activation === "after_first" ? "afterFirst" : "afterFull")}
          {" · "}{t("graceDays")}: {query.data[0].graceDays}
        </p>
      )}
      {query.data?.map((d) => (
        <article className="border-b py-2" key={d.id}>
          <p>
            {t("installmentNumber", { number: d.ordinal })} ·{" "}
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeZone: "Asia/Tehran",
            }).format(new Date(`${d.dueOn}T12:00:00+03:30`))}
          </p>
          <p>
            {money(d.amountMinor)} · {t("remaining")}: {money(d.remainingMinor)}
          </p>
          {d.overdue && <p role="status">{t("installmentOverdue")}</p>}
        </article>
      ))}
      {query.data?.length === 0 && <p>{t("noInstallments")}</p>}
      {canCreate &&
        query.data?.length === 0 &&
        amountMinor &&
        ["awaiting_payment", "partially_paid"].includes(status ?? "") && (
          <details>
            <summary>{t("createInstallments")}</summary>
            <form
              className="grid gap-3 my-3"
              onChange={() => {
                key.current = crypto.randomUUID();
                command.reset();
              }}
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const installments = Array.from({ length: count }, (_, i) => ({
                  dueOn: f.get(`due-${i}`),
                  amountMinor: (
                    BigInt(normalizeLoginDigits(String(f.get(`amount-${i}`)))) *
                    BigInt(10)
                  ).toString(),
                }));
                command.mutate({
                  activation: f.get("activation"),
                  graceDays: Number(
                    normalizeLoginDigits(String(f.get("grace"))),
                  ),
                  installments,
                  reason: f.get("reason"),
                  idempotencyKey: key.current,
                });
              }}
            >
              <p>
                {t("planHint")} {money(amountMinor)}
              </p>
              <FormField label={t("installmentCount")}>
                <NativeSelect
                  value={String(count)}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                    <NativeSelectOption value={String(n)} key={n}>
                      {n}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label={t("activation")}>
                <NativeSelect name="activation">
                  <NativeSelectOption value="after_full">
                    {t("afterFull")}
                  </NativeSelectOption>
                  <NativeSelectOption value="after_first">
                    {t("afterFirst")}
                  </NativeSelectOption>
                </NativeSelect>
              </FormField>
              <FormField label={t("graceDays")}>
                <Input
                  name="grace"
                  type="number"
                  min={0}
                  max={30}
                  defaultValue={0}
                  required
                />
              </FormField>
              {Array.from({ length: count }, (_, i) => (
                <fieldset className="grid gap-2 border rounded-xl p-3" key={i}>
                  <legend>{t("installmentNumber", { number: i + 1 })}</legend>
                  <FormField label={w("amount")}>
                    <Input
                      name={`amount-${i}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9۰-۹٠-٩]+"
                      required
                    />
                  </FormField>
                  <FormField label={t("dueOn")}>
                    <IranianDateInput name={`due-${i}`} required />
                  </FormField>
                </fieldset>
              ))}
              <FormField label={w("reason")}>
                <Input name="reason" minLength={3} maxLength={1000} required />
              </FormField>
              <Button disabled={command.isPending}>{w("save")}</Button>
              <QueryError error={command.error} />
            </form>
          </details>
        )}
    </section>
  );
}
