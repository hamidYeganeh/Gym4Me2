"use client";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { useLocale, useTranslations } from "@repo/i18n";
import { isTranslationKey } from "@repo/i18n/messages";
import {
  useAdvancedCommand,
  type AdvancedSurface,
} from "@repo/api/advanced-business";
import { Button } from "../kit/Button";
import { NativeSelect, NativeSelectOption } from "../kit/NativeSelect";
export const value = (f: FormData, k: string) => String(f.get(k) ?? "");
export function useFinancialDate() {
  const locale = useLocale();
  return (v: string) =>
    new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(v.slice(0, 10) + "T12:00:00Z"));
}
export function Field({
  label,
  name,
  type = "text",
  required = true,
  children,
  defaultValue,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  children?: ReactNode;
  defaultValue?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {children ?? (
        <input
          className="min-h-11 min-w-0 w-full rounded-xl border border-border bg-background px-3 text-foreground"
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          min={min}
          max={max}
          step={step}
        />
      )}
    </label>
  );
}
export function Select({
  name,
  children,
  defaultValue,
}: {
  name: string;
  children: ReactNode;
  defaultValue?: string;
}) {
  return (
    <NativeSelect name={name} defaultValue={defaultValue} required>
      {children}
    </NativeSelect>
  );
}
export function Form({
  surface,
  path,
  build,
  children,
  label,
  disabled = false,
}: {
  surface: AdvancedSurface;
  path: string;
  build: (f: FormData) => Record<string, unknown>;
  children?: ReactNode;
  label: string;
  disabled?: boolean;
}) {
  const t = useTranslations("PH5"),
    backend = useTranslations(),
    m = useAdvancedCommand(surface),
    keys = useRef(new Map<string, string>());
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (m.isPending) return;
    setError("");
    try {
      const body = build(new FormData(e.currentTarget));
      const fingerprint = JSON.stringify({ path, body });
      let key = keys.current.get(fingerprint);
      if (!key) {
        key = crypto.randomUUID();
        keys.current.set(fingerprint, key);
      }
      await m.mutateAsync({ path, body: { ...body, idempotencyKey: key } });
    } catch (err) {
      const key = err instanceof Error ? err.message : "";
      setError(isTranslationKey(key) ? backend(key) : t("operationFailed"));
    }
  }
  return (
    <form onSubmit={submit} className="grid gap-4">
      <fieldset
        disabled={disabled || m.isPending}
        className="grid min-w-0 gap-4 disabled:opacity-60"
      >
        {children}
        <Button type="submit" disabled={disabled || m.isPending}>
          {m.isPending ? t("saving") : label}
        </Button>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {m.isSuccess && !error && (
        <p role="status" className="text-sm text-primary">
          {t("saved")}
        </p>
      )}
    </form>
  );
}
export function Money({ amount }: { amount: string }) {
  const locale = useLocale(),
    t = useTranslations("PH5");
  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat(locale).format(BigInt(amount))}{" "}
      <span className="text-xs text-muted-foreground">{t("irr")}</span>
    </span>
  );
}
export function Reason() {
  const t = useTranslations("PH5");
  return <Field name="reason" label={t("reason")} />;
}
export function Outcome() {
  const t = useTranslations("PH5");
  return (
    <Field label={t("paymentResult")} name="outcome">
      <Select name="outcome">
        {(["succeeded", "failed", "unknown"] as const).map((v) => (
          <NativeSelectOption key={v} value={v}>
            {t(v)}
          </NativeSelectOption>
        ))}
      </Select>
    </Field>
  );
}
