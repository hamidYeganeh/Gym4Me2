"use client";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { useTranslations, useLocale } from "@repo/i18n";
import { usePracticeCommand } from "@repo/api/profile";
import { Button } from "../kit/Button";
import { Input } from "../kit/Input";
import { Textarea } from "../kit/Textarea";
import { ErrorNotice } from "./common";
export function usePracticeAction() {
  const command = usePracticeCommand(),
    busy = useRef(false);
  const [saved, setSaved] = useState(false),
    [error, setError] = useState<unknown>();
  async function run(path: string, body?: unknown) {
    if (busy.current) return false;
    busy.current = true;
    setSaved(false);
    setError(undefined);
    try {
      await command.mutateAsync({ path, body });
      setSaved(true);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      busy.current = false;
    }
  }
  return { run, pending: command.isPending, saved, error };
}
export function PracticeFeedback({
  action,
}: {
  action: ReturnType<typeof usePracticeAction>;
}) {
  const t = useTranslations("Practice");
  const status = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (action.saved && document.activeElement === document.body)
      status.current?.focus({ preventScroll: true });
  }, [action.saved]);
  return (
    <>
      <ErrorNotice error={action.error} />
      <p role="status" tabIndex={-1} ref={status}>
        {action.saved ? t("saved") : ""}
      </p>
    </>
  );
}
export function PracticeField({
  name,
  label,
  value = "",
  type = "text",
  required = false,
  children,
  min = 0,
}: {
  name: string;
  label: string;
  value?: string | number;
  type?: string;
  required?: boolean;
  children?: ReactNode;
  min?: number;
}) {
  return (
    <label className="grid gap-2 text-sm">
      {label}
      {children ??
        (type === "textarea" ? (
          <Textarea
            name={name}
            defaultValue={value}
            maxLength={4000}
            required={required}
          />
        ) : (
          <Input
            name={name}
            type={type}
            defaultValue={value}
            required={required}
            min={type === "number" ? min : undefined}
          />
        ))}
    </label>
  );
}
export function PracticeCheck({
  name,
  label,
  checked = false,
}: {
  name: string;
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <input
        className="mt-1 size-5"
        name={name}
        type="checkbox"
        defaultChecked={checked}
      />
      {label}
    </label>
  );
}
export function PracticeForm({
  title,
  children,
  pending,
  onSubmit,
  label,
}: {
  title: string;
  children: ReactNode;
  pending: boolean;
  onSubmit: (data: FormData) => void;
  label?: string;
}) {
  const t = useTranslations("Practice");
  return (
    <form
      className="space-y-4 rounded-3xl border border-border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
    >
      <h2 className="font-semibold">{title}</h2>
      {children}
      <Button type="submit" disabled={pending}>
        {label ?? t("save")}
      </Button>
    </form>
  );
}
export const text = (f: FormData, key: string) =>
  String(f.get(key) ?? "").trim();
export const checked = (f: FormData, key: string) => f.get(key) === "on";
export const iso = (f: FormData, key: string) =>
  new Date(text(f, key)).toISOString();
export const list = (f: FormData, key: string) =>
  text(f, key)
    .split(/[,،]/)
    .map((x) => x.trim())
    .filter(Boolean);
export function PracticeMoney({ value }: { value: string }) {
  const t = useTranslations("Practice"),
    locale = useLocale();
  return (
    <span dir="auto">
      {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en").format(
        Number(BigInt(value) / BigInt(10)),
      )}{" "}
      {t("toman")}
    </span>
  );
}
