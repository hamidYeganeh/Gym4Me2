"use client";

import { useTranslations } from "@repo/i18n";

export function useAuthCopy() {
  const t = useTranslations("MobileAuth");
  return {
    phoneTitle: t("phoneTitle"),
    phoneHint: t("phoneHint"),
    phoneLabel: t("phoneLabel"),
    phonePlaceholder: t("phonePlaceholder"),
    codeTitle: t("codeTitle"),
    codeHint: t("codeHint"),
    codeLabel: t("codeLabel"),
    phoneError: t("phoneError"),
    codeError: t("codeError"),
    sendError: t("sendError"),
    verifyError: t("verifyError"),
    rateLimit: t("rateLimit"),
    unavailable: t("unavailable"),
    wait: t("wait"),
    retryIn: (remaining: number) => t("retryIn", { remaining }),
    resendIn: (remaining: number) => t("resendIn", { remaining }),
    send: t("send"),
    verify: t("verify"),
    edit: t("edit"),
    resend: t("resend"),
  };
}
