"use client";
import { SuccessNotice } from "../account/common";
import { normalizeLoginDigits } from "../account/login-validation";
import { useRef } from "react";
import { useTranslations, useLocale } from "@repo/i18n";
import { useSportsCommand, useSportsQuery } from "@repo/api/sports";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
import { FormField } from "./shared";
import { QueryError } from "./query-error";
export function ReceiptForm({
  orderId,
  business = false,
}: {
  orderId: string;
  business?: boolean;
}) {
  const t = useTranslations("Workflow");
  const key = useRef(crypto.randomUUID());
  const command = useSportsCommand<{ id: string }>(
    `${business ? "business" : "profile"}/sports-workflows/receipts`,
  );
  return (
    <form
      className="grid gap-3 my-4 rounded-2xl border p-4"
      onChange={() => {
        key.current = crypto.randomUUID();
        command.reset();
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const amount = normalizeLoginDigits(String(f.get("amount"))).replace(
          /[٬،,\s]/g,
          "",
        );
        if (!/^\d+$/.test(amount)) return;
        command.mutate({
          orderId,
          method: f.get("method") ?? "bank_transfer",
          amountMinor: (BigInt(amount) * BigInt(10)).toString(),
          reference: f.get("reference"),
          reason: String(f.get("reason") ?? ""),
          idempotencyKey: key.current,
        });
      }}
    >
      <h3 className="font-semibold">{t("receipt")}</h3>
      <p className="text-sm text-muted-foreground">{t("receiptHint")}</p>
      {business && (
        <FormField label={t("method")}>
          <NativeSelect name="method">
            {(["cash", "pos", "bank_transfer"] as const).map((m) => (
              <NativeSelectOption key={m} value={m}>
                {t(m)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </FormField>
      )}
      <FormField label={t("amount")}>
        <Input
          name="amount"
          type="text"
          inputMode="numeric"
          pattern="[0-9۰-۹٠-٩٬, ]+"
          required
        />
      </FormField>
      <FormField label={t("reference")}>
        <Input name="reference" minLength={3} maxLength={120} required />
      </FormField>
      <FormField label={t("reason")}>
        <Input name="reason" maxLength={1000} />
      </FormField>
      <Button type="submit" disabled={command.isPending || command.isSuccess}>
        {t("save")}
      </Button>
      <SuccessNotice success={command.isSuccess} message={t("pending")} />
      <QueryError error={command.error} />
    </form>
  );
}
type Receipt = {
  id: string;
  orderId: string;
  amountMinor: string;
  method: "cash" | "pos" | "bank_transfer";
  reference: string;
  status: "pending" | "approved" | "rejected";
  revision: number;
  displayName: string;
  title: string;
};
export function ReceiptQueue({ org, branch }: { org: string; branch: string }) {
  const t = useTranslations("Workflow"),
    locale = useLocale();
  const query = useSportsQuery<Receipt[]>(
    "business/sports-workflows/receipts",
    { organizationId: org, branchId: branch },
  );
  return (
    <section className="grid gap-4">
      <h2 className="font-semibold">{t("receipts")}</h2>
      <QueryError error={query.error} retry={query.refetch} />
      {query.data?.map((r) => (
        <ReceiptDecision key={r.id} receipt={r} locale={locale} />
      ))}
      {query.data?.length === 0 && <p>{t("empty")}</p>}
    </section>
  );
}
function ReceiptDecision({
  receipt: r,
  locale,
}: {
  receipt: Receipt;
  locale: string;
}) {
  const t = useTranslations("Workflow");
  const command = useSportsCommand(
    `business/sports-workflows/receipts/${r.id}/decision`,
  );
  const key = useRef(crypto.randomUUID());
  return (
    <article className="rounded-2xl border p-4 grid gap-3">
      <h3>
        {r.displayName} · {r.title}
      </h3>
      <p>
        {t(r.method)} ·{" "}
        {new Intl.NumberFormat(locale).format(
          BigInt(r.amountMinor) / BigInt(10),
        )}
      </p>
      <p dir="ltr">{r.reference}</p>
      <p>{t(r.status)}</p>
      {r.status === "pending" && (
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            command.mutate({
              revision: r.revision,
              reason: f.get("reason"),
              approved: f.get("decision") === "approved",
              idempotencyKey: key.current,
            });
          }}
        >
          <FormField label={t("reason")}>
            <Input name="reason" minLength={3} maxLength={1000} required />
          </FormField>
          <NativeSelect name="decision">
            <NativeSelectOption value="approved">
              {t("approve")}
            </NativeSelectOption>
            <NativeSelectOption value="rejected">
              {t("reject")}
            </NativeSelectOption>
          </NativeSelect>
          <Button type="submit" disabled={command.isPending}>
            {t("save")}
          </Button>
        </form>
      )}
      <QueryError error={command.error} />
    </article>
  );
}
