"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "@repo/i18n";
import { useAccount, useTrainingCommand } from "@repo/api/profile";
import { useApiContext } from "@repo/api/provider";
import { clearTrainingLocal } from "@repo/api/training-offline";
import { trainingIdentity } from "./identity";
import { AccountDesignPage } from "../account/account-design";
import {
  ErrorNotice,
  Loading,
  QueryError,
  SuccessNotice,
} from "../account/common";
import { Button } from "../kit/Button";
import "./training.css";
const Owner = createContext("");
export function useTrainingParams() {
  const params = useSearchParams();
  return typeof window === "undefined"
    ? params
    : new URLSearchParams(window.location.search);
}
export const useTrainingOwner = () => useContext(Owner);
export function useTrainingOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}
export function TrainingGate({
  title,
  children,
  back = "/training",
}: {
  title: string;
  children: ReactNode;
  back?: string;
}) {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator) ||
      window.location.protocol === "capacitor:"
    )
      return;
    void navigator.serviceWorker
      .register("/training-sw.js", { scope: "/" })
      .then(async (registration) => {
        const ready = await navigator.serviceWorker.ready;
        const worker = registration.active ?? ready.active;
        if (!worker) return;
        const paths = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name);
        worker.postMessage({ type: "cache-training-assets", paths });
      })
      .catch(() => undefined);
  }, []);
  const q = useAccount(),
    online = useTrainingOnline(),
    { resetSession } = useApiContext(),
    t = useTranslations("Training");
  const [cached, setCached] = useState("");
  const denied = useRef(false),
    wasOnline = useRef(true);
  useEffect(() => {
    const reset = () => setCached("");
    window.addEventListener("gym4me:training-reset", reset);
    return () => window.removeEventListener("gym4me:training-reset", reset);
  }, []);
  useEffect(() => {
    try {
      setCached(localStorage.getItem("gym4me.training.owner") ?? "");
    } catch {
      /* Online identity still works without persistent storage. */
    }
  }, []);
  useEffect(() => {
    if (!q.data || q.error) return;
    denied.current = false;
    const id = q.data.id;
    let cancelled = false;
    void (async () => {
      let previous = "";
      try {
        previous = localStorage.getItem("gym4me.training.owner") ?? "";
      } catch {
        /* Storage may be unavailable. */
      }
      if (previous && previous !== id)
        await clearTrainingLocal().catch(() => undefined);
      if (cancelled) return;
      try {
        localStorage.setItem("gym4me.training.owner", id);
      } catch {
        /* Current online identity remains usable. */
      }
      setCached(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [q.data, q.error]);
  useEffect(() => {
    if (q.error?.status !== 401 || denied.current) return;
    denied.current = true;
    setCached("");
    void resetSession();
  }, [q.error?.status, resetSession]);
  useEffect(() => {
    if (online && !wasOnline.current) void q.refetch();
    wasOnline.current = online;
  }, [online, q.refetch]);
  const owner = trainingIdentity(q.data?.id, cached, q.error?.status, !online);
  return (
    <AccountDesignPage title={title} backHref={back}>
      <div className="training-root">
        {!online && (
          <p className="training-notice" role="status">
            {t("offline")}
          </p>
        )}
        {owner ? (
          <Owner.Provider value={owner}>{children}</Owner.Provider>
        ) : q.error ? (
          <QueryError error={q.error} retry={q.refetch} />
        ) : (
          <Loading />
        )}
      </div>
    </AccountDesignPage>
  );
}
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
  name:
    | "workout_opened"
    | "discovery_searched"
    | "service_selected"
    | "checkout_opened",
  entityId: string | null = null,
) {
  const { api } = useApiContext(),
    account = useAccount();
  useEffect(() => {
    if (!account.data) return;
    void api
      .request({
        method: "POST",
        path: "profile/training/events",
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
