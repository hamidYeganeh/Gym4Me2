"use client";
import { useFormatter } from "@repo/i18n";
import { isTranslationKey, type TranslationKey } from "@repo/i18n/messages";
import { useTranslations } from "@repo/i18n";

import { type ReactNode } from "react";
import { Alert, AlertDescription } from "@repo/ui/kit/Alert";
import { Button } from "@repo/ui/kit/Button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@repo/ui/kit/Empty";
import { Field, FieldLabel } from "@repo/ui/kit/Field";
import { Input } from "@repo/ui/kit/Input";
import { Spinner } from "@repo/ui/kit/Spinner";
import { Badge } from "@repo/ui/kit/Badge";

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
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Loading() {
  const t = useTranslations();

  return (
    <div
      className="flex items-center justify-center gap-3 py-16 text-muted-foreground"
      role="status"
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
  ...props
}: {
  label: string;
  name: string;
  fieldClassName?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <Field className={fieldClassName}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} {...props} />
    </Field>
  );
}
export function Submit({
  busy,
  disabled,
  children,
}: {
  busy: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button type="submit" disabled={busy || disabled}>
      {busy && <Spinner data-icon="inline-start" />}
      {children}
    </Button>
  );
}
export function QueryError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const t = useTranslations();

  return error ? (
    <div className="grid gap-3">
      <ErrorNotice error={error} />
      <Button variant="outline" onClick={() => void retry()}>
        {t("Copy.tryAgain")}{" "}
      </Button>
    </div>
  ) : null;
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
