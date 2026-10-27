"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { useApiContext } from "@repo/api/provider";
import { useAccount, useTrainingCommand } from "@repo/api/profile";
import { ErrorNotice, SuccessNotice } from "../account/common";
import { Button } from "../kit/Button";
import "./training.css";
export function TrainingCard({
  title,
  children,
  actions,
  className = "",
}: {
  title?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`training-card ${className}`}>
      {(title || actions) && (
        <div className="training-card-heading">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
export function TrainingEmpty({ children }: { children: ReactNode }) {
  return <div className="training-empty">{children}</div>;
}
export function TrainingLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button type="button" asChild variant="outline">
      <Link href={href} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}
export function useTrainingAction() {
  const m = useTrainingCommand(),
    t = useTranslations("Training"),
    lock = useRef(false),
    status = useRef<HTMLParagraphElement>(null);
  const [error, setError] = useState<unknown>(null),
    [message, setMessage] = useState("");
  async function run<T>(
    work: () => Promise<T>,
    focus = true,
  ): Promise<T | undefined> {
    if (lock.current) return;
    lock.current = true;
    setError(null);
    setMessage("");
    try {
      const value = await work();
      setMessage(t("saved"));
      if (focus) requestAnimationFrame(() => status.current?.focus());
      return value;
    } catch (e) {
      setError(e);
      return undefined;
    } finally {
      lock.current = false;
    }
  }
  return {
    run,
    mutation: m,
    error,
    setError,
    status,
    message,
    pending: m.isPending,
    clear: () => setMessage(""),
  };
}
export function TrainingFeedback({
  action,
}: {
  action: ReturnType<typeof useTrainingAction>;
}) {
  return (
    <>
      <SuccessNotice success={!!action.message} message={action.message} />
      <ErrorNotice
        error={action.error}
        validation={
          action.error instanceof Error &&
          action.error.message === "Training.imageLimit"
        }
      />
    </>
  );
}
export function useTrainingLocale() {
  const locale = useLocale();
  return {
    locale,
    number: (n: number) => new Intl.NumberFormat(locale).format(n),
    date: (v: string) =>
      new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en", {
        dateStyle: "medium",
        timeZone: "Asia/Tehran",
      }).format(new Date(v.length === 10 ? v + "T12:00:00Z" : v)),
  };
}
export function useTrainingEvent(
  name: "discovery_searched" | "service_selected" | "checkout_opened",
  entityId: string | null = null,
) {
  const { api } = useApiContext(),
    account = useAccount();
  useEffect(() => {
    if (!account.data) return;
    void api
      .request({
        method: "POST",
        path: "profile/events",
        body: { id: crypto.randomUUID(), name, entityId },
      })
      .catch(() => undefined);
  }, [api, name, entityId, account.data?.id]);
}
export const trainingToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
