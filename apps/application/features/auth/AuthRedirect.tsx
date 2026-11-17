"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useTranslations } from "@repo/i18n";

const AuthRedirect = () => {
  const t = useTranslations("Application");

  const router = useRouter();
  useEffect(() => router.replace("/auth/otp"), [router]);
  return <Link href="/auth/otp">{t("continueWithMobile")}</Link>;
};

export default AuthRedirect;
