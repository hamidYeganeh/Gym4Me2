"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import { useGrowthCommand } from "@repo/api/growth";
import { Button } from "../kit/Button";
import { ErrorNotice } from "../account/common";
import { toast } from "../kit/Sileo";
export function GrowthForm({
  path,
  build,
  children,
  label,
  onSaved,
  disabled = false,
}: {
  path: string;
  build: (f: FormData) => Record<string, unknown>;
  children: ReactNode;
  label: string;
  onSaved?: (result: unknown) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Growth"),
    m = useGrowthCommand(),
    keys = useRef(new Map<string, string>()),
    busy = useRef(false);
  const [localError, setLocalError] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current || disabled) return;
    busy.current = true;
    setLocalError(false);
    try {
      const body = build(new FormData(e.currentTarget)),
        fingerprint = JSON.stringify({ path, body });
      let key = keys.current.get(fingerprint);
      if (!key) {
        key = crypto.randomUUID();
        keys.current.set(fingerprint, key);
      }
      const result = await m.mutateAsync({
        path,
        body: { ...body, operationId: key },
      });
      toast.success(t("saved"));
      onSaved?.(result);
    } catch {
      setLocalError(true);
    } finally {
      busy.current = false;
    }
  }
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => void submit(e).catch(() => undefined)}
    >
      <fieldset
        disabled={m.isPending || disabled}
        className="grid min-w-0 gap-4"
      >
        {children}
        <Button type="submit">{label}</Button>
      </fieldset>
      <ErrorNotice error={m.error || (localError ? "Growth.failed" : null)} />
    </form>
  );
}
