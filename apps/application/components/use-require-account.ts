"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "@repo/api/profile";
import { useTranslations } from "@repo/i18n";
import { accountReadDenied } from "@repo/ui/lib/account-recovery";
import { applicationAuthHref } from "@repo/ui/lib/auth-routes";
import { toast } from "@repo/ui/kit/Sileo";

/** Personal actions ask for sign-in without interrupting public browsing. */
export function useRequireAccount() {
  const account = useAccount();
  const router = useRouter();
  const t = useTranslations("Errors");
  return async () => {
    const destination = window.location.pathname + window.location.search;
    const result = account.isPending ? await account.refetch() : account;
    if (window.location.pathname + window.location.search !== destination)
      return false;
    if (result.data && !accountReadDenied(result.error)) return true;
    if (result.error?.status === 401)
      router.push(applicationAuthHref("otp", destination));
    else toast.error(t("requestFailed"));
    return false;
  };
}
