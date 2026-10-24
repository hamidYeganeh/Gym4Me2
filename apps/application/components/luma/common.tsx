"use client";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronLeft,
  CircleUserRound,
  Compass,
  House,
  MessageCircle,
  Plus,
  RefreshCw,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { performAppBack } from "../../lib/app-navigation";
import { useLocale, useTranslations } from "@repo/i18n";
import type { ReactNode } from "react";
import type { ApiError } from "@repo/api";
import { useQueryRetry } from "@repo/ui/hooks/use-query-retry";
import { useAuthRecovery } from "@repo/ui/hooks/use-auth-recovery";
import {
  accountRecovery,
  accountReadDenied,
} from "@repo/ui/lib/account-recovery";
import { AuthRequired } from "@repo/ui/account";
import { useAccount } from "@repo/api/profile";
import "./luma.css";
import { SlidingSegments } from "@repo/ui/motion-controls";
export function useLuma() {
  return useTranslations("Luma");
}
export function stamp(value: string | undefined | null, locale: string) {
  return value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Tehran",
      }).format(new Date(value))
    : "";
}
export function amount(value: string, locale: string) {
  const rial = BigInt(value);
  const formatter = new Intl.NumberFormat(locale);
  const whole = rial / BigInt(10);
  const tenth = rial < BigInt(0) ? -(rial % BigInt(10)) : rial % BigInt(10);
  if (tenth === BigInt(0)) return formatter.format(whole);
  const decimal =
    formatter.formatToParts(1.1).find((part) => part.type === "decimal")
      ?.value ?? ".";
  const sign = rial < BigInt(0) && whole === BigInt(0) ? "-" : "";
  return `${sign}${formatter.format(whole)}${decimal}${formatter.format(tenth)}`;
}
export function LumaNavigation({
  pathOverride,
}: { pathOverride?: string } = {}) {
  const pathname = usePathname();
  const path = pathOverride ?? pathname;
  const t = useLuma();
  const design = useTranslations("LumaDesign");
  return (
    <nav className="luma-navigation" aria-label={t("navigation")}>
      {[
        {
          href: "/",
          label: design("schedule"),
          Icon: House,
          active:
            path === "/" ||
            [
              "/bookings",
              "/memberships",
              "/orders",
              "/training",
              "/coaching",
            ].some((prefix) => path.startsWith(prefix)),
        },
        {
          href: "/discovery",
          label: t("discover"),
          Icon: Compass,
          active:
            path.startsWith("/discovery") ||
            path.startsWith("/services") ||
            path.startsWith("/calendars"),
        },
        {
          href: "/messages",
          label: t("messages"),
          Icon: MessageCircle,
          active: path.startsWith("/messages"),
        },
      ].map(({ href, label, Icon, active }) => (
        <Link
          key={href}
          href={href}
          scroll={false}
          aria-current={active ? "page" : undefined}
        >
          <Icon size={22} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
export function LumaPage({
  title,
  back,
  children,
  actions,
  className,
  heading,
}: {
  title: string;
  back?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  heading?: ReactNode;
}) {
  const t = useLuma();
  const router = useRouter();
  const account = useAccount();
  const identity = accountReadDenied(account.error) ? undefined : account.data;
  return (
    <main className={`luma-page${className ? ` ${className}` : ""}`}>
      <header className="luma-header">
        {back ? (
          <Link
            className="luma-icon"
            href={back}
            aria-label={t("back")}
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              performAppBack(router, back);
            }}
          >
            <ArrowLeft className="rtl:rotate-180" size={20} />
          </Link>
        ) : (
          <Link href="/profile" className="luma-icon" aria-label={t("account")}>
            <span className="luma-avatar" aria-hidden="true">
              {identity?.displayName?.trim().slice(0, 2) || (
                <CircleUserRound size={23} />
              )}
            </span>
          </Link>
        )}
        <h1 className="flex-1">{heading ?? title}</h1>
        <div className="luma-header-actions">
          {actions ?? (
            <Link
              href="/notifications"
              className="luma-icon"
              aria-label={t("notifications")}
            >
              <Bell size={21} />
            </Link>
          )}
        </div>
      </header>
      {children}
    </main>
  );
}
export function Section({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: ReactNode;
}) {
  const t = useLuma();
  return (
    <section className="luma-section">
      <div className="luma-section-title">
        <h2>{title}</h2>
        {href && (
          <Link className="luma-meta" href={href}>
            {t("viewAll")}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
const statusKeys: Record<
  string,
  | "status.approved"
  | "status.rejected"
  | "status.verified"
  | "status.failed"
  | "status.unknown"
  | "status.succeeded"
  | "status.requested"
  | "status.withdrawn"
  | "status.partially_paid"
  | "status.held"
  | "status.pending_approval"
  | "status.confirmed"
  | "status.cancelled"
  | "status.expired"
  | "status.completed"
  | "status.no_show"
  | "status.active"
  | "status.frozen"
  | "status.pending"
  | "status.paid"
  | "status.awaiting_payment"
  | "status.review"
  | "status.refunded"
  | "status.partially_refunded"
  | "status.waiting"
  | "status.offered"
  | "status.invited"
  | "status.accepted"
  | "status.declined"
  | "status.open"
  | "status.assigned"
  | "status.resolved"
  | "status.draft"
  | "status.published"
> = {
  approved: "status.approved",
  rejected: "status.rejected",
  verified: "status.verified",
  failed: "status.failed",
  unknown: "status.unknown",
  succeeded: "status.succeeded",
  requested: "status.requested",
  withdrawn: "status.withdrawn",
  partially_paid: "status.partially_paid",
  held: "status.held",
  pending_approval: "status.pending_approval",
  confirmed: "status.confirmed",
  cancelled: "status.cancelled",
  expired: "status.expired",
  completed: "status.completed",
  no_show: "status.no_show",
  active: "status.active",
  frozen: "status.frozen",
  pending: "status.pending",
  paid: "status.paid",
  awaiting_payment: "status.awaiting_payment",
  review: "status.review",
  refunded: "status.refunded",
  partially_refunded: "status.partially_refunded",
  waiting: "status.waiting",
  offered: "status.offered",
  invited: "status.invited",
  accepted: "status.accepted",
  declined: "status.declined",
  open: "status.open",
  assigned: "status.assigned",
  resolved: "status.resolved",
  draft: "status.draft",
  published: "status.published",
};
export function Row({
  title,
  meta,
  href,
  children,
  state,
  icon,
  date,
}: {
  title: string;
  meta?: string;
  href?: string;
  children?: ReactNode;
  state?: string;
  icon?: ReactNode;
  date?: string;
}) {
  const locale = useLocale();
  const validDate =
    date && Number.isFinite(Date.parse(date)) ? new Date(date) : null;
  const content = (
    <>
      <span className="luma-row-icon">
        {icon ??
          (validDate ? (
            <span className="luma-date" aria-hidden="true">
              <small>
                {new Intl.DateTimeFormat(locale, {
                  month: "short",
                  timeZone: "Asia/Tehran",
                }).format(validDate)}
              </small>
              <strong>
                {new Intl.DateTimeFormat(locale, {
                  day: "numeric",
                  timeZone: "Asia/Tehran",
                }).format(validDate)}
              </strong>
            </span>
          ) : (
            <CalendarDays size={24} />
          ))}
      </span>
      <span className="luma-row-copy">
        <span className="luma-row-title">{title}</span>
        {meta && <span className="luma-meta">{meta}</span>}
        {state && <StatusBadge state={state} />}
        {children}
      </span>
      {href && <ChevronLeft size={18} className="ltr:rotate-180 shrink-0" />}
    </>
  );
  return href ? (
    <Link href={href} className="luma-row">
      {content}
    </Link>
  ) : (
    <div className="luma-row">{content}</div>
  );
}
export function StatusBadge({ state }: { state: string }) {
  const t = useLuma();
  return (
    <span className="luma-pill" data-state={state}>
      {statusKeys[state] ? t(statusKeys[state]) : state}
    </span>
  );
}
export function Empty({
  children,
  compact = false,
  icon,
}: {
  children?: ReactNode;
  compact?: boolean;
  icon?: ReactNode;
}) {
  const t = useLuma();
  return (
    <div className={compact ? "luma-empty luma-empty--compact" : "luma-empty"}>
      <span aria-hidden="true">{icon ?? <CalendarDays />}</span>
      <p>{children ?? t("empty")}</p>
    </div>
  );
}
export function QueryState({
  query,
  children,
  compact = false,
}: {
  compact?: boolean;
  query: { isPending: boolean; error: ApiError | null; refetch: () => unknown };
  children: ReactNode;
}) {
  const t = useLuma();
  const path = usePathname();
  const { button, retrying, run } = useQueryRetry(() => query.refetch());
  const recovery = useAuthRecovery(
    query,
    typeof window === "undefined"
      ? path
      : window.location.pathname + window.location.search,
  );
  if (recovery?.kind === "signIn")
    return (
      <AuthRequired
        compact={compact}
        returnTo={
          new URL(recovery.href, "https://gym.invalid").searchParams.get(
            "returnTo",
          ) ?? path
        }
      />
    );
  if (query.isPending)
    return (
      <div aria-busy="true" className="luma-empty">
        <RefreshCw />
        <p>{t("loading")}</p>
      </div>
    );
  if (recovery)
    return (
      <Empty icon={<CircleUserRound />}>
        <Link className="luma-cta" href={recovery.href}>
          {t("completeProfile")}
        </Link>
      </Empty>
    );
  if (query.error)
    return (
      <div role="alert" className="luma-empty">
        <p>{t("loadError")}</p>
        <button
          ref={button}
          type="button"
          className="luma-cta"
          disabled={retrying}
          aria-busy={retrying}
          onClick={run}
        >
          {t("retry")}
        </button>
      </div>
    );
  return children;
}

export function Segments({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <SlidingSegments
      className="luma-segments"
      options={options}
      value={value}
      onChange={onChange}
      label={options.map((option) => option.label).join(" / ")}
    />
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="luma-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function CommandError({ error }: { error: ApiError | null }) {
  const t = useLuma();
  const returnTo =
    typeof window === "undefined"
      ? "/"
      : window.location.pathname + window.location.search;
  const recovery = accountRecovery(error, returnTo, "/profile/complete");
  return recovery?.kind === "signIn" ? (
    <AuthRequired compact returnTo={returnTo} />
  ) : recovery?.kind === "consent" ? (
    <div role="alert" className="luma-error">
      <p>{t("consentRequired")}</p>
      <Link href={recovery.href}>{t("completeProfile")}</Link>
    </div>
  ) : error ? (
    <p role="alert" className="luma-error">
      {error.status === 409 ? t("conflict") : t("actionError")}
    </p>
  ) : null;
}
export function CreateAction() {
  const t = useLuma();
  return (
    <Link href="/host" className="luma-icon" aria-label={t("host")}>
      <Plus size={23} />
    </Link>
  );
}
export function Price({ value }: { value: string }) {
  const locale = useLocale();
  const t = useLuma();
  return (
    <>{value === "0" ? t("free") : `${amount(value, locale)} ${t("toman")}`}</>
  );
}
