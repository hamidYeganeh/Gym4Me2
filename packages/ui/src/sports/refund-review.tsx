"use client";
import { useRef } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { useSportsCommand, useSportsQuery } from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { IranianDateInput } from "../kit/IranianDateInput";
import { FormField } from "./shared";
import { QueryError } from "./query-error";
type Refund = {
  id: string;
  displayName: string;
  title: string;
  amountMinor: string;
  state: string;
  reference: string | null;
  returnedOn: string | null;
};
export function RefundReview({ org, branch }: { org: string; branch: string }) {
  const t = useTranslations("Closure");
  const query = useSportsQuery<Refund[]>("business/sports-workflows/refunds", {
    organizationId: org,
    branchId: branch,
  });
  if (query.error?.status === 403) return null;
  return (
    <section className="grid gap-4">
      <h2>{t("refunds")}</h2>
      <QueryError error={query.error} />
      {query.data?.map((r) => (
        <RefundRow key={r.id} refund={r} />
      ))}
    </section>
  );
}
function RefundRow({ refund: r }: { refund: Refund }) {
  const t = useTranslations("Closure"),
    w = useTranslations("Workflow"),
    locale = useLocale(),
    key = useRef(crypto.randomUUID());
  const command = useSportsCommand(
    `business/sports-workflows/refunds/${r.id}/settlement`,
  );
  return (
    <article className="border rounded-2xl p-4 grid gap-3">
      <h3>
        {r.displayName} · {r.title}
      </h3>
      <p>
        {new Intl.NumberFormat(locale).format(
          BigInt(r.amountMinor) / BigInt(10),
        )}{" "}
        {t("toman")}
      </p>
      {r.state === "succeeded" ? (
        <>
          <p>{t("refundRecorded")}</p>
          <p dir="ltr">{r.reference}</p>
        </>
      ) : (
        <form
          className="grid gap-3"
          onChange={() => {
            key.current = crypto.randomUUID();
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            command.mutate({
              method: f.get("method"),
              reference: f.get("reference"),
              returnedOn: f.get("date"),
              reason: f.get("reason"),
              idempotencyKey: key.current,
            });
          }}
        >
          <p>{t("refundHint")}</p>
          <FormField label={w("method")}>
            <NativeSelect name="method">
              {(["cash", "pos", "bank_transfer"] as const).map((m) => (
                <NativeSelectOption key={m} value={m}>
                  {w(m)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label={w("reference")}>
            <Input name="reference" minLength={3} maxLength={120} required />
          </FormField>
          <FormField label={t("returnedAt")}>
            <IranianDateInput name="date" required />
          </FormField>
          <FormField label={w("reason")}>
            <Input name="reason" minLength={3} maxLength={1000} required />
          </FormField>
          <Button disabled={command.isPending}>{t("refundReturn")}</Button>
          <QueryError error={command.error} />
        </form>
      )}
    </article>
  );
}
