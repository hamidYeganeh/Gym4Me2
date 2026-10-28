"use client";
import { useFormatter, useTranslations } from "@repo/i18n";
import { isTranslationKey, type TranslationKey } from "@repo/i18n/messages";

import { Alert, AlertDescription } from "@repo/ui/kit/Alert";
import { Badge } from "@repo/ui/kit/Badge";
import { Button } from "@repo/ui/kit/Button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/ui/kit/Empty";
import { Spinner } from "@repo/ui/kit/Spinner";
import {
  TextField as KitTextField,
  type TextFieldProps,
} from "@repo/ui/kit/TextField";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, type RefObject } from "react";
import { useFeedbackToast } from "../hooks/use-feedback-toast";
import { useQueryRetry } from "../hooks/use-query-retry";
import { TrayIcon as Inbox } from "../icons";
import {
  FitnessIllustration,
  type FitnessIllustrationKind,
} from "../kit/FitnessIllustration";
import { accountReadDenied, accountRecovery } from "../lib/account-recovery";
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
export function ErrorNotice({
  error,
  validation = false,
  persistent = false,
}: {
  error: unknown;
  /** Only errors produced by local form validation belong inside the form. */
  validation?: boolean;
  /** Keep blocking access errors visible after a toast would disappear. */
  persistent?: boolean;
}) {
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
  const message = t(
    isTranslationKey(code) ? code : "Errors.requestFailed",
    params,
  );
  useFeedbackToast("error", message, validation || persistent ? null : error);
  return error && (validation || persistent) ? (
    <Alert variant="destructive" role="alert">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}

export function SuccessNotice({
  success,
  message,
}: {
  success: boolean;
  message: string;
}) {
  useFeedbackToast("success", message, success);
  return null;
}
export function Blank({
  title,
  description,
  icon,
  action,
  illustration = "club",
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  illustration?: FitnessIllustrationKind;
}) {
  const router = useRouter();
  const t = useTranslations("Bencho");
  return (
    <Empty className="rounded-3xl bg-transparent px-6 py-8 md:p-10">
      <EmptyHeader>
        <EmptyMedia
          variant={illustration ? "default" : "icon"}
          aria-hidden="true"
        >
          {illustration ? (
            <FitnessIllustration kind={illustration} />
          ) : (
            (icon ?? <Inbox />)
          )}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {action ?? (
          <Button
            variant="outline"
            onClick={() =>
              window.history.length > 1 ? router.back() : router.push("/")
            }
          >
            {t("back")}
          </Button>
        )}
      </EmptyContent>
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
export function TextField(
  props: TextFieldProps & { label: string; name: string },
) {
  return <KitTextField {...props} />;
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
      <ErrorNotice error={error} persistent />
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
        retry &&
        !accountReadDenied(error) && (
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
