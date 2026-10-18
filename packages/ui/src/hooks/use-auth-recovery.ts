"use client";
import { useEffect, useState } from "react";
import { accountRecovery } from "../lib/account-recovery";

/** A focus refetch briefly clears a 401. Keep the entry sheet mounted until
 * that request settles, including when the native app resumes. */
export function useAuthRecovery(
  query: { isPending: boolean; error: unknown },
  returnTo: string,
) {
  const kind = accountRecovery(
    query.error,
    returnTo,
    "/profile/complete",
  )?.kind;
  const [settledKind, setSettledKind] = useState(kind);
  useEffect(() => {
    if (!query.isPending) setSettledKind(kind);
  }, [query.isPending, kind]);
  const effectiveKind = query.isPending ? settledKind : kind;
  return accountRecovery(
    effectiveKind === "signIn"
      ? { status: 401 }
      : effectiveKind === "consent"
        ? { code: "Backend.privacyConsentRequired" }
        : null,
    returnTo,
    "/profile/complete",
  );
}
