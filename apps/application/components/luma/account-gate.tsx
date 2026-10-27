"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@repo/api/profile";
import { QueryState, useLuma } from "./common";
import {
  accountReadDenied,
  accountRecovery,
} from "@repo/ui/lib/account-recovery";
import { applicationAuthHref } from "@repo/ui/lib/auth-routes";

export function AccountGate({
  destination,
  children,
}: {
  destination: string;
  children: ReactNode;
}) {
  const account = useAccount();
  const router = useRouter();
  const t = useLuma();
  const signIn = accountRecovery(account.error, destination)?.kind === "signIn";
  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    const search = new URLSearchParams(window.location.search).toString();
    if (signIn && `${path}${search ? `?${search}` : ""}` === destination)
      router.replace(applicationAuthHref("otp", destination));
  }, [signIn, router, destination]);
  if (account.data && !accountReadDenied(account.error)) return children;
  if (signIn || account.isPending)
    return (
      <div
        role="status"
        aria-busy="true"
        className="p-6 text-center text-muted-foreground"
      >
        {t("loading")}
      </div>
    );
  return (
    <div className="mx-auto max-w-xl p-6">
      <QueryState query={account}>{null}</QueryState>
    </div>
  );
}
