"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "@repo/i18n";
import { Button } from "../kit/Button";
import { ErrorNotice } from "../account/common";
import { useQueryRetry } from "../hooks/use-query-retry";
import { accountReadDenied, accountRecovery } from "../lib/account-recovery";
import { useApiContext } from "@repo/api/provider";
import { AuthRequired } from "../account/auth-entry";
export function QueryError({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => unknown;
}) {
  const t = useTranslations("Luma");
  const path = usePathname();
  const { api } = useApiContext();
  const { button, retrying, run } = useQueryRetry(() => retry?.());
  const recovery = accountRecovery(
    error,
    typeof window === "undefined"
      ? path
      : window.location.pathname + window.location.search,
  );
  if (!error) return null;
  if (api.scope[2] === "application" && recovery?.kind === "signIn")
    return (
      <AuthRequired
        compact
        returnTo={
          typeof window === "undefined"
            ? path
            : window.location.pathname + window.location.search
        }
      />
    );
  return (
    <div className="text-destructive my-4">
      <ErrorNotice error={error} persistent />
      {recovery ? (
        <Button asChild variant="outline" className="min-h-11">
          <Link href={recovery.href}>
            {t(recovery.kind === "signIn" ? "signIn" : "completeProfile")}
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
            {t("retry")}
          </Button>
        )
      )}
    </div>
  );
}
