"use client";
import { useFormatter } from "@repo/i18n";
import { isTranslationKey, type TranslationKey } from "@repo/i18n/messages";
import { useTranslations } from "@repo/i18n";

import { useId, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountRecovery } from "../lib/account-recovery";
import { useQueryRetry } from "../hooks/use-query-retry";
import { Alert, AlertDescription } from "@repo/ui/kit/Alert";
import { Button } from "@repo/ui/kit/Button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyContent,
  EmptyTitle,
  EmptyDescription,
} from "@repo/ui/kit/Empty";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Input } from "@repo/ui/kit/Input";
import { Spinner } from "@repo/ui/kit/Spinner";
import { Badge } from "@repo/ui/kit/Badge";
import { Inbox } from "lucide-react";
import { cn } from "../lib/utils";

const roleKeys = {
  owner: "Copy.owner",
  manager: "Copy.manager",
  receptionist: "Copy.receptionist",
  accountant: "Copy.accountant",
} satisfies Record<string, TranslationKey>;
const statusKeys = {
  pending: "Copy.pendingReview",
  approved: "Copy.approved",
  rejected: "Copy.rejected",
  suspended: "Copy.suspended",
  active: "Copy.active",
  inactive: "Copy.inactive",
  draft: "Copy.draft",
  pending_review: "Copy.pendingPublication",
  published: "Copy.published",
  hidden: "Copy.hidden",
  open: "Copy.open",
  temporarily_closed: "Copy.temporarilyClosed",
  permanently_closed: "Copy.closed",
} satisfies Record<string, TranslationKey>;
export function useDateLabel() {
  const format = useFormatter();
  return (value: string) =>
    format.dateTime(new Date(value), { dateStyle: "medium" });
}
export function Status({ value }: { value: string }) {
  const statusNames = useLabelMap(statusKeys);
  const t = useTranslations();
  return (
    <Badge
      variant={
        ["active", "approved", "published", "open"].includes(value)
          ? "default"
          : "secondary"
      }
    >
      {statusNames[value] ?? t("Copy.unknown")}
    </Badge>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  const t = useTranslations();
  const code =
    typeof error === "string"
      ? error
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "Errors.requestFailed";
  const details =
    error && typeof error === "object" && "details" in error
      ? error.details
      : null;
  const params =
    details &&
    typeof details === "object" &&
    "parameters" in details &&
    typeof details.parameters === "object" &&
    details.parameters
      ? (Object.fromEntries(
          Object.entries(details.parameters).filter(
            ([, value]) =>
              typeof value === "string" || typeof value === "number",
          ),
        ) as Record<string, string | number>)
      : {};
  return error ? (
    <Alert variant="destructive" role="alert">
      <AlertDescription>
        {t(isTranslationKey(code) ? code : "Errors.requestFailed", params)}
      </AlertDescription>
    </Alert>
  ) : null;
}
export function Blank({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Empty className="rounded-3xl border bg-card px-6 py-8 md:p-10">
      <EmptyHeader>
        <EmptyMedia variant="icon" aria-hidden="true">
          {icon ?? <Inbox />}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
export function Loading() {
  const t = useTranslations();

  return (
    <div
      className="flex items-center justify-center gap-3 py-16 text-muted-foreground"
      role="status"
      aria-busy="true"
    >
      <Spinner />
      {t("Copy.loadingInformation")}{" "}
    </div>
  );
}
export function TextField({
  label,
  name,
  fieldClassName,
  className,
  id,
  ...props
}: {
  label: string;
  name: string;
  fieldClassName?: string;
} & React.ComponentProps<typeof Input>) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <Field className={fieldClassName}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        {...props}
        id={inputId}
        name={name}
        className={cn("min-h-11", className)}
      />
    </Field>
  );
}
export function Submit({
  busy,
  disabled,
  children,
  className,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={busy || disabled}
      aria-busy={busy}
      className={cn("min-h-11 min-w-11", className)}
    >
      {busy && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  );
}
export function QueryError({
  error,
  retry,
  fallback,
}: {
  error: unknown;
  retry?: () => unknown;
  fallback?: RefObject<HTMLElement | null>;
}) {
  const t = useTranslations();
  const path = usePathname();
  const recovery = accountRecovery(
    error,
    typeof window === "undefined"
      ? path
      : window.location.pathname + window.location.search,
  );
  const { button, retrying, run } = useQueryRetry(() => retry?.(), fallback);
  if (!error) return null;
  return (
    <div className="grid gap-3">
      <ErrorNotice error={error} />
      {recovery ? (
        <Button asChild variant="outline" className="min-h-11 w-fit">
          <Link href={recovery.href}>
            {t(
              recovery.kind === "signIn"
                ? "Luma.signIn"
                : "Luma.completeProfile",
            )}
          </Link>
        </Button>
      ) : (
        retry && (
          <Button
            ref={button}
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={retrying}
            aria-busy={retrying}
            onClick={run}
          >
            {t("Copy.tryAgain")}
          </Button>
        )
      )}
    </div>
  );
}

export function useLabelMap(keys: Record<string, TranslationKey>) {
  const t = useTranslations();
  return Object.fromEntries(
    Object.entries(keys).map(([key, value]) => [key, t(value)]),
  );
}
export function useRoleNames() {
  return useLabelMap(roleKeys);
}
