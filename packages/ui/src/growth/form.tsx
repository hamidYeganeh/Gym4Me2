"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "@repo/i18n";
import { useGrowthCommand } from "@repo/api/growth";
import { Button } from "../kit/Button";
export function GrowthForm({
  path,
  build,
  children,
  label,
  onSaved,
}: {
  path: string;
  build: (f: FormData) => Record<string, unknown>;
  children: ReactNode;
  label: string;
  onSaved?: (result: unknown) => void;
}) {
  const t = useTranslations("Growth"),
    m = useGrowthCommand(),
    keys = useRef(new Map<string, string>()),
    busy = useRef(false);
  const [done, setDone] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setDone(false);
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
      setDone(true);
      onSaved?.(result);
    } finally {
      busy.current = false;
    }
  }
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => void submit(e).catch(() => undefined)}
    >
      <fieldset disabled={m.isPending} className="grid min-w-0 gap-4">
        {children}
        <Button type="submit">{label}</Button>
      </fieldset>
      {m.error && <p role="alert">{t("failed")}</p>}
      {done && <p role="status">{t("saved")}</p>}
    </form>
  );
}
